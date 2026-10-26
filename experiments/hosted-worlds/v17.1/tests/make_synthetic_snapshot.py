"""Create a synthetic Z2-shaped protocol test World. NO Zelda II ROM/game graphics are used."""
import zlib,struct,base64,json,hashlib
from pathlib import Path
here=Path(__file__).resolve().parent
T=16;W=64;H=75

def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
rows=[]
for y in range(T):
 line=bytearray([0])
 for x in range(T*T):
  tid=x//T;lum=(tid*13)%120
  r,g,b=(25+lum,52+tid*6,45+tid*4)
  if (x+y)%5==0:r,g,b=(min(255,r+40),min(255,g+40),min(255,b+40))
  line.extend(bytes([r%256,g%256,b%256,255]))
 rows.append(bytes(line))
raw=b''.join(rows)
png=(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',256,16,8,6,0,0,0))+
     chunk(b'IDAT',zlib.compress(raw)) + chunk(b'IEND',b''))
terrain=[]
for y in range(H):
 for x in range(W):
  tile=5
  if x<3 or x>60:tile=11
  if 14<x<24 and 18<y<34:tile=12
  if 40<x<55 and 4<y<10:tile=6
  if y==40 and 18<x<48:tile=9
  terrain.append(tile)
obj={'format':'nesforge.hosted-world','version':2,'sourceProfile':'zelda2-overworld-v1','sourceWorldId':'z2:1:0','sourceDigest':'0'*64,'name':'SYNTHETIC TEST WORLD — NO ROM CONTENT','width':W,'height':H,'terrain':terrain,'art':{'format':'png-atlas-16x16-v1','png':'data:image/png;base64,'+base64.b64encode(png).decode()}}
(here/'synthetic_snapshot.json').write_text(json.dumps(obj,separators=(',',':'))+'\n')
print('Synthetic test World written; contains no ROM content')
