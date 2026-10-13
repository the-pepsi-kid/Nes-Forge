#!/usr/bin/env python3
"""Build Courtyard with a small original two-pass 6502 subset assembler.
Python standard library only. The ROM is independent of Forge's code generator.
"""
from pathlib import Path
import hashlib, json, math, re
ROOT=Path(__file__).resolve().parent
OP={
 'SEI':{'imp':0x78},'CLD':{'imp':0xd8},'TXS':{'imp':0x9a},'INX':{'imp':0xe8},
 'INY':{'imp':0xc8},'DEX':{'imp':0xca},'TAX':{'imp':0xaa},'TXA':{'imp':0x8a},
 'TAY':{'imp':0xa8},'TYA':{'imp':0x98},'PHA':{'imp':0x48},'PLA':{'imp':0x68},
 'RTS':{'imp':0x60},'RTI':{'imp':0x40},'SEC':{'imp':0x38},'CLC':{'imp':0x18},
 'LDA':{'imm':0xa9,'zp':0xa5,'abs':0xad,'absx':0xbd,'indy':0xb1},
 'LDX':{'imm':0xa2},'LDY':{'imm':0xa0},
 'STA':{'zp':0x85,'abs':0x8d,'absx':0x9d},'STX':{'abs':0x8e},
 'BIT':{'abs':0x2c},'CPX':{'imm':0xe0},'CMP':{'imm':0xc9,'abs':0xcd},
 'ADC':{'abs':0x6d,'imm':0x69,'zp':0x65},'SBC':{'abs':0xed,'imm':0xe9,'zp':0xe5},
 'AND':{'imm':0x29},'ORA':{'imm':0x09},'INC':{'zp':0xe6},
 'ROL':{'zp':0x26},'LSR':{'acc':0x4a},'ASL':{'acc':0x0a},
 'JMP':{'abs':0x4c},'JSR':{'abs':0x20},
 'BNE':{'rel':0xd0},'BEQ':{'rel':0xf0},'BPL':{'rel':0x10},'BCC':{'rel':0x90},'BCS':{'rel':0xb0},
}
BRANCH={'BNE','BEQ','BPL','BCC','BCS'}
def number(s,symbols,unknown=False):
 s=s.strip()
 if s in symbols:return symbols[s]
 if s.startswith('$'):return int(s[1:],16)
 if s.isdigit():return int(s)
 if unknown:return 0x8000
 raise ValueError('Unknown symbol '+s)
def instruction(s,symbols):
 op,*rest=s.split(None,1);op=op.upper();arg=rest[0].strip() if rest else ''
 if op in BRANCH:return op,'rel',arg,2
 if not arg:return op,'imp','0',1
 if arg=='A':return op,'acc','0',1
 if arg.startswith('#'):return op,'imm',arg[1:],2
 if arg.startswith('(') and arg.endswith('),Y'):return op,'indy',arg[1:-3],2
 if arg.endswith(',X'):return op,'absx',arg[:-2],3
 if op not in {'JSR','JMP'} and (arg in symbols and symbols[arg]<256 or re.fullmatch(r'\$[0-9A-Fa-f]{1,2}',arg)):
  return op,'zp',arg,2
 return op,'abs',arg,3

def assemble(text):
 lines=[x.split(';')[0].strip() for x in text.splitlines()];symbols={};pc=0
 for line in lines:
  if not line:continue
  if '=' in line:
   k,v=line.split('=',1);symbols[k.strip()]=number(v,symbols);continue
  if line.endswith(':'):symbols[line[:-1]]=pc;continue
  if line.startswith('.org'):pc=number(line[4:],symbols);continue
  if line.startswith('.word'):pc+=2*len(line[5:].split(','));continue
  op,mode,arg,n=instruction(line,symbols);pc+=n
 writes={};pc=0
 for i,line in enumerate(lines):
  if not line or '=' in line or line.endswith(':'):continue
  if line.startswith('.org'):pc=number(line[4:],symbols);continue
  if line.startswith('.word'):
   data=[]
   for part in line[5:].split(','):
    val=number(part,symbols);data.extend([val&255,val>>8])
  else:
   op,mode,arg,n=instruction(line,symbols);val=number(arg,symbols)
   try:data=[OP[op][mode]]
   except KeyError:raise ValueError(f'Unsupported assembler instruction at line {i+1}: {line}')
   if mode=='rel':
    val-=pc+2
    if not -128<=val<=127:raise ValueError(f'Branch out of range at line {i+1}')
    data.append(val&255)
   elif n==2:
    if not 0<=val<=255:raise ValueError('Byte operand overflow')
    data.append(val)
   elif n==3:data.extend([val&255,val>>8])
  for byte in data:
   if pc in writes:raise ValueError('Overlapping code')
   writes[pc]=byte;pc+=1
 return writes,symbols

# Explicit original pixel grids; colors are NES palette indices 0..3.
ART=[
 ['00000000']*8,
 ['33333333','31333313','22222222','21222122','22222222','22212222','21222212','11111111'],
 ['11111111','12222122','12322122','12222122','11111111','22122221','22123221','22122221'],
 ['00000000','00022000','02222200','22222220','02222222','00000000','00000000','00000000'],
 ['00000000','00220000','02222200','22222222','22222220','00000000','00000000','00000000'],
]
PLAYER=['00111100','01222110','01212110','01222110','00133000','01333310','00100100','01100110']

def build():
 source=(ROOT/'main.asm').read_text();writes,symbols=assemble(source)
 prg=bytearray([0xea]*32768)
 for addr,byte in writes.items():
  if not 0x8000<=addr<=0xffff:raise ValueError('Code outside PRG')
  if 0x8800<=addr<0xfffa:raise ValueError('Code overlaps reserved data area')
  prg[addr-0x8000]=byte
 nt=bytearray(960);solid=bytearray(960);attr=bytearray(64)
 for y in range(30):
  for x in range(32):
   if y>=26:nt[y*32+x]=1;solid[y*32+x]=1
   elif 16<=y<26 and 24<=x<26:nt[y*32+x]=2;solid[y*32+x]=1
 for y,x in [(6,4),(4,13),(8,26)]:
  nt[y*32+x]=3;nt[y*32+x+1]=4
 # Palette assignment is explicit per 2x2 block (attribute quadrants).
 for ay in range(8):
  for ax in range(8):
   packed=0
   for qy in range(2):
    for qx in range(2):
     x=ax*4+qx*2;y=ay*4+qy*2
     pal=1 if 16<=y<26 and 24<=x<26 else 2 if y<16 else 0
     packed|=pal<<(qy*4+qx*2)
   attr[ay*8+ax]=packed
 palette=bytes([0x21,0x0f,0x27,0x29, 0x21,0x0f,0x16,0x27, 0x21,0x11,0x30,0x21, 0x21,0x0f,0x27,0x29,
                0x21,0x0f,0x28,0x16, 0x21,0x0f,0x30,0x12, 0x21,0x0f,0x30,0x12, 0x21,0x0f,0x30,0x12])
 player=bytes([40,208,8,8,2,8,1,6]);music=bytes([16,12,0xbc,8])
 midi=[60,64,67,72,71,67,64,62,60,64,67,69,67,64,62,60]
 periods=[int(math.floor(1789773/(16*(440*2**((note-69)/12)))-1+0.5)) for note in midi]
 timers=bytes(b for period in periods for b in [period&255,period>>8])
 for addr,data in [(0xb000,nt),(0xb3c0,attr),(0xc000,solid),(0xd000,palette),(0xd020,player),(0xd030,music),(0xd100,timers)]:
  prg[addr-0x8000:addr-0x8000+len(data)]=data
 chr=bytearray(8192)
 for i,rows in enumerate(ART):
  # Two-bit planar encoder; first plane holds bit 0, second plane bit 1.
  values=[[int(c) for c in row] for row in rows]
  chr[i*16:i*16+16]=bytes(sum(((values[y][x]>>bit)&1)<<(7-x) for x in range(8)) for bit in (0,1) for y in range(8))
 values=[[int(c) for c in row] for row in PLAYER]
 chr[4096:4112]=bytes(sum(((values[y][x]>>bit)&1)<<(7-x) for x in range(8)) for bit in (0,1) for y in range(8))
 rom=bytes([0x4e,0x45,0x53,0x1a,2,1,0,0]+[0]*8)+prg+chr
 out=ROOT/'Bridge_Room.nes';out.write_bytes(rom)
 sha=lambda data:hashlib.sha256(data).hexdigest()
 manifest={'format':'CourtyardNativeFixture','version':1,'romFile':out.name,'romSha256':sha(rom),'romBytes':len(rom),
  'codeFingerprint':{'cpuStart':0x8000,'fileOffset':16,'length':2048,'sha256':sha(prg[:2048])},
  'vectorsSha256':sha(prg[-6:]),'symbols':symbols,
  'ranges':{'nametable':{'cpuStart':0xb000,'length':960},'attributes':{'cpuStart':0xb3c0,'length':64},'collision':{'cpuStart':0xc000,'length':960},'palettes':{'cpuStart':0xd000,'length':32},'player':{'cpuStart':0xd020,'length':8},'musicConfig':{'cpuStart':0xd030,'length':4},'musicTimers':{'cpuStart':0xd100,'length':32},'chr':{'fileOffset':32784,'length':8192}},
  'originalSongMidi':midi,'originalSongTimers':periods,'sourceHashes':{'main.asm':sha(source.encode()),'build.py':sha(Path(__file__).read_bytes())}}
 (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'rom':out.name,'bytes':len(rom),'romSha256':sha(rom),'codeFingerprint':manifest['codeFingerprint'],'symbols':symbols,'periods':periods},indent=2))
if __name__=='__main__':build()
