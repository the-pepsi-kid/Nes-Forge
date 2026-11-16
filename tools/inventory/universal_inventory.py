"""Read-only, stdlib-only NES-family ROM inventory and CHR-ROM previews.

Supported: iNES 1.0, NES 2.0, UNIF (chunks), headered FDS; raw FDS only
with explicit --format fds. This is not a disassembler or game mechanics decoder.
No live-host or Forge editor imports this module.
"""
from __future__ import annotations

import hashlib
import json
import re
import struct
import zlib
from pathlib import Path

MAGIC_INES=b'NES\x1a'
MAGIC_FDS=b'FDS\x1a'
MAX_ROM_SIZE=256*1024*1024
FDS_SIDE_BYTES=65500


def sha256(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()


def record(label:str,offset:int,data:bytes,role:str,**extra)->dict:
    return {'label':label,'role':role,'offset':offset,'size':len(data),'sha256':sha256(data),**extra}


def declared_nes2_size(lsb:int,msb:int,unit:int)->int:
    if msb==15:
        exp=lsb>>2
        mult=(lsb&3)*2+1
        size=(1<<exp)*mult
    else:
        size=((msb<<8)|lsb)*unit
    if size>MAX_ROM_SIZE:
        raise ValueError('NES 2.0 declared section exceeds 256 MiB safety limit')
    return size


def parse_ines(data:bytes)->dict:
    if len(data)<16 or data[:4]!=MAGIC_INES:
        raise ValueError('Not an iNES/NES 2.0 file')
    h=data[:16]; nes2=(h[7]&0x0c)==0x08
    if nes2:
        prg_size=declared_nes2_size(h[4],h[9]&0xf,16384)
        chr_size=declared_nes2_size(h[5],h[9]>>4,8192)
        mapper=(h[6]>>4)|(h[7]&0xf0)|((h[8]&0x0f)<<8)
        submapper=h[8]>>4
        fmt='NES 2.0'
    else:
        prg_size=h[4]*16384
        chr_size=h[5]*8192
        dirty=any(h[12:16])
        # iNES 1.0 upper mapper nibble in byte 7 is unreliable in old dirty headers.
        mapper=(h[6]>>4) if dirty else ((h[6]>>4)|(h[7]&0xf0))
        submapper=None
        fmt='iNES 1.0'
    trainer=bool(h[6]&4)
    pos=16
    sections=[record('iNES header',0,h,'header')]
    if trainer:
        if len(data)<pos+512:raise ValueError('Truncated trainer')
        sections.append(record('Trainer',pos,data[pos:pos+512],'trainer'))
        pos+=512
    end_prg=pos+prg_size
    end_chr=end_prg+chr_size
    if end_chr>len(data):
        raise ValueError(f'Truncated ROM: header declares {end_chr} bytes but file has {len(data)}')
    for offset in range(pos,end_prg,16384):
        block=data[offset:min(end_prg,offset+16384)]
        sections.append(record(f'PRG bank {(offset-pos)//16384:03d}',offset,block,'prg'))
    for offset in range(end_prg,end_chr,8192):
        block=data[offset:min(end_chr,offset+8192)]
        sections.append(record(f'CHR bank {(offset-end_prg)//8192:03d}',offset,block,'chr'))
    warnings=[]
    if end_chr<len(data):
        sections.append(record('Trailing data',end_chr,data[end_chr:],'unclassified'))
        warnings.append('Unclassified trailing bytes; kept separate from declared PRG/CHR')
    if not nes2 and any(h[12:16]):
        warnings.append('Nonzero reserved iNES header bytes: upper mapper nibble may be unreliable')
    if not prg_size:warnings.append('No PRG-ROM declared')
    if not chr_size:warnings.append('CHR-ROM absent: graphics may be generated dynamically in CHR-RAM; no tiles invented')
    if nes2:
        ram={'prgRamShift':h[10]&15,'prgNvRamShift':h[10]>>4,
             'chrRamShift':h[11]&15,'chrNvRamShift':h[11]>>4}
    else:
        ram={'prgRam8kUnits':h[8] or None}
    metadata={'mapper':mapper,'submapper':submapper,
        'mirroring':'vertical' if h[6]&1 else 'horizontal',
        'fourScreen':bool(h[6]&8),'battery':bool(h[6]&2),'trainer':trainer,
        'prgBytes':prg_size,'chrBytes':chr_size,'chrStorage':'ROM' if chr_size else 'RAM or game-generated',
        'consoleType':h[7]&3,'ramHeader':ram}
    return {'container':fmt,'metadata':metadata,'sections':sections,'warnings':warnings,'previewSegments':[(s['offset'],s['size'],s['label']) for s in sections if s['role']=='chr']}


def parse_unif(data:bytes)->dict:
    if len(data)<32:raise ValueError('Truncated UNIF header')
    off=32;sections=[record('UNIF header',0,data[:32],'header')]
    prg=[];chr_=[];misc=[];board=[];warnings=[]
    while off<len(data):
        if off+8>len(data):raise ValueError('Truncated UNIF chunk header')
        cid=data[off:off+4].decode('ascii','replace')
        size=int.from_bytes(data[off+4:off+8],'little')
        start=off+8;end=start+size
        if end>len(data):raise ValueError('Truncated UNIF chunk '+cid)
        role='prg' if re.fullmatch(r'PRG[0-9A-F]',cid) else 'chr' if re.fullmatch(r'CHR[0-9A-F]',cid) else 'metadata'
        item=record(cid,start,data[start:end],role)
        sections.append(item)
        if role=='prg':prg.append(item)
        elif role=='chr':chr_.append(item)
        elif cid=='MAPR':board.append(data[start:end].rstrip(b'\0').decode('ascii','replace'))
        else:misc.append(cid)
        off=end
    if not chr_:warnings.append('No CHR-ROM chunks; graphics may be CHR-RAM/generated')
    warnings.append('UNIF board name does not guarantee a normalized numeric mapper ID')
    return {'container':'UNIF', 'metadata':{'boardNames':board,'mapper':None,'submapper':None,
        'prgBytes':sum(s['size'] for s in prg),'chrBytes':sum(s['size'] for s in chr_),
        'otherChunks':misc},'sections':sections,'warnings':warnings,
        'previewSegments':[(s['offset'],s['size'],s['label']) for s in chr_]}


def parse_fds(data:bytes,raw:bool=False)->dict:
    start=0 if raw else 16
    if not raw and (len(data)<16 or data[:4]!=MAGIC_FDS):raise ValueError('Not a headered FDS image')
    payload=len(data)-start
    if payload<=0 or payload%FDS_SIDE_BYTES:
        raise ValueError('FDS image does not contain complete 65,500-byte sides')
    sides=payload//FDS_SIDE_BYTES
    sections=[]
    if not raw:sections.append(record('FDS header',0,data[:16],'header'))
    for i in range(sides):
        off=start+i*FDS_SIDE_BYTES
        sections.append(record(f'FDS side {i+1}',off,data[off:off+FDS_SIDE_BYTES],'disk-side'))
    return {'container':'FDS raw sides' if raw else 'FDS',
        'metadata':{'diskSides':sides,'mapper':None,'prgBytes':None,'chrBytes':None},
        'sections':sections,'warnings':['Disk image inventory only; file blocks and graphics require an FDS adapter'],
        'previewSegments':[]}


def inventory_bytes(data:bytes,format_hint:str='auto')->dict:
    if len(data)>MAX_ROM_SIZE:raise ValueError('ROM exceeds 256 MiB safety limit')
    if format_hint=='fds':parsed=parse_fds(data,raw=data[:4]!=MAGIC_FDS)
    elif data.startswith(MAGIC_INES):parsed=parse_ines(data)
    elif data.startswith(b'UNIF'):parsed=parse_unif(data)
    elif data.startswith(MAGIC_FDS):parsed=parse_fds(data)
    else:raise ValueError('Unsupported container. Supported: iNES 1.0, NES 2.0, UNIF, headered FDS; use --format fds for raw FDS sides. Other 6502 formats require adapters.')
    seg=parsed.pop('previewSegments')
    inv={'format':'nesforge.rom-inventory','version':1,'authority':'research-only',
         'source':{'sha256':sha256(data),'bytes':len(data),'container':parsed['container']},
         'metadata':parsed['metadata'],'sections':parsed['sections'],
         'capabilities':{'bankInventory':'observed','chr2bppPreview':'observed' if seg else 'unavailable',
                         'namedSprites':'unknown','palettes':'unknown','roomLayouts':'unknown',
                         'collision':'unknown','animation':'unknown','actorBehavior':'unknown',
                         'multiplayerAuthority':'none'},
         'warnings':parsed['warnings'],'previews':[]}
    return inv,seg


def png_rgb(width:int,height:int,pixels:bytes)->bytes:
    if len(pixels)!=width*height*3:raise ValueError('Invalid image data length')
    signature=b'\x89PNG\r\n\x1a\n'
    def chunk(typ,payload):
        return struct.pack('>I',len(payload))+typ+payload+struct.pack('>I',zlib.crc32(typ+payload)&0xffffffff)
    lines=b''.join(b'\x00'+pixels[y*width*3:(y+1)*width*3] for y in range(height))
    return signature+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(lines,9))+chunk(b'IEND',b'')


def chr_sheet(chunk_bytes:bytes)->tuple[bytes,int]:
    # Format is NES 2bpp tile planes; palette is an artificial four-tone preview.
    tiles=len(chunk_bytes)//16
    if not tiles:return b'',0
    cols=16
    rows=(tiles+cols-1)//cols
    width=cols*8;height=rows*8
    pixels=bytearray([20]*(width*height*3))
    palette=((25,32,46),(78,110,142),(161,190,203),(235,241,237))
    for tile in range(tiles):
        b=chunk_bytes[tile*16:(tile+1)*16]
        tx=tile%cols*8;ty=tile//cols*8
        for y in range(8):
            a=b[y];c=b[y+8]
            for x in range(8):
                bit=7-x
                k=((a>>bit)&1)|(((c>>bit)&1)<<1)
                off=((ty+y)*width+tx+x)*3
                pixels[off:off+3]=bytes(palette[k])
    return png_rgb(width,height,bytes(pixels)),tiles


def write_inventory(rom_data:bytes,out_dir:Path,format_hint='auto',max_sheets:int=64)->dict:
    inv,segments=inventory_bytes(rom_data,format_hint)
    out_dir.mkdir(parents=True,exist_ok=True)
    total=0
    for offset,size,label in segments:
        # Do not decode huge banks without an explicit downstream adapter.
        for within in range(0,size,8192):
            block=rom_data[offset+within:offset+min(size,within+8192)]
            if total>=max_sheets:
                inv['warnings'].append('Preview limit reached; remaining CHR banks still inventoried')
                break
            if len(block)<16:continue
            png,n=chr_sheet(block)
            if not n:continue
            name=f'chr_{total:03d}.png'
            (out_dir/name).write_bytes(png)
            inv['previews'].append({'file':name,'sourceOffset':offset+within,
                                    'sourceLabel':label,'tiles':n,'palette':'artificial 4-color inspection palette; not the original NES palette',
                                    'sha256':sha256(png)})
            total+=1
        if total>=max_sheets:break
    inv['inventoryDigest']=sha256(json.dumps({k:v for k,v in inv.items() if k!='inventoryDigest'},sort_keys=True,separators=(',',':')).encode())
    (out_dir/'inventory.json').write_text(json.dumps(inv,indent=2,ensure_ascii=False,sort_keys=True)+'\n',encoding='utf-8')
    return inv


def validate_inventory(inv:dict,folder:Path|None=None,rom_data:bytes|None=None)->list[str]:
    errs=[]
    if not isinstance(inv,dict):return ['Not an object']
    required={'format','version','authority','source','metadata','sections','capabilities','warnings','previews','inventoryDigest'}
    if set(inv)!=required:errs.append('Unexpected or missing inventory fields')
    if inv.get('format')!='nesforge.rom-inventory' or inv.get('version')!=1 or inv.get('authority')!='research-only':errs.append('Invalid envelope or authority')
    caps=inv.get('capabilities')
    if not isinstance(caps,dict) or any(caps.get(k)!='unknown' for k in ('collision','animation','actorBehavior','roomLayouts','namedSprites')) or caps.get('multiplayerAuthority')!='none':errs.append('Attempted unsupported capability claim')
    sects=inv.get('sections');source=inv.get('source')
    if not isinstance(sects,list) or not isinstance(source,dict):return errs+['Missing source or sections']
    if set(source)!={'sha256','bytes','container'} or not isinstance(source.get('bytes'),int) or source['bytes']<16 or not re.fullmatch('[0-9a-f]{64}',str(source.get('sha256'))):errs.append('Invalid source identity')
    if rom_data is not None and (sha256(rom_data)!=source.get('sha256') or len(rom_data)!=source.get('bytes')):errs.append('Original ROM source identity mismatch')
    for s in sects:
        if not isinstance(s,dict) or set(s)!={'label','role','offset','size','sha256'}:errs.append('Invalid section record');continue
        if not isinstance(s['offset'],int) or not isinstance(s['size'],int) or s['offset']<0 or s['size']<0 or s['offset']+s['size']>source.get('bytes',-1):errs.append('Invalid section bounds')
        if not re.fullmatch('[0-9a-f]{64}',str(s['sha256'])):errs.append('Invalid section SHA256')
        if rom_data is not None and isinstance(s['offset'],int) and isinstance(s['size'],int) and s['offset']>=0 and s['size']>=0 and s['offset']+s['size']<=len(rom_data):
            if sha256(rom_data[s['offset']:s['offset']+s['size']])!=s['sha256']:errs.append('Original ROM section mismatch: '+s['label'])
    previews=inv.get('previews',[])
    for p in previews:
        if not isinstance(p,dict) or set(p)!={'file','sourceOffset','sourceLabel','tiles','palette','sha256'}:errs.append('Invalid preview');continue
        if not re.fullmatch(r'chr_[0-9]{3}\.png',p['file']):errs.append('Unsafe preview path');continue
        if folder is not None:
            fp=folder/p['file']
            if not fp.is_file() or sha256(fp.read_bytes())!=p['sha256']:errs.append('Missing/tampered preview '+p['file'])
    digest=inv.get('inventoryDigest')
    expected=sha256(json.dumps({k:v for k,v in inv.items() if k!='inventoryDigest'},sort_keys=True,separators=(',',':')).encode())
    if digest!=expected:errs.append('Inventory digest mismatch')
    return errs
