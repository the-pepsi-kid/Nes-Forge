from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import zipfile,tempfile,json,hashlib,subprocess
root=Path(__file__).resolve().parents[2];review=Path(__file__).parent
record=json.loads((review/'Review_Kit.json').read_text());archive=Path(record['file']);sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(archive.read_bytes())==record['sha256']
out=Path(tempfile.mkdtemp(prefix='nf-game-final-kit-'))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None;z.extractall(out)
subprocess.run(['python3',str(out/'verify_kit.py')],check=True)
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  if tag in ['a','img','script','link','iframe','video','source']:self.links.extend(v for k,v in attrs if k in ['href','src'] and v)
checked=0;missing=[]
for p in out.rglob('*.html'):
 if p.name=='NES_Forge.html' or any(x in p.relative_to(out).parts for x in ['RC3','RC4','RC5']):continue
 links=Links();links.feed(p.read_text())
 for link in links.links:
  u=urlsplit(link)
  if u.scheme or u.netloc or not u.path:continue
  checked+=1
  if not (p.parent/unquote(u.path)).exists():missing.append({'page':p.relative_to(out).as_posix(),'link':link})
assert not missing,missing
assert sha((out/'NES_Forge.html').read_bytes())==record['applicationSha256']
with zipfile.ZipFile(root/'tester-kit/spatial-re-1/NF_Spatial_RE.zip') as predecessor:
 old_count=0
 for name in predecessor.namelist():
  if name.endswith('/'):continue
  old=predecessor.read(name);assert (out/name).read_bytes()==old or (out/'RC5'/name).read_bytes()==old,name;old_count+=1
 original=[p for p in (root/'tester-kit/alpha11-review-1').rglob('*') if p.is_file()]
 assert len(original)==164 and all(p.read_bytes()==(out/'RC3'/p.relative_to(root/'tester-kit/alpha11-review-1')).read_bytes() for p in original)
result={'status':'passed','zipSha256':record['sha256'],'applicationSha256':record['applicationSha256'],'inventoriedPayloadsVerified':record['inventoriedPayloads'],'predecessorFilesPreserved':old_count,'originalRC3FilesByteIdentical':164,'resolvedDocumentationLinks':checked,'brokenDocumentationLinks':0,'freshExtraction':True,'nativeWindowsExtractionTested':False}
(review/'Package_Verification.json').write_text(json.dumps(result,indent=2)+'\n');Path('/tmp/nf-game-final-kit').write_text(str(out));print(json.dumps(result))
