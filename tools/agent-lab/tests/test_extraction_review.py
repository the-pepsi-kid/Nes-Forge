"""Synthetic Agent Lab intake and source-matched queue checks."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from forge_pipeline import load_review_tasks
from extraction_update_review import tasks

class Tests(unittest.TestCase):
    def test_workorders_only_for_matching_original_rom(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'tasks.json'
            path.write_text(json.dumps({'schema':'NESForgeAgentWorkorders/v1',
              'allow_modify_rom':False,'allow_modify_forge':False,
              'tasks':[{'id':'task1','rom_sha256':'a'*64,'state':'pending_review_not_executed',
                        'category':'placement','instruction':'Compare scenes','acceptance':'Exact parity'},
                       {'id':'other','rom_sha256':'b'*64,'state':'pending_review_not_executed',
                        'category':'audio','instruction':'Other ROM','acceptance':'No'},
                       {'id':'claimed','rom_sha256':'a'*64,'state':'complete',
                        'category':'code','instruction':'do not run','acceptance':'no'}]}))
            result=load_review_tasks(str(path),'a'*64)
            self.assertEqual(len(result),1)
            self.assertEqual(result[0]['instruction'],'Compare scenes')
            self.assertEqual(result[0]['status'],'owner_review_required')
    def test_reject_authorized_mutation(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'unsafe.json';path.write_text(json.dumps({
                'schema':'NESForgeAgentWorkorders/v1','allow_modify_rom':True,
                'allow_modify_forge':False,'tasks':[]}))
            with self.assertRaisesRegex(ValueError,'read-only'):
                load_review_tasks(str(path),'a'*64)
    def test_exporter_failure_still_waits_for_review(self):
        item={'rom_sha256':'a'*64,'archive':'test.zip','report_problems':['Unresolved sprite context'],
              'audits':{},'groups':{'audio_projects':1}}
        jobs=tasks(item,4)
        self.assertTrue(any(t['category']=='known_failures' for t in jobs))
        self.assertTrue(all(t['state']=='pending_review_not_executed' for t in jobs))
        self.assertTrue(all(t['rom_sha256']=='a'*64 for t in jobs))
if __name__=='__main__':unittest.main()
