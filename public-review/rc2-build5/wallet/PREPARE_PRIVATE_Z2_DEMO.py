#!/usr/bin/env python3
"""Publish a LOCAL original-ROM-derived West Hyrule World, Link poses and Rauru art.

Runs the EXISTING Forge recovery code inside the browser, never sends ROM bytes
or private keys to the localhost host. No ROM or exported media bundled with kit.
Initialize a fresh database. Repeats verify the saved world. Asset repair preserves existing terrain.
"""
import argparse,base64,hashlib,json,os,sys,urllib.error,urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
HTML=ROOT/'NES_Forge.html'

def original_assets(rom,chromium=None):
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path=chromium or os.getenv('CHROMIUM_PATH') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
        try:
            page=browser.new_page()
            page.set_content(HTML.read_text(encoding='utf-8'),wait_until='load',timeout=120000)
            return page.evaluate('''input=>{
              const rom=new Uint8Array(input);
              if(!window.ZeldaOverworld.recognizes(rom)||!window.NativeEngineFormat.recognizes(rom))throw Error('ROM not recognized by Forge Zelda II adapter');
              const map=window.ZeldaOverworld.decode(rom,'z2:1:0'),g=window.ZeldaOverworld.graphics(rom);
              const atlas=document.createElement('canvas');atlas.width=256;atlas.height=16;
              const cx=atlas.getContext('2d'),img=cx.createImageData(256,16);
              for(let id=0;id<16;id++){
                const meta=g.metatiles[id], pal=g.palettes[meta.pal&3];
                for(let dy=0;dy<16;dy++)for(let dx=0;dx<16;dx++){
                  const qi=(dy>=8?2:0)+(dx>=8?1:0), tile=meta.tiles[qi], c=g.chr[tile][dy&7][dx&7];
                  const rgb=NP[pal[c]&63];const off=(dy*256+id*16+dx)*4;
                  img.data.set([rgb[0],rgb[1],rgb[2],255],off);
                }
              }
              cx.putImageData(img,0,0);
              const catalog=window.ForgeZ2NativeRooms.catalog(rom,'z2:1:0',window.NativeEngineFormat.decode(rom),75);
              const found=catalog.stages.find(r=>r.location.x===2&&r.location.y===6&&r.source.bank===3&&r.source.kind==='town');
              if(!found)throw Error('Verified ROM Rauru room source was not recovered');
              const sceneId='z2-scene:towns-west:'+found.source.scene;
              const session=window.GameRENative.open(rom),rec=session.scene(sceneId),raster=session.raster(sceneId);
              if(rec.evidence!=='executed-original-construction'||rec.scene.slot!==found.source.scene||rec.scene.bank!==found.source.bank||raster.width<256||raster.width>2048||raster.height!==208)throw Error('Unverified native scene raster');
              const c=document.createElement('canvas');c.width=raster.width;c.height=240;
              const cc=c.getContext('2d'),pixels=cc.createImageData(c.width,c.height);
              for(let y=0;y<240;y++)for(let x=0;x<c.width;x++){
                const idx=y<32?15:raster.colors[(y-32)*c.width+x];const rgb=NP[idx&63];
                pixels.data.set([rgb[0],rgb[1],rgb[2],255],(y*c.width+x)*4);
              }
              cc.putImageData(pixels,0,0);
              const poses=window.Forge.services.HostedPlayerPoses.build(rom);
              return {terrain:Array.from(map.cells),atlas:atlas.toDataURL('image/png'),
                catalog, poses,stage:{png:c.toDataURL('image/png'),width:raster.width,
                x:found.location.x,y:found.location.y,bank:found.source.bank,scene:found.source.scene,kind:found.source.kind}};
            }''',list(rom))
        finally:browser.close()

def admin_state(token, base):
    request = urllib.request.Request(base+'/api/admin/state',headers={'X-Forge-Admin':token})
    with urllib.request.urlopen(request,timeout=15) as response:
        state = json.load(response)
    if state.get('demoCreateOnlyVersion') != 1:
        raise RuntimeError('Start the RC2 host before using its private-ROM setup.')
    return state


def create_missing(path, body, token, base):
    headers={'Content-Type':'application/json','X-Forge-Admin':token,'If-None-Match':'*'}
    req=urllib.request.Request(base+path,json.dumps(body).encode(),headers=headers,method='POST')
    try:
        with urllib.request.urlopen(req,timeout=50) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        if exc.code==412:
            return None  # The caller verifies what won a concurrent creation.
        raise RuntimeError(f'{path} refused ({exc.code}): {exc.read().decode()}') from exc


def canonical_digest(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def png_digest(url):
    return hashlib.sha256(base64.b64decode(url.split(',',1)[1],validate=True)).hexdigest()


def prepare(rom,token,base='http://127.0.0.1:8765',chromium=None,*,repair_assets=False):
    if len(rom)!=262160 or rom[:4]!=b'NES\x1a':
        raise ValueError('Unsupported Zelda II source ROM')
    digest=hashlib.sha256(rom).hexdigest()
    state=admin_state(token,base)
    world_id='z2:1:0'
    if repair_assets and not state['world']:
        raise RuntimeError('Asset repair requires an existing world. Run setup on a fresh database.')
    if state['world'] and (state['world']['sourceWorldId']!=world_id or state['world']['sourceDigest']!=digest):
        raise RuntimeError('This database belongs to a different ROM or world.')
    src=original_assets(rom,chromium)
    world={'format':'nesforge.hosted-world','version':2,'sourceProfile':'zelda2-overworld-v1',
           'sourceWorldId':world_id,'sourceDigest':digest,'name':'West Hyrule · original Zelda II source',
           'width':64,'height':75,'terrain':src['terrain'],'art':{'format':'png-atlas-16x16-v1','png':src['atlas']}}
    if not state['world']:
        create_missing('/api/admin/world',world,token,base)
        state=admin_state(token,base)
    if not state['world'] or state['world']['sourceDigest']!=digest or state['world']['sourceWorldId']!=world_id:
        raise RuntimeError('Concurrent setup or existing saved data prevented initialization.')
    revision=state['revision']
    if not repair_assets and revision!=canonical_digest(world):
        raise RuntimeError('Saved world differs from the original. Resume it, or use --repair-assets to fill missing art.')
    binding={'expectedRevision':revision,'sourceWorldId':world_id,'sourceDigest':digest}
    catalog={k:v for k,v in src['catalog'].items() if k!='scope'}
    expected_rooms={room['location']['index']:canonical_digest(room) for room in catalog['stages']}
    pose_hash=png_digest(src['poses']['png'])
    room=src['stage']
    art_hash=png_digest(room['png'])

    def present(snapshot):
        if snapshot['revision']!=revision:
            raise RuntimeError('World revision changed during setup. Reopen the saved world and retry.')
        stored={x['locationIndex']:x['digest'] for x in snapshot['nativeRooms']}
        poses=snapshot['playerPoses']
        art=next((x for x in snapshot['stageFrames'] if (x['x'],x['y'])==(room['x'],room['y'])),None)
        if stored and stored!=expected_rooms:
            raise RuntimeError('Saved native room catalog differs. Existing records were preserved.')
        if poses and poses['sha256']!=pose_hash:
            raise RuntimeError('Saved player poses differ. Existing art was preserved.')
        if art and (art['revision']!=art_hash or art['captureMethod']!='executed-original-construction:first-screen'):
            raise RuntimeError('Saved Rauru art differs. Existing art was preserved.')
        return bool(stored),bool(poses),bool(art)

    rooms,poses,art=present(state)
    if not rooms:
        create_missing('/api/admin/native-rooms',{**catalog,**binding},token,base)
    if not poses:
        create_missing('/api/admin/player-poses',{**src['poses'],**binding},token,base)
    if not art:
        create_missing('/api/admin/native-scene-art',
                       {'format':'nesforge.hosted-native-scene-art','version':2,**binding,
                        'x':room['x'],'y':room['y'],'sourceBank':room['bank'],'sourceScene':room['scene'],
                        'sourceKind':room['kind'],'evidence':'executed-original-construction:first-screen',
                        'sourceWidth':room['width'],'png':room['png']},token,base)
    if not all(present(admin_state(token,base))):
        raise RuntimeError('Setup is incomplete. Retry to fill the missing assets.')
    return {'protocol':13,'world':world_id,'sourceDigest':digest,'locationRecords':len(expected_rooms),
            'nativeLinkPoseAtlas':pose_hash,'originalRauruRoom':{'x':room['x'],'y':room['y'],'scene':room['scene'],
            'bank':room['bank'],'width':room['width']},'revision':revision,
            'originalEnginePlayable':False,'multiplayerCombat':'experimental pilot'}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--rom',required=True,type=Path)
    parser.add_argument('--admin-token',required=True,help='Printed by your local Forge host')
    parser.add_argument('--chromium',help='Optional local Chromium executable path')
    parser.add_argument('--repair-assets',action='store_true',help='Fill missing assets on the current saved revision.')
    args=parser.parse_args()
    try: result=prepare(args.rom.read_bytes(),args.admin_token,chromium=args.chromium,repair_assets=args.repair_assets)
    except Exception as error:print('Preparation refused:',error,file=sys.stderr);return 1
    print(json.dumps(result,indent=2));print('Now open TWO distinct wallet-enabled browsers at http://127.0.0.1:8765/');return 0
if __name__=='__main__':sys.exit(main())
