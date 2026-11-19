"""Source-checked investigated scene placement evidence. Private and read-only."""
from __future__ import annotations
import re

SHA256 = re.compile(r"^[0-9a-f]{64}$")

def integer(x, lo=0, hi=1<<30):
    return type(x) is int and lo <= x <= hi

def attach_investigated_catalog(ledger, catalog):
    """Attach only ROM-bound catalog references, never inferred runtime placement."""
    if ledger.get('schema') != 'NESForgeSourcePlacementLedger/v1':
        raise ValueError('Unknown placement ledger schema')
    source_hash = ledger.get('source_sha256')
    if not isinstance(source_hash, str) or not SHA256.fullmatch(source_hash):
        raise ValueError('Invalid original ROM identity')
    if not isinstance(catalog, dict) or catalog.get('status') != 'supported' or catalog.get('source', {}).get('sha256') != source_hash:
        raise ValueError('Unsupported or wrong-source investigated catalog')
    profile = catalog.get('profile', {})
    profile_id = profile.get('id') if isinstance(profile, dict) else None
    if not isinstance(profile_id, str) or not 0 < len(profile_id) <= 160:
        raise ValueError('Missing verified source profile')
    banks = {}
    for record in ledger.get('records', []):
        src = record.get('source', {})
        if record.get('kind') == 'physical_bank' and src.get('region') == 'PRG_ROM':
            bank = src.get('bank')
            if not integer(bank, 0, 255) or bank in banks:
                raise ValueError('Invalid or duplicate verified PRG bank')
            banks[bank] = src
    if not banks:
        raise ValueError('No independently verified PRG banks')
    raw_scenes = catalog.get('scenes')
    if not isinstance(raw_scenes, list) or len(raw_scenes) > 2048:
        raise ValueError('Scene catalog size invalid')
    actors = {a['id'] for a in catalog.get('actors', []) if isinstance(a, dict) and isinstance(a.get('id'), str)}
    def span(raw):
        if raw is None:
            return {'status':'unverified','reason':'source span not identified'}
        if not isinstance(raw, dict):
            raise ValueError('Invalid ROM source')
        bank, offset, length, cpu = (raw.get(k) for k in ('bank16KiB','fileOffset','length','cpu'))
        if not all(integer(k) for k in (bank,offset,length)) or length < 1 or bank not in banks:
            raise ValueError('ROM span not supported by a verified bank')
        r = banks[bank]
        start,end = r['file_offset'],r['file_offset']+r['byte_length']
        base = 0xc000 if bank == 7 else 0x8000
        if not start <= offset < end or offset+length > end or not integer(cpu,base,base+16383) or offset != start+cpu-base:
            raise ValueError('ROM span differs from independently verified physical placement')
        return {'status':'verified_physical_span','bank16KiB':bank,'file_offset':offset,'byte_length':length,
                'cpu_label':cpu,'runtime_cpu_mapping':'unverified'}
    def objects(items, kind):
        if not isinstance(items, list) or len(items) > 8192:
            raise ValueError('Invalid source object list')
        result = []
        for obj in items:
            if not isinstance(obj, dict) or not integer(obj.get('id'),0,8192):
                raise ValueError('Invalid source object')
            actor = obj.get('actor')
            if actor is not None and actor not in actors:
                raise ValueError('Unresolved source actor reference')
            positions = {k:obj[k] for k in ('x','y','spawnColumn','spawnScreenX','entryXNibble','page','selector','type')
                         if integer(obj.get(k),0,65535)}
            refs = obj.get('sources',[obj.get('source')])
            if not isinstance(refs,list) or len(refs) > 16:
                raise ValueError('Invalid object source list')
            result.append({'id':obj['id'],'kind':kind,'actor_catalog_id':actor,'decoded_fields':positions,
                           'source_spans':[span(x) for x in refs],
                           'placement':'source_trigger_not_runtime_verified',
                           'fixed_world_coordinates':False if kind == 'ninja_enemy' else None})
        return result
    result,seen = [],set()
    for scene in raw_scenes:
        if not isinstance(scene,dict) or not isinstance(scene.get('id'),str) or not 0 < len(scene['id']) <= 160:
            raise ValueError('Invalid source scene ID')
        if scene['id'] in seen:
            raise ValueError('Duplicate source scene')
        seen.add(scene['id'])
        entity_kind = 'ninja_enemy' if profile_id == 'ninja-gaiden-us' else 'native_enemy'
        spawns = objects(scene.get('enemies',[]),entity_kind)+objects(scene.get('lanterns',[]),'lantern')
        links = []
        for link in scene.get('connections',[]):
            if not isinstance(link,dict) or not integer(link.get('page'),0,255):
                raise ValueError('Invalid source room connection')
            links.append({'page_context':link['page'],'target_catalog_id':link.get('target'),
                          'source_span':span(link.get('source')),'direction':'unverified'})
        audio = scene.get('audioEvent')
        if audio is not None and not isinstance(audio,dict):
            raise ValueError('Invalid source audio event')
        audio_ref = ({'cue_id':str(audio.get('cueId',''))[:24],'source_span':span(audio.get('source')),
                      'timing':'unverified','native_audio_writer':'unverified'} if audio else None)
        result.append({'id':scene['id'],'label':scene.get('label'),
                       'source_span':span(scene.get('source')),'pointer_span':span(scene.get('pointerSource')),
                       'geometry':{k:scene[k] for k in ('width','height','cellPixels','originY')
                                   if integer(scene.get(k),0,65535)},
                       'background_chr_bank_4k':scene.get('backgroundChrBank4KiB'),
                       'sprite_chr_bank_4k':scene.get('spriteChrBank4KiB'),
                       'spawn_records':spawns,'connections':links,'audio_event':audio_ref,
                       'source_catalogue_state':'catalogued_no_pixel_parity',
                       'editor_resource_id':None,'runtime_placement':'unverified','native_writeback':'unverified'})
    out = dict(ledger)
    out['investigated_catalog'] = {'schema':'NESForgeCatalogPlacementIndex/v1','profile_id':profile_id,
                                  'scene_count':len(result),'spawn_record_count':sum(len(s['spawn_records']) for s in result),
                                  'scene_records':result,
                                  'limitations':['Source coordinates are not independent runtime positions',
                                                 'Scene, audio, behavior and writeback parity are not proven']}
    return out
