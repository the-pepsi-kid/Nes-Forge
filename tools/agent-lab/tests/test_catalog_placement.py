"""Synthetic source-placement tests; do not contain commercial ROM data."""
import importlib.util
from pathlib import Path
import unittest

p=Path(__file__).parents[1]/'catalog_placement.py'
spec=importlib.util.spec_from_file_location('catalog_placement',p)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
ROM='a'*64

def ledger():
    return {'schema':'NESForgeSourcePlacementLedger/v1','source_sha256':ROM,'records':[
      {'kind':'physical_bank','source':{'region':'PRG_ROM','bank':0,'file_offset':16,'byte_length':16384}},
      {'kind':'physical_bank','source':{'region':'PRG_ROM','bank':2,'file_offset':32784,'byte_length':16384}}]}

def loc(bank,cpu,n=1):
    return {'bank16KiB':bank,'cpu':cpu,'fileOffset':16+bank*16384+cpu-0x8000,'length':n}

def catalog():
    return {'status':'supported','source':{'sha256':ROM},'profile':{'id':'ninja-gaiden-us'},
     'actors':[{'id':'ng-actor:3'}],'scenes':[{'id':'room-1','label':'Room 1','source':loc(0,0x8000,6),
       'width':16,'height':12,'enemies':[{'id':0,'actor':'ng-actor:3','x':80,'spawnColumn':5,
                       'sources':[loc(2,0x8200),loc(2,0x8210)]}],
       'audioEvent':{'cueId':'7','source':loc(0,0x8800)},'connections':[]}]}

class CatalogPlacementTests(unittest.TestCase):
    def test_source_linked_triggers_and_unverified_parity(self):
        original=ledger()
        x=mod.attach_investigated_catalog(original,catalog())['investigated_catalog']
        self.assertNotIn('investigated_catalog',original)
        self.assertEqual((x['scene_count'],x['spawn_record_count']),(1,1))
        s=x['scene_records'][0]
        self.assertEqual(s['spawn_records'][0]['source_spans'][0]['status'],'verified_physical_span')
        self.assertEqual(s['spawn_records'][0]['decoded_fields']['spawnColumn'],5)
        self.assertIs(s['spawn_records'][0]['fixed_world_coordinates'],False)
        self.assertEqual(s['runtime_placement'],'unverified')
        self.assertEqual(s['audio_event']['native_audio_writer'],'unverified')

    def test_reject_wrong_source(self):
        c=catalog();c['source']['sha256']='b'*64
        with self.assertRaises(ValueError):mod.attach_investigated_catalog(ledger(),c)

    def test_reject_missing_independent_banks(self):
        x=ledger();x['records']=[]
        with self.assertRaises(ValueError):mod.attach_investigated_catalog(x,catalog())

    def test_reject_wrong_span(self):
        for key,value in [('fileOffset',18000),('cpu',0x8010),('bank16KiB',3)]:
            c=catalog();c['scenes'][0]['source'][key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):mod.attach_investigated_catalog(ledger(),c)

    def test_reject_unresolved_actor(self):
        c=catalog();c['scenes'][0]['enemies'][0]['actor']='not-in-catalog'
        with self.assertRaises(ValueError):mod.attach_investigated_catalog(ledger(),c)

    def test_reject_duplicate_scene(self):
        c=catalog();c['scenes'].append(c['scenes'][0])
        with self.assertRaises(ValueError):mod.attach_investigated_catalog(ledger(),c)

    def test_room_link_has_unknown_direction(self):
        c=catalog();c['profile']['id']='zelda2-us';c['scenes'][0]['connections']=[
            {'page':2,'target':'z2-scene:0:6','source':loc(2,0x8300)}]
        x=mod.attach_investigated_catalog(ledger(),c)['investigated_catalog']['scene_records'][0]
        self.assertEqual(x['connections'][0]['direction'],'unverified')
        self.assertEqual(x['connections'][0]['source_span']['file_offset'],32784+0x300)

    def test_missing_source_does_not_become_verified(self):
        c=catalog();c['scenes'][0].pop('source')
        s=mod.attach_investigated_catalog(ledger(),c)['investigated_catalog']['scene_records'][0]
        self.assertEqual(s['source_span']['status'],'unverified')

if __name__=='__main__':unittest.main()
