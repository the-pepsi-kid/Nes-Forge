"""Build address/label metadata only; never embed game code, art or level bytes.

Arguments: pinned Ninja source, its byte-exact ld65 debug file, pinned Zelda
source, and private ROM directory. The generated labels are research leads,
not a claim that all corresponding gameplay behavior has been reconstructed.
"""
from pathlib import Path
import sys,re,json,hashlib

ng,debug,z2,private=map(Path,sys.argv[1:5])
root=Path(__file__).resolve().parents[2]
dig=lambda b:hashlib.sha256(b).hexdigest()
hashes={'ninja-gaiden-us':'07d9e57e35184667c7b89e30857a44c5c404b48332ad12e66be91100eccd4f5e','zelda2-us':'ad8c0fbcf092bf84b48e69fd3964eea4ed91bfe62abc352943d537979782680c'}
roms={}
for p in private.glob('*.nes'):
 b=p.read_bytes()
 for name,h in hashes.items():
  if dig(b)==h:roms[name]=b
assert len(roms)==2
assert dig((ng/'NinjaGaiden.nes').read_bytes())==hashes['ninja-gaiden-us']

def record(line):
 return {k:(v[1:-1] if v.startswith('"') else v) for k,v in re.findall(r'(\w+)=("[^"]*"|[^,]+)',line)}
def offset(bank,cpu):return 16+bank*16384+cpu-(0xc000 if bank==7 else 0x8000)
def kind(text):return 'data' if text.lstrip().startswith('.') else 'code'

lines={};symbols=[];sources={}
for l in debug.read_text().splitlines():
 if l.startswith('file\t'):
  r=record(l);sources[int(r['id'])]=r['name']
 if l.startswith('line\t'):
  r=record(l);lines[int(r['id'])]=r
 if l.startswith('sym\t'):symbols.append(record(l))
ngrows=[]
for s in symbols:
 if s.get('type')!='lab' or 'seg' not in s or not 7<=int(s['seg'])<=14:continue
 name=s['name']
 if re.fullmatch(r'l[0-9A-F]{4}',name) or name.startswith('@'):continue
 bank=int(s['seg'])-7;cpu=int(s['val'],16);definition=lines[int(s['def'].split('+')[0])];file=sources[int(definition['file'])]
 content=(ng/file).read_text().splitlines();i=int(definition['line'])
 while i<len(content) and (not content[i].split(';')[0].strip() or content[i].split(';')[0].strip().endswith(':')):i+=1
 if i>=len(content):continue
 ngrows.append([bank,cpu,name,kind(content[i]),file,int(definition['line'])])
ngrows.sort(key=lambda r:(r[0],r[1],r[2]))

zrows=[];mismatches=[];verified=0
for bank in range(8):
 file=f'src/prg{bank}.asm';pending=[]
 for i,l in enumerate((z2/file).read_text().splitlines()):
  label=re.match(r'^([A-Za-z_][\w]*):',l)
  if label:pending.append((label[1],i+1))
  if l.lstrip().startswith(';'):continue
  m=re.search(r'; 0x([0-9a-f]+) \$([0-9A-F]{4}) ((?:[0-9A-F]{2} ?)+)',l)
  if not m:continue
  cpu=int(m[2],16);pos=offset(bank,cpu);raw=bytes.fromhex(m[3].strip())
  if roms['zelda2-us'][pos:pos+len(raw)]!=raw:
   mismatches.append({'bank':bank,'cpu':cpu,'file':file,'line':i+1});pending=[];continue
  verified+=len(raw)
  for name,line in pending:
   if not re.fullmatch(r'L[0-9A-F]{4}',name):zrows.append([bank,cpu,name,kind(l),file,line])
  pending=[]
zrows.sort(key=lambda r:(r[0],r[1],r[2]))

# RAM labels are contextual annotations, intentionally separate from decoded
# layouts or executed native evidence. No descriptions are copied wholesale.
ram=[]
for l in (ng/'prg/bank07.asm').read_text().splitlines():
 m=re.match(r'([A-Za-z_]\w*)\s*=\s*\$([0-9A-Fa-f]+)',l)
 if m and int(m[2],16)<0x8000:ram.append([int(m[2],16),m[1]])
zram=[[0x29,'Link side-view Y'],[0x4d,'Link X low'],[0x3b,'Link X page'],[0x70,'Link horizontal velocity'],[0x57d,'Link vertical velocity'],[0x479,'Link jump state'],[0x80,'Link animation frame'],[0x400,'Sword slash frame'],[0xa7,'Link directional contact bits'],[0x561,'Scene selector'],[0x706,'Region'],[0x707,'World context'],[0x748,'Overworld location selector'],[0x769,'Saved PRG bank'],[0xd4,'Scene pointer low'],[0xd6,'Enemy pointer low'],[0x72f,'Object command offset'],[0x717,'Object page'],[0x6000,'Constructed room tile codes'],[0x7000,'Copied enemy data']]
result={'ninja-gaiden-us':{'symbols':ngrows,'ram':ram,'reference':'https://github.com/0xe1f/NinjaGaidenNES/tree/32459fdf903679ce07bb372762291be3cf0d91b3'},'zelda2-us':{'symbols':zrows,'ram':zram,'reference':'https://github.com/FiendsOfTheElements/z2disassembly/tree/c4c3a4c7d4156b41f54f726dc40644d45812ad29'}}
target=root/'app/src/re/game-re-index.js'
target.write_text('/* Source labels/addresses only. Research annotations; no commercial payload.\n * NinjaGaidenNES annotations: Akop Karapetyan, Apache-2.0; see research notice.\n * Zelda II disassembly annotations: Trax / FiendsOfTheElements, CC0. */\n(function(r){const data='+json.dumps(result,separators=(',',':'))+';if(typeof module!=="undefined"&&module.exports)module.exports=data;else r.GameREIndex=data;})(typeof globalThis!=="undefined"?globalThis:this);\n')
report={'format':'NESForgeSourceIndexVerification','version':1,'sourceHashes':hashes,'ninjaWholeReassemblyByteIdentical':True,'zeldaAnnotationBytesVerified':verified,'zeldaMismatchedAnnotationLines':mismatches,'symbols':{k:len(v['symbols']) for k,v in result.items()},'outputSha256':dig(target.read_bytes()),'limits':['Labels describe the pinned research source. Byte-exact address validation is not full semantic validation of their names.','No game code, maps, sprite or audio payload is embedded in this index.']}
(root/'reviews/ninja-zelda-re-1/Source_Index_Verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='zeldaMismatchedAnnotationLines'}));print('mismatch lines',len(mismatches))
