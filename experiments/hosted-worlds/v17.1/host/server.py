#!/usr/bin/env python3
"""NES Forge 3.x localhost *prototype*, not a production multiplayer service.
A Z2 map snapshot must be explicitly uploaded from NES Forge. No ROMs hosted.
Dependencies: Python 3.11+, aiohttp, OpenSSL KECCAK-256 (for EOA wallet verification).
"""
import argparse, asyncio, base64, binascii, hashlib, hmac, json, os, re, secrets, sqlite3, struct, time, uuid, zlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
from aiohttp import web, WSMsgType
from eth_verify import recover_address, keccak256, checksum_address

ROOT=Path(__file__).resolve().parent
DOMAIN='127.0.0.1:8765'
CHAIN_ID=1 # identity domain only; no calls, funds, contracts or chain writes
MAX_PLAYERS=32 # experimental localhost ceiling; load test 20 concurrent clients
COSTS={'camp':20,'defense':15,'boss':30,'boss_hp':10}
# Western Zelda II stat level thresholds; pilot profile, not a decoded ROM state machine.
LEVEL_COSTS={
 'attack':[0,0,200,500,1000,2000,3000,5000,8000],
 'magic':[0,0,100,300,700,1200,2200,3500,6000],
 'life':[0,0,50,150,400,800,1500,2500,4000]
}
# Step-based encounters in the original use a 16-step rollover, with region exceptions;
# a separate timer system exists. Our host ONLY has a bounded 16-step approximation:
# NO timer/encounter icons, quadrant-specific enemy tables, exact battle spawns, native AI.
# Hosted vertical combat adapter: Link art selectors 8/9 are original ROM
# display selectors; server jump arc, hit windows and damage are TEST rules,
# not purported Zelda II physics/geometry/damage parity.
SIDE_JUMP_SECONDS=0.64
SIDE_ATTACK_SECONDS=0.25
SIDE_JUMP_HEIGHT_PX=49
SIDE_ATTACK_COOLDOWN=0.34
ENCOUNTER_STEPS=16
ENCOUNTER_TERRAIN={4:'desert',5:'grass',6:'forest',7:'swamp',8:'graveyard'}
# Real, original Zelda II enemy names and documented NES XP rewards; encounter
# LOCATION assignment and simplified pilot HP are NOT validated native tables.
# Each candidate must later be selected by original region + terrain + strong/weak encounter.
ENCOUNTER_PROFILE={
 'desert':('Leever',6,10), 'grass':('Bot',3,2),
 'forest':('Red Deeler',5,2), 'swamp':('Blue Octorok',8,20),
 'graveyard':('Blue Moa',10,50)
}

TERRAIN=['Town','Cave','Palace','Bridge','Desert','Grass','Forest','Swamp','Graveyard','Road','Lava','Mountain','Water','Walkable water','Rock','Spider']

def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'))
def now():return time.time()
def utc(dt):return datetime.fromtimestamp(dt,timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')

def require_local_origin(req,allow_null=False):
    orig=req.headers.get('Origin','')
    allowed={f'http://{DOMAIN}',f'http://localhost:8765'}
    if orig and orig not in allowed and not (allow_null and orig=='null'):
        raise web.HTTPForbidden(text='Origin rejected')
    return orig

@web.middleware
async def cors(req,handler):
    if req.method=='OPTIONS':
        resp=web.Response()
    else:
        try:resp=await handler(req)
        except web.HTTPException as exc:resp=exc
    orig=req.headers.get('Origin','')
    if orig in (f'http://{DOMAIN}',f'http://localhost:8765','null'):
        resp.headers['Access-Control-Allow-Origin']=orig
        resp.headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers']='Content-Type, X-Forge-Admin, Authorization'
        resp.headers['Vary']='Origin'
    resp.headers['Cache-Control']='no-store'
    resp.headers['X-Content-Type-Options']='nosniff'
    resp.headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:8765; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'"
    return resp

class Host:
    def __init__(self, dbpath, admin_token, experimental_encounters=False):
        self.db=sqlite3.connect(dbpath, isolation_level=None, check_same_thread=False)
        self.db.row_factory=sqlite3.Row
        self.db.executescript('''PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS worlds(id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, address TEXT NOT NULL UNIQUE, x INTEGER NOT NULL, y INTEGER NOT NULL, xp INTEGER NOT NULL, level INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS structures(id TEXT PRIMARY KEY, player_id TEXT NOT NULL, kind TEXT NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL, parent_id TEXT, hp INTEGER NOT NULL DEFAULT 0);
          CREATE TABLE IF NOT EXISTS journal(seq INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, action TEXT NOT NULL, subject TEXT NOT NULL, detail TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS stage_frames(world_id TEXT NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL, image TEXT NOT NULL, content_sha TEXT NOT NULL, capture_method TEXT NOT NULL, PRIMARY KEY(world_id,x,y));
          CREATE TABLE IF NOT EXISTS native_room_records(world_id TEXT NOT NULL, location_index INTEGER NOT NULL, x INTEGER NOT NULL, y INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(world_id,location_index));
          CREATE TABLE IF NOT EXISTS player_pose_assets(world_id TEXT PRIMARY KEY, source_digest TEXT NOT NULL, image TEXT NOT NULL, sha256 TEXT NOT NULL, evidence TEXT NOT NULL);
        ''')
        # Forward-only additive migration; preserve existing wallet player IDs, unspent XP and camps.
        existing={row['name'] for row in self.db.execute('PRAGMA table_info(players)')}
        upgrading='earned_xp' not in existing
        for name,definition in {
            'earned_xp':'INTEGER NOT NULL DEFAULT 0',
            'attack_level':'INTEGER NOT NULL DEFAULT 1',
            'magic_level':'INTEGER NOT NULL DEFAULT 1',
            'life_level':'INTEGER NOT NULL DEFAULT 1',
            'hp':'INTEGER NOT NULL DEFAULT 64',
            'mp':'INTEGER NOT NULL DEFAULT 64',
            'steps':'INTEGER NOT NULL DEFAULT 0',
            'mode':"TEXT NOT NULL DEFAULT 'overworld'",
            'encounter':"TEXT NOT NULL DEFAULT ''",
            'enemy_hp':'INTEGER NOT NULL DEFAULT 0',
            'guard':'INTEGER NOT NULL DEFAULT 0',
            'encounter_origin':"TEXT NOT NULL DEFAULT ''",
            'area_id':"TEXT NOT NULL DEFAULT ''",
            'side_x':'INTEGER NOT NULL DEFAULT 8',
            'respawn_camp_id':"TEXT NOT NULL DEFAULT ''",
            'side_facing':'INTEGER NOT NULL DEFAULT 1'
        }.items():
            if name not in existing:self.db.execute(f'ALTER TABLE players ADD COLUMN {name} {definition}')
        if upgrading:self.db.execute('UPDATE players SET earned_xp=xp')
        # Existing v0.11 databases migrate without altering player/wallet/XP records.
        stage_columns={row['name'] for row in self.db.execute('PRAGMA table_info(stage_frames)')}
        if 'width_px' not in stage_columns:
            self.db.execute('ALTER TABLE stage_frames ADD COLUMN width_px INTEGER NOT NULL DEFAULT 256')
        self.experimental_encounters=bool(experimental_encounters)
        self.admin_token=admin_token
        self.world=None;self.revision=None;self.sessions={};self.challenges={};self.clients={};self.lock=asyncio.Lock();self.seq=0;self.cooldowns={};self.combat_cooldowns={};self.side_actions={};self.side_jumps={}
        saved=self.db.execute('SELECT payload,revision FROM worlds WHERE id=?',('active',)).fetchone()
        if saved:self.world=json.loads(saved['payload']);self.revision=saved['revision']
    def event(self,action,subject,detail):
        self.db.execute('INSERT INTO journal(at,action,subject,detail) VALUES(?,?,?,?)',(utc(now()),action,subject,canonical(detail)))
    def admin(self,req):
        require_local_origin(req,True)
        if not hmac.compare_digest(req.headers.get('X-Forge-Admin',''),self.admin_token):raise web.HTTPUnauthorized(text='Invalid administrator token')
    async def read(self,req,limit=160000):
        if req.content_length is not None and req.content_length>limit:raise web.HTTPRequestEntityTooLarge(max_size=limit,actual_size=req.content_length)
        data=await req.read()
        if len(data)>limit:raise web.HTTPRequestEntityTooLarge(max_size=limit,actual_size=len(data))
        try:
            v=json.loads(data)
            if not isinstance(v,dict):raise ValueError()
            return v
        except:raise web.HTTPBadRequest(text='Expected JSON object')
    def player_pose_summary(self):
        if not self.world:return None
        row=self.db.execute('SELECT sha256,evidence FROM player_pose_assets WHERE world_id=? AND source_digest=?',(self.world['sourceWorldId'],self.world['sourceDigest'])).fetchone()
        return {'sha256':row['sha256'],'evidence':row['evidence'],'columns':15,'rows':2,'cellWidth':32,'cellHeight':40,'nativeAnimationVerified':False} if row else None

    def side_air_height(self,pid,clock=None):
        at=self.side_jumps.get(pid)
        if at is None:return 0
        t=((now() if clock is None else clock)-at)/SIDE_JUMP_SECONDS
        return round(SIDE_JUMP_HEIGHT_PX*4*t*(1-t)) if 0<=t<1 else 0
    def player(self,pid):
        p=self.db.execute('SELECT * FROM players WHERE id=?',(pid,)).fetchone()
        return dict(p) if p else None
    def public(self):
        players=[]
        for p in self.db.execute('SELECT id,x,y,xp,level,earned_xp,attack_level,magic_level,life_level,hp,mp,steps,mode,encounter,enemy_hp,area_id,side_x,side_facing,respawn_camp_id FROM players ORDER BY id').fetchall():
            q=dict(p);q['online']=p['id'] in self.clients
            if p['mode']=='sideview':
                clock=now();jump_at=self.side_jumps.get(p['id'],0)
                t=(clock-jump_at)/SIDE_JUMP_SECONDS if jump_at else 2
                q['side_air_px']=round(SIDE_JUMP_HEIGHT_PX*4*t*(1-t)) if 0<=t<1 else 0
                anim=self.side_actions.get(p['id'])
                q['side_action']=anim[0] if anim and clock<anim[1] else ('jump' if 0<t<1 else 'idle')
                selector={'up_stab':8,'down_stab':9,'forward_stab':4,'jump':6}.get(q['side_action'],3)
                if q['side_action']=='walk':selector=anim[2] if anim and clock<anim[1] else 0
                q['side_pose']=selector
                q['side_action_test_only']=True
            q['nextUpgrades']={skill:(LEVEL_COSTS[skill][q[skill+'_level']+1] if q[skill+'_level']<8 else None) for skill in LEVEL_COSTS}
            players.append(q)
        structures=[dict(s) for s in self.db.execute('SELECT * FROM structures ORDER BY kind,id')]
        areas={}
        for p in players:
            if p['mode']=='sideview' and p['area_id']:
                entry=areas.setdefault(p['area_id'],{'id':p['area_id'],'occupants':[],'sceneVerified':False})
                if p['online']:entry['occupants'].append(p['id'])
        return {'type':'state','areas':list(areas.values()),'stageFrames':[dict(row) for row in self.db.execute('SELECT x,y,content_sha AS revision,capture_method AS captureMethod,width_px AS widthPx FROM stage_frames WHERE world_id=? ORDER BY y,x',(self.world['sourceWorldId'] if self.world else '',))],'playerPoses':self.player_pose_summary(),'nativeRooms':[dict(row) for row in self.db.execute('SELECT location_index AS locationIndex,x,y,digest FROM native_room_records WHERE world_id=? ORDER BY location_index',(self.world['sourceWorldId'] if self.world else '',))],'online':len(self.clients),'world':self.world,'revision':self.revision,'players':players,'structures':structures,'costs':COSTS,'progression':{'profile':'z2-us-thresholds-pilot-v1','levels':LEVEL_COSTS,'encounterSteps':ENCOUNTER_STEPS,'exactEngineTiming':False,'encountersEnabled':self.experimental_encounters,'terrainEnemyTables':'provisional; original region/strong/weak tables NOT decoded','sprites':'Source-derived original Link 0..14 OAM selectors now driven by hosted action state; animation timing, CHR/palette and collision still provisional','abilityRoster':'Original Zelda II upward/downward stab OAM selectors 8/9 displayed for shared player actions; pilot vertical geometry, cooldowns and damage, NOT ROM-equivalent combat','sideView':'256x240 independent room crop; source-derived poses for walking, jumping and stabs; server-controlled pilot jump/vertical test combat; original physics, exact scrolling, Link animation NOT recovered as frame-accurate native behavior','overworldCamera':'256x240 per-player viewport with experimental camera-follow crop; not native Zelda II PPU timing','pvpTest':'localhost only: forward pilot and separately vertical pilot stabs, 8 test HP; original Link pose art but NOT recovered Zelda II hitboxes/damage/animation timing','fairyCamps':'hosted construction/respawn extension, not original Zelda II game over'},'seq':self.seq,'simulation':'Z2 source-rendered poses; original multi-screen artwork when published. Jump, action timing, vertical PvP test damage are server-side TEST mechanics, NOT native Zelda II combat.'}
    async def broadcast(self, world_changed=False):
        self.seq+=1;payload=self.public()
        if not world_changed:payload.pop('world',None) # snapshot-on-join; reduce large CHR-atlas resend under load
        msg=canonical(payload)
        for ws in list(self.clients.values()):
            try:await ws.send_str(msg)
            except Exception:pass
    def require_player(self,req):
        require_local_origin(req)
        token=req.headers.get('Authorization','').removeprefix('Bearer ')
        session=self.sessions.get(hashlib.sha256(token.encode()).hexdigest())
        if not session or session[1]<now():raise web.HTTPUnauthorized(text='Wallet sign-in required')
        return session[0]
    def verify_map(self,obj):
        keys={'format','version','sourceProfile','sourceWorldId','sourceDigest','name','width','height','terrain'}
        version=obj.get('version')
        if version not in (1,2) or set(obj)!=(keys|({'art'} if version==2 else set())) or obj['format']!='nesforge.hosted-world':raise web.HTTPBadRequest(text='Unsupported hosted world snapshot')
        if version==2:self.verify_art(obj['art'])
        if obj['sourceProfile']!='zelda2-overworld-v1' or not re.fullmatch('z2:[12]:[01]',str(obj['sourceWorldId'])):raise web.HTTPBadRequest(text='Expected recognized Zelda II native World binding')
        if not isinstance(obj['name'],str) or len(obj['name'])>100 or not re.fullmatch('[0-9a-f]{64}',str(obj['sourceDigest'])):raise web.HTTPBadRequest(text='Invalid world metadata')
        heights={'z2:1:0':75,'z2:1:1':60,'z2:2:0':75,'z2:2:1':60}
        if obj['width']!=64 or obj['height']!=heights[obj['sourceWorldId']]:raise web.HTTPBadRequest(text='Unexpected Z2 map dimensions')
        t=obj['terrain']
        if not isinstance(t,list) or len(t)!=obj['width']*obj['height'] or any(type(v)!=int or v<0 or v>15 for v in t):raise web.HTTPBadRequest(text='Invalid terrain data')
        return obj
    def verify_art(self,art):
        if not isinstance(art,dict) or set(art)!={'format','png'} or art['format']!='png-atlas-16x16-v1':raise web.HTTPBadRequest(text='Unsupported graphics atlas')
        src=art['png']
        if not isinstance(src,str) or not src.startswith('data:image/png;base64,') or len(src)>120000:raise web.HTTPBadRequest(text='Invalid atlas PNG payload')
        try:raw=base64.b64decode(src[22:],validate=True)
        except (ValueError,binascii.Error):raise web.HTTPBadRequest(text='Invalid atlas base64')
        if len(raw)>85000 or raw[:8]!=b'\x89PNG\r\n\x1a\n':raise web.HTTPBadRequest(text='Not a bounded PNG')
        pos=8;valid_header=False;valid_end=False
        while pos+12<=len(raw):
            length=int.from_bytes(raw[pos:pos+4],'big');typ=raw[pos+4:pos+8]
            if length>85000 or pos+12+length>len(raw):break
            data=raw[pos+8:pos+8+length];crc=int.from_bytes(raw[pos+8+length:pos+12+length],'big')
            if zlib.crc32(typ+data)&0xffffffff!=crc:break
            if typ==b'IHDR':
                if valid_header or pos!=8 or length!=13 or struct.unpack('>IIBBBBB',data)!=(256,16,8,6,0,0,0):break
                valid_header=True
            if typ==b'IEND':valid_end=length==0 and pos+12==len(raw);break
            pos+=12+length
        if not(valid_header and valid_end):raise web.HTTPBadRequest(text='Invalid PNG atlas structure, checksum, or size')
    def verify_stage_frame_png(self,src,expected_width=256):
        """Validate CRCs, PNG layout and bounded RGBA dimensions; no URL/script/CSS inputs."""
        if type(expected_width)!=int or expected_width%256 or not 256<=expected_width<=2048:raise web.HTTPBadRequest(text='Invalid source strip dimensions')
        limit=1900000 if expected_width>256 else 200000
        if not isinstance(src,str) or not src.startswith('data:image/png;base64,') or len(src)>limit:
            raise web.HTTPBadRequest(text='Stage must be bounded local 256x240 PNG data')
        try: raw=base64.b64decode(src.split(',',1)[1],validate=True)
        except (ValueError,binascii.Error):raise web.HTTPBadRequest(text='Invalid stage base64')
        if len(raw)>1400000 or raw[:8]!=b'\x89PNG\r\n\x1a\n':raise web.HTTPBadRequest(text='Invalid or oversized PNG')
        pos=8;has_header=False;has_end=False;idat=0
        while pos+12<=len(raw):
            n=int.from_bytes(raw[pos:pos+4],'big');kind=raw[pos+4:pos+8]
            if n>1400000 or pos+n+12>len(raw):break
            chunk=raw[pos+8:pos+8+n]
            crc=int.from_bytes(raw[pos+8+n:pos+12+n],'big')
            if zlib.crc32(kind+chunk)&0xffffffff != crc:break
            if kind==b'IHDR':
                if pos!=8 or has_header or n!=13 or struct.unpack('>IIBBBBB',chunk)!=(expected_width,240,8,6,0,0,0):break
                has_header=True
            elif kind==b'IDAT':idat+=n
            elif kind==b'IEND':has_end=n==0 and pos+n+12==len(raw);break
            elif kind not in (b'sRGB',b'gAMA',b'cHRM',b'pHYs',b'tEXt',b'iTXt',b'zTXt'):
                raise web.HTTPBadRequest(text='Unsupported PNG chunk')
            pos+=n+12
        if not(has_header and has_end and idat):raise web.HTTPBadRequest(text='Bad stage PNG structure')
        return hashlib.sha256(raw).hexdigest()

    async def upload_stage_frame(self,req):
        self.admin(req)
        body=await self.read(req,205000)
        if set(body)!={'format','version','expectedRevision','sourceWorldId','x','y','captureMethod','png'} or body.get('format')!='nesforge.hosted-stage-frame' or body.get('version')!=1:
            raise web.HTTPBadRequest(text='Unsupported stage frame schema')
        x,y=body['x'],body['y']
        if type(x)!=int or type(y)!=int or body['captureMethod']!='emulator-visible-frame':raise web.HTTPBadRequest(text='Invalid stage coordinates or capture method')
        digest=self.verify_stage_frame_png(body['png'])
        async with self.lock:
            w=self.world
            if not w or body['expectedRevision']!=self.revision or body['sourceWorldId']!=w['sourceWorldId']:
                raise web.HTTPConflict(text='Hosted World revision or identity differs')
            if not 0<=x<w['width'] or not 0<=y<w['height']:raise web.HTTPBadRequest(text='Stage coordinate outside hosted World')
            # A stage is an admin-authored VISUAL REFERENCE for this location, not verified native entrance logic.
            with self.db:
                self.db.execute('REPLACE INTO stage_frames(world_id,x,y,image,content_sha,capture_method) VALUES(?,?,?,?,?,?)',(w['sourceWorldId'],x,y,body['png'],digest,body['captureMethod']))
                self.event('stage-frame-captured','admin',{'x':x,'y':y,'sha256':digest,'method':body['captureMethod'],'nativeSceneVerified':False})
            await self.broadcast()
        return web.json_response({'ok':True,'x':x,'y':y,'sha256':digest,'nativeSceneVerified':False})

    async def upload_player_poses(self,req):
        '''Read-only recovered Link display art. NO combat/movement claims and no ROM upload.'''
        self.admin(req)
        body=await self.read(req,330000)
        expected={'format','version','evidence','rendering','cols','rows','cellWidth','cellHeight','png','sourceDigest','sourceWorldId','expectedRevision','limits'}
        if set(body)!=expected or body['format']!='nesforge.hosted-player-poses' or type(body['version'])!=int or body['version']!=1 or body['evidence']!='executed-original-display' or body['rendering']!='provisional-CHR0-palette-not-runtime-traced' or (body['cols'],body['rows'],body['cellWidth'],body['cellHeight'])!=(15,2,32,40):
            raise web.HTTPBadRequest(text='Unsupported original player display atlas schema')
        if not isinstance(body['limits'],list) or len(body['limits'])!=3 or not all(isinstance(t,str) and 20<len(t)<180 for t in body['limits']):
            raise web.HTTPBadRequest(text='Missing display limitations')
        png=body['png']
        if not isinstance(png,str) or not png.startswith('data:image/png;base64,') or len(png)>300000:
            raise web.HTTPBadRequest(text='Oversized or invalid player art payload')
        try:raw=base64.b64decode(png.split(',',1)[1],validate=True)
        except (ValueError,binascii.Error):raise web.HTTPBadRequest(text='Invalid pose image encoding')
        if len(raw)>220000 or raw[:8]!=b'\x89PNG\r\n\x1a\n':raise web.HTTPBadRequest(text='Invalid pose atlas PNG')
        pos=8;idats=[];header=False;end=False
        while pos+12<=len(raw):
            count=int.from_bytes(raw[pos:pos+4],'big');tag=raw[pos+4:pos+8]
            if count>220000 or pos+count+12>len(raw):break
            data=raw[pos+8:pos+8+count];crc=int.from_bytes(raw[pos+8+count:pos+12+count],'big')
            if zlib.crc32(tag+data)&0xffffffff!=crc:break
            if tag==b'IHDR':
                if header or pos!=8 or data!=struct.pack('>IIBBBBB',480,80,8,6,0,0,0):break
                header=True
            elif tag==b'IDAT':idats.append(data)
            elif tag==b'IEND':end=not count and pos+count+12==len(raw);break
            elif tag not in (b'sRGB',b'gAMA',b'cHRM',b'pHYs'):raise web.HTTPBadRequest(text='Unsupported player art PNG chunk')
            pos+=count+12
        if not(header and end and idats):raise web.HTTPBadRequest(text='Malformed player art PNG')
        # Bound decompression so even valid PNG chunks cannot cause an allocation bomb.
        inflator=zlib.decompressobj();pixels=inflator.decompress(b''.join(idats),153761)
        if len(pixels)!=153680 or not inflator.eof or inflator.unused_data:raise web.HTTPBadRequest(text='Invalid player art raster')
        digest=hashlib.sha256(raw).hexdigest()
        async with self.lock:
            if not self.world or body['expectedRevision']!=self.revision or body['sourceWorldId']!=self.world['sourceWorldId'] or body['sourceDigest']!=self.world['sourceDigest']:
                raise web.HTTPConflict(text='Player art does not match the hosted source/revision')
            with self.db:
                self.db.execute('REPLACE INTO player_pose_assets(world_id,source_digest,image,sha256,evidence) VALUES(?,?,?,?,?)',(self.world['sourceWorldId'],self.world['sourceDigest'],png,digest,body['evidence']))
                self.event('player-poses-published','admin',{'sha256':digest,'rendering':body['rendering'],'animationVerified':False})
            await self.broadcast()
        return web.json_response({'ok':True,'sha256':digest,'nativeAnimationVerified':False})

    async def get_player_poses(self,req):
        if not self.world:raise web.HTTPNotFound(text='No hosted World')
        row=self.db.execute('SELECT image,sha256,evidence FROM player_pose_assets WHERE world_id=? AND source_digest=?',(self.world['sourceWorldId'],self.world['sourceDigest'])).fetchone()
        if not row:raise web.HTTPNotFound(text='No original player pose asset published')
        return web.json_response({'format':'nesforge.hosted-player-poses','version':1,'png':row['image'],'sha256':row['sha256'],'evidence':row['evidence'],'cols':15,'rows':2,'cellWidth':32,'cellHeight':40,'nativeAnimationVerified':False})

    async def upload_native_art(self,req):
        """An original ROM scene constructed by Forge, not arbitrary frame capture or live physics."""
        self.admin(req)
        body=await self.read(req,1950000)
        expected={'format','version','expectedRevision','sourceWorldId','sourceDigest','x','y','sourceBank','sourceScene','sourceKind','evidence','png'}
        if body.get('version')==2:expected=expected|{'sourceWidth'}
        if set(body)!=expected or body.get('format')!='nesforge.hosted-native-scene-art' or type(body.get('version'))!=int or body['version'] not in (1,2) or body.get('evidence')!='executed-original-construction:first-screen':
            raise web.HTTPBadRequest(text='Unsupported source-construction artwork contract')
        x,y,bank,scene=body['x'],body['y'],body['sourceBank'],body['sourceScene']
        if not all(type(v)==int for v in (x,y,bank,scene)) or not 0<=bank<=6 or not 0<=scene<=62 or body.get('sourceKind') not in ('town','overworld','palace','great-palace'):
            raise web.HTTPBadRequest(text='Invalid native room binding')
        width=body.get('sourceWidth',256)
        digest=self.verify_stage_frame_png(body['png'],width)
        async with self.lock:
            w=self.world
            if not w or body['expectedRevision']!=self.revision or body['sourceWorldId']!=w['sourceWorldId'] or body['sourceDigest']!=w['sourceDigest']:
                raise web.HTTPConflict(text='Hosted World revision/identity mismatch')
            if not (0<=x<w['width'] and 0<=y<w['height']):raise web.HTTPBadRequest(text='Out of world bounds')
            rows=self.db.execute('SELECT payload FROM native_room_records WHERE world_id=? AND x=? AND y=?',(w['sourceWorldId'],x,y)).fetchall()
            matching=[json.loads(row['payload']) for row in rows]
            if not any(r['source']['bank']==bank and r['source']['scene']==scene and r['source']['kind']==body['sourceKind'] for r in matching):
                raise web.HTTPConflict(text='Native artwork must match a previously published ROM-derived room')
            with self.db:
                self.db.execute('REPLACE INTO stage_frames(world_id,x,y,image,content_sha,capture_method,width_px) VALUES(?,?,?,?,?,?,?)',
                    (w['sourceWorldId'],x,y,body['png'],digest,'executed-original-construction:first-screen',width))
                self.event('native-scene-art','admin',{'x':x,'y':y,'bank':bank,'scene':scene,'sha256':digest,'renderedSource':'GameRENative','fullOriginalRaster':width>256,'widthPx':width,'gameplayParity':False})
            await self.broadcast()
        return web.json_response({'ok':True,'x':x,'y':y,'sha256':digest,'method':'executed-original-construction:first-screen','widthPx':width,'gameplayParity':False})

    async def get_stage_frame(self,req):
        w=self.world
        if not w:raise web.HTTPNotFound(text='No hosted World')
        try:x=int(req.query['x']);y=int(req.query['y'])
        except (ValueError,KeyError):raise web.HTTPBadRequest(text='Expected stage x/y')
        if not 0<=x<w['width'] or not 0<=y<w['height']:raise web.HTTPBadRequest(text='Invalid stage coordinate')
        row=self.db.execute('SELECT image,content_sha,capture_method,width_px FROM stage_frames WHERE world_id=? AND x=? AND y=?',(w['sourceWorldId'],x,y)).fetchone()
        if not row:raise web.HTTPNotFound(text='No reference frame for this location')
        return web.json_response({'format':'nesforge.hosted-stage-frame','version':1,'x':x,'y':y,'png':row['image'],'sha256':row['content_sha'],'captureMethod':row['capture_method'],'widthPx':row['width_px'],'nativeSceneVerified':False})

    def validate_native_room(self,room,world):
        """Source-derived *reference metadata*, never accepted as runtime geometry or actions."""
        if not isinstance(room,dict) or set(room)!={'format','version','location','source','header','exits','objects','evidence','nativeSceneVerified','originalEnginePlayable'} or room['format']!='nesforge.z2.native-room-record' or type(room['version'])!=int or room['version']!=1 or room['nativeSceneVerified'] is not False or room['originalEnginePlayable'] is not False:
            raise web.HTTPBadRequest(text='Invalid or overclaimed native room record')
        loc=room['location'];src=room['source'];header=room['header']
        if not isinstance(loc,dict) or set(loc)!={'index','x','y','globalY','external','entry','terrainSource'}:raise web.HTTPBadRequest(text='Invalid source room location')
        if not isinstance(src,dict) or set(src)!={'bank','table','scene','cpu','fileOffset','length','kind'}:raise web.HTTPBadRequest(text='Invalid source room pointer')
        if not isinstance(header,dict) or set(header)!={'objectSet','screenCount','grass','bushes','flags','ground','groundTileSet','initialGroundPosition','ceilingDisabled','palette','backgroundPalette','backMap'}:raise web.HTTPBadRequest(text='Invalid source room header')
        def check(v,a,b):return type(v)==int and a<=v<=b
        if not (check(loc['index'],0,61) and check(loc['x'],0,world['width']-1) and check(loc['y'],0,world['height']-1) and loc['terrainSource']==world['sourceWorldId'] and check(loc['globalY'],30,127) and loc['y']==loc['globalY']-30 and check(loc['external'],0,1) and check(loc['entry'],0,3)):
            raise web.HTTPBadRequest(text='Native location is outside selected hosted world')
        if not (check(src['bank'],1,5) and src['table'] in (0x8523,0xa000) and check(src['scene'],0,62) and check(src['cpu'],0x8000,0xbfff) and src['fileOffset']==16+src['bank']*16384+src['cpu']-0x8000 and check(src['length'],4,255) and src['cpu']+src['length']<=0xc000 and src['kind'] in ('overworld','town','palace','great-palace')):
            raise web.HTTPBadRequest(text='Native source pointer invalid')
        if not (check(header['objectSet'],0,1) and check(header['screenCount'],1,4) and check(header['ground'],0,255) and check(header['palette'],0,255) and check(header['flags'],0,255) and check(header['groundTileSet'],0,7) and check(header['initialGroundPosition'],0,15) and check(header['backgroundPalette'],0,7) and check(header['backMap'],0,7) and type(header['grass'])==bool and type(header['bushes'])==bool and type(header['ceilingDisabled'])==bool and header['objectSet']==header['flags']>>7 and header['screenCount']==((header['flags']>>5)&3)+1 and header['groundTileSet']==(header['ground']>>4)&7 and header['initialGroundPosition']==header['ground']&15 and header['backgroundPalette']==(header['palette']>>3)&7 and header['backMap']==header['palette']&7):
            raise web.HTTPBadRequest(text='Native header fields disagree')
        if type(room['evidence'])!=str or len(room['evidence'])>500 or len(room['evidence'])<10:raise web.HTTPBadRequest(text='Missing native evidence qualification')
        ex=room['exits'];obs=room['objects']
        if not isinstance(ex,list) or len(ex)!=4 or not isinstance(obs,list) or len(obs)>126:raise web.HTTPBadRequest(text='Bad native room records')
        for j,v in enumerate(ex):
            if not isinstance(v,dict) or set(v)!={'side','map','screen','outside'} or v['side']!=('left','down','up','right')[j] or not check(v['map'],0,63) or not check(v['screen'],0,3) or type(v['outside'])!=bool or v['outside']!=(v['map']==63):raise web.HTTPBadRequest(text='Invalid exit descriptor')
        for item in obs:
            if not isinstance(item,dict) or not {'x','y','code','advance','kind'}<=set(item) or len(item)>7 or not check(item['x'],0,1024) or not check(item['y'],0,15) or not check(item['code'],0,255) or not check(item['advance'],0,15) or item['kind'] not in ('set-cursor','change-ground','item-reference','object','special-object') or any(k not in ('x','y','code','advance','kind','newX','ground','itemCode') for k in item):raise web.HTTPBadRequest(text='Invalid native map event')
        return canonical(room)

    async def upload_native_rooms(self,req):
        self.admin(req)
        body=await self.read(req,130000)
        if set(body)!={'format','version','expectedRevision','sourceWorldId','sourceDigest','stages','skipped'} or body['format']!='nesforge.z2.native-room-catalog' or body['version']!=1:
            raise web.HTTPBadRequest(text='Unsupported native room catalog format')
        stages=body['stages'];skipped=body['skipped']
        if not isinstance(stages,list) or len(stages)>62 or not isinstance(skipped,list) or len(skipped)>62 or any(not isinstance(v,dict) or set(v)!={'index','reason'} or type(v['index'])!=int or not 0<=v['index']<=61 or not isinstance(v['reason'],str) or len(v['reason'])>160 for v in skipped):raise web.HTTPBadRequest(text='Malformed room catalog')
        async with self.lock:
            w=self.world
            if not w or body['expectedRevision']!=self.revision or body['sourceWorldId']!=w['sourceWorldId'] or body['sourceDigest']!=w['sourceDigest']:
                raise web.HTTPConflict(text='Hosted World changed; re-export native room records')
            seen=set();rows=[]
            for stage in stages:
                encoded=self.validate_native_room(stage,w)
                i=stage['location']['index']
                if i in seen:raise web.HTTPBadRequest(text='Duplicate source location index')
                seen.add(i);loc=stage['location'];rows.append((w['sourceWorldId'],i,loc['x'],loc['y'],encoded,hashlib.sha256(encoded.encode()).hexdigest()))
            with self.db:
                self.db.execute('DELETE FROM native_room_records WHERE world_id=?',(w['sourceWorldId'],))
                self.db.executemany('INSERT INTO native_room_records(world_id,location_index,x,y,payload,digest) VALUES(?,?,?,?,?,?)',rows)
                self.event('source-rooms-recovered','admin',{'count':len(rows),'skipped':len(skipped),'nativeSceneVerified':False,'dataOnly':True})
            await self.broadcast()
        return web.json_response({'ok':True,'recovered':len(rows),'skipped':len(skipped),'nativeSceneVerified':False,'playable':False})

    async def get_native_room(self,req):
        w=self.world
        if not w:raise web.HTTPNotFound(text='No hosted World')
        try:x=int(req.query['x']);y=int(req.query['y'])
        except (ValueError,KeyError):raise web.HTTPBadRequest(text='Expected coordinates')
        if not 0<=x<w['width'] or not 0<=y<w['height']:raise web.HTTPBadRequest(text='Outside hosted world')
        rows=self.db.execute('SELECT payload FROM native_room_records WHERE world_id=? AND x=? AND y=? ORDER BY location_index',(w['sourceWorldId'],x,y)).fetchall()
        return web.json_response({'format':'nesforge.z2.native-room-selection','version':1,'x':x,'y':y,'rooms':[json.loads(r['payload']) for r in rows],'nativeSceneVerified':False})

    def spawn(self, world):
        """Find a conservative provisional walkable tile for the localhost pilot.
        Not equivalent to Zelda II's native start position or traversal logic.
        """
        if not world:return (2,2)
        width,height=world['width'],world['height']
        terrain=world['terrain']
        # Prefer road/grass or a town near the Northwest testing area.
        candidates=[]
        for y in range(height):
            for x in range(width):
                tile=terrain[y*width+x]
                if tile in (9,5,0,4,6):
                    candidates.append((abs(x-2)+abs(y-6), x, y))
        if candidates:
            _,x,y=min(candidates)
            return x,y
        for y in range(height):
            for x in range(width):
                if terrain[y*width+x] not in (10,11,12,14):return x,y
        raise web.HTTPBadRequest(text='No pilot-walkable terrain in selected map')
    async def load_world(self,req):
        self.admin(req);obj=self.verify_map(await self.read(req))
        async with self.lock:
            if self.clients:raise web.HTTPConflict(text='Stop all players before loading a new revision')
            revision=hashlib.sha256(canonical(obj).encode()).hexdigest()
            changed=self.revision!=revision
            if changed:
                self.db.execute('DELETE FROM structures')
                self.db.execute('DELETE FROM stage_frames') # stage captures/source scene art are revision-specific
                self.db.execute('DELETE FROM player_pose_assets') # derived Link display art is revision-specific
                self.db.execute('DELETE FROM native_room_records') # data-bound room catalog requires reimport on new World
                sx,sy=self.spawn(obj)
                self.db.execute("UPDATE players SET x=?,y=?,steps=0,mode='overworld',area_id='',side_x=8,respawn_camp_id='',encounter='',enemy_hp=0,guard=0,encounter_origin=''",(sx,sy))
                self.db.execute('REPLACE INTO worlds(id,payload,revision) VALUES(?,?,?)',('active',canonical(obj),revision))
                self.world=obj;self.revision=revision
                self.event('world-load','admin',{'revision':revision,'sourceWorldId':obj['sourceWorldId']})
        return web.json_response({'ok':True,'revision':self.revision,'world':obj['name'],'resetOverlays':changed})
    async def patch_world(self,req):
        self.admin(req);body=await self.read(req,20000)
        if set(body)!={'format','version','expectedRevision','sourceWorldId','changes'} or body['format']!='nesforge.world.patch' or body['version']!=1:
            raise web.HTTPBadRequest(text='Invalid world patch format')
        changes=body['changes']
        if not isinstance(changes,list) or not 1<=len(changes)<=128:raise web.HTTPBadRequest(text='1-128 changes required')
        async with self.lock:
            if not self.world or self.world.get('version')!=2:raise web.HTTPConflict(text='Load v2 graphics snapshot first')
            if body['expectedRevision']!=self.revision:raise web.HTTPConflict(text='Host world revision changed; refresh and recheck edits')
            if body['sourceWorldId']!=self.world['sourceWorldId']:raise web.HTTPConflict(text='Wrong source World')
            previous=self.world['terrain'];updated=list(previous);used=set();touch=[]
            occupied={(p['y']*self.world['width']+p['x']) for p in self.db.execute('SELECT x,y FROM players')}
            occupied.update(s['y']*self.world['width']+s['x'] for s in self.db.execute('SELECT x,y FROM structures'))
            for entry in changes:
                if not isinstance(entry,dict) or set(entry)!={'index','value'}:raise web.HTTPBadRequest(text='Invalid terrain patch entry')
                i,v=entry['index'],entry['value']
                if type(i)!=int or type(v)!=int or not 0<=i<len(updated) or not 0<=v<16 or i in used:raise web.HTTPBadRequest(text='Invalid or duplicate terrain change')
                used.add(i)
                if i in occupied:raise web.HTTPConflict(text='Terrain edit intersects a saved player position or constructed asset: cell '+str(i))
                if previous[i]!=v:updated[i]=v;touch.append({'index':i,'before':previous[i],'after':v})
            if not touch:return web.json_response({'ok':True,'changed':0,'revision':self.revision})
            new_world={**self.world,'terrain':updated};revision=hashlib.sha256(canonical(new_world).encode()).hexdigest()
            with self.db:
                self.db.execute('REPLACE INTO worlds(id,payload,revision) VALUES(?,?,?)',('active',canonical(new_world),revision))
                self.event('world-patch','admin',{'previousRevision':self.revision,'revision':revision,'changes':touch})
            self.world=new_world;self.revision=revision
            await self.broadcast(world_changed=True)
            return web.json_response({'ok':True,'changed':len(touch),'revision':revision})
    async def challenge(self,req):
        origin=require_local_origin(req);body=await self.read(req,1000)
        supplied=str(body.get('address',''));chain=body.get('chainId')
        if not re.fullmatch(r'0x[0-9a-fA-F]{40}',supplied) or chain!=CHAIN_ID:raise web.HTTPBadRequest(text='Valid EVM address and chainId 1 required')
        try:display_addr=checksum_address(supplied)
        except ValueError as exc:raise web.HTTPBadRequest(text=str(exc))
        addr=display_addr.lower() # canonical DB/session identity; SIWE message keeps EIP-55 display casing.
        request_origin=origin or f'http://{DOMAIN}'
        authority=request_origin.split('://',1)[-1]
        nonce=secrets.token_urlsafe(20).replace('_','A').replace('-','B')
        iat=now();exp=iat+300
        msg=(f'{authority} wants you to sign in with your Ethereum account:\n{display_addr}\n\n'
             'NES Forge local hosted-world player authentication. No transaction or payment.\n\n'
             f'URI: http://{authority}/\nVersion: 1\nChain ID: {CHAIN_ID}\nNonce: {nonce}\n'
             f'Issued At: {utc(iat)}\nExpiration Time: {utc(exp)}')
        self.challenges[nonce]=(addr,msg,exp)
        return web.json_response({'nonce':nonce,'message':msg,'address':display_addr,'expiresAt':utc(exp)})
    async def login(self,req):
        require_local_origin(req);body=await self.read(req,1500)
        nonce=body.get('nonce');rec=self.challenges.pop(nonce,None) if isinstance(nonce,str) else None
        if not rec or now()>rec[2]:raise web.HTTPUnauthorized(text='Challenge missing, expired or already used')
        try:recovered=recover_address(rec[1],body.get('signature',''))
        except (ValueError,TypeError,RuntimeError) as exc:raise web.HTTPUnauthorized(text='Invalid EOA wallet signature: '+str(exc))
        if recovered.lower()!=rec[0]:raise web.HTTPUnauthorized(text='Signed wallet address does not match challenge')
        async with self.lock:
            p=self.db.execute('SELECT id FROM players WHERE address=?',(rec[0],)).fetchone()
            if p:pid=p['id']
            else:
                pid=str(uuid.uuid4());sx,sy=self.spawn(self.world);self.db.execute('INSERT INTO players(id,address,x,y,xp,level) VALUES(?,?,?,?,?,?)',(pid,rec[0],sx,sy,0,1))
                self.event('join','player',{'playerId':pid})
        token=secrets.token_urlsafe(32);self.sessions[hashlib.sha256(token.encode()).hexdigest()]=(pid,now()+14400)
        return web.json_response({'playerId':pid,'sessionToken':token,'expiresIn':14400,'worldReady':self.world is not None})
    async def me(self,req):return web.json_response(self.player(self.require_player(req)))
    async def state(self,req):
        pid=self.require_player(req)
        if not self.world:raise web.HTTPConflict(text='Admin must load a World first')
        return web.json_response({'you':pid,**self.public()})
    async def admin_state(self,req):
        self.admin(req)
        val=self.public()
        val['audit']=[dict(row) for row in self.db.execute('SELECT * FROM journal ORDER BY seq DESC LIMIT 30')]
        return web.json_response(val)
    def area_for(self,p):
        """One shared area per map cell. Explicitly NOT a recovered Z2 interior destination."""
        if not self.world:return None
        x,y=p['x'],p['y']
        tile=self.world['terrain'][y*self.world['width']+x]
        camp=self.db.execute('SELECT id FROM structures WHERE kind=? AND x=? AND y=?',('camp',x,y)).fetchone()
        if camp:category='fairy-camp'
        elif tile in (0,1,2):category={0:'town',1:'cave',2:'palace'}[tile]
        else:return None
        return f"{self.world['sourceWorldId']}:{category}:{x}:{y}"

    def available_side_x(self,area,pid):
        occupied={int(p['side_x']) for p in self.db.execute('SELECT id,side_x FROM players WHERE mode=? AND area_id=?',('sideview',area)) if p['id']!=pid}
        order=sorted(range(32),key=lambda x:(abs(x-8),x))
        return next((x for x in order if x not in occupied),8)

    def respawn_player(self,pid,reason):
        """Audit-only forced defeat until verified Zelda II combat exists."""
        p=self.player(pid);camp=None
        if p['respawn_camp_id']:
            camp=self.db.execute('SELECT * FROM structures WHERE id=? AND player_id=? AND kind=?',(p['respawn_camp_id'],pid,'camp')).fetchone()
            if camp and not self.can_step(camp['x'],camp['y']):camp=None
        if camp:
            x,y=camp['x'],camp['y'];area=f"{self.world['sourceWorldId']}:fairy-camp:{x}:{y}"
            sx=self.available_side_x(area,pid)
            self.db.execute("UPDATE players SET x=?,y=?,mode='sideview',area_id=?,side_x=?,hp=64,encounter='',enemy_hp=0,guard=0 WHERE id=?",(x,y,area,sx,pid))
        else:
            x,y=self.spawn(self.world)
            self.db.execute("UPDATE players SET x=?,y=?,mode='overworld',area_id='',side_x=8,respawn_camp_id='',hp=64,encounter='',enemy_hp=0,guard=0 WHERE id=?",(x,y,pid))
        self.event('test-defeat-respawn',pid,{'reason':reason,'campUsed':bool(camp),'areaId':area if camp else None,'x':x,'y':y,'notOriginalZ2DeathRule':True})
        return {'ok':True,'campUsed':bool(camp),'mode':'sideview' if camp else 'overworld'}

    async def admin_command(self,req):
        self.admin(req);body=await self.read(req,1500)
        if body.get('action')=='simulate_defeat':
            pid=body.get('playerId')
            if not isinstance(pid,str):raise web.HTTPBadRequest(text='Invalid player ID')
            async with self.lock:
                if not self.world:raise web.HTTPConflict(text='Load a World first')
                if not self.player(pid):raise web.HTTPNotFound(text='Unknown player')
                with self.db:result=self.respawn_player(pid,'explicit-admin-localhost-test')
                await self.broadcast()
            return web.json_response(result)
        if body.get('action')!='grant_test_xp':raise web.HTTPBadRequest(text='Unsupported admin command')
        amount=body.get('amount');pid=body.get('playerId')
        if type(amount)!=int or amount<1 or amount>100 or not isinstance(pid,str):raise web.HTTPBadRequest(text='Invalid XP grant')
        async with self.lock:
            if not self.player(pid):raise web.HTTPNotFound(text='Unknown player')
            self.db.execute('UPDATE players SET xp=xp+?,earned_xp=earned_xp+? WHERE id=?',(amount,amount,pid));self.event('test-xp','admin',{'playerId':pid,'amount':amount})
            await self.broadcast()
        return web.json_response({'ok':True})
    def can_step(self,x,y):
        if not self.world or x<0 or y<0 or x>=self.world['width'] or y>=self.world['height']:return False
        # Pilot rule, NOT verified Zelda II collision/raft/cave behavior.
        tile=self.world['terrain'][y*self.world['width']+x]
        return tile not in (10,11,12,14)
    def encounter_start(self,pid,p,terrain):
        biome=ENCOUNTER_TERRAIN[terrain]
        enemy,hp,reward=ENCOUNTER_PROFILE[biome]
        self.db.execute("UPDATE players SET mode='encounter',encounter=?,enemy_hp=?,guard=0,encounter_origin=? WHERE id=?",(enemy,hp,biome,pid))
        self.event('encounter',pid,{'enemy':enemy,'biome':biome,'hp':hp,'provisional':True,'originalEnemyName':True,'nativeRegionSelectionVerified':False})
    async def action(self,pid,body):
        if not self.world:return {'error':'Admin has not loaded a world'}
        typ=body.get('type');p=self.player(pid)
        if typ=='level_up':
            skill=body.get('skill')
            if skill not in LEVEL_COSTS:return {'error':'Unknown skill'}
            lv=p[skill+'_level']
            if lv>=8:return {'error':'Stat already at level 8'}
            cost=LEVEL_COSTS[skill][lv+1]
            if p['xp']<cost:return {'error':'Not enough unspent XP to raise '+skill+' (requires '+str(cost)+')'}
            self.db.execute('UPDATE players SET xp=xp-?, '+skill+'_level='+skill+'_level+1 WHERE id=?',(cost,pid))
            self.event('stat-upgrade',pid,{'skill':skill,'newLevel':lv+1,'cost':cost})
            return {'ok':True,'upgrade':skill,'level':lv+1}
        if typ=='encounter_action':
            if not self.experimental_encounters:return {'error':'Encounter combat requires recovered Z2 scenes/AI; demo mode disabled'}
            if p['mode']!='encounter':return {'error':'No active encounter'}
            choice=body.get('action')
            if choice not in ('strike','guard','flee'):return {'error':'Unsupported encounter action'}
            if choice=='flee':
                self.db.execute("UPDATE players SET mode='overworld',encounter='',enemy_hp=0,guard=0,steps=0 WHERE id=?",(pid,))
                self.event('encounter-flee',pid,{'provisional':True})
                return {'ok':True}
            if choice=='guard':
                damage=0;self.db.execute('UPDATE players SET guard=1 WHERE id=?',(pid,))
            else:
                damage=max(1,p['attack_level']+1)
                new_enemy=max(0,p['enemy_hp']-damage)
                if new_enemy==0:
                    reward=next((profile[2] for profile in ENCOUNTER_PROFILE.values() if profile[0]==p['encounter']),10)
                    self.db.execute("UPDATE players SET xp=xp+?,earned_xp=earned_xp+?,mode='overworld',encounter='',enemy_hp=0,guard=0,steps=0 WHERE id=?",(reward,reward,pid))
                    self.event('encounter-win',pid,{'enemy':p['encounter'],'xpEarned':reward,'provisional':True})
                    return {'ok':True,'xpEarned':reward}
                self.db.execute('UPDATE players SET enemy_hp=? WHERE id=?',(new_enemy,pid))
            # Provisional deterministic damage, no unrecovered Z2 enemy AI claimed.
            taken=max(1,3-p['life_level']//3-(1 if choice=='guard' else 0))
            new_hp=max(0,p['hp']-taken)
            if new_hp==0:
                new_hp=64; sx,sy=self.spawn(self.world)
                self.db.execute("UPDATE players SET hp=?,x=?,y=?,xp=0,mode='overworld',encounter='',enemy_hp=0,steps=0,guard=0 WHERE id=?",(new_hp,sx,sy,pid))
                self.event('encounter-defeat',pid,{'lostUnspentXp':p['xp'],'provisional':True})
            else:self.db.execute('UPDATE players SET hp=? WHERE id=?',(new_hp,pid))
            return {'ok':True,'damage':damage,'damageTaken':taken}
        if p['mode']=='sideview':
            if typ=='side_jump':
                if set(body)!={'type'}:return {'error':'Invalid side-view jump command'}
                if p['hp']<=0:return {'error':'Defeated player cannot jump'}
                clock=now()
                if clock-self.side_jumps.get(pid,0)<SIDE_JUMP_SECONDS:return {'error':'Already in jump arc'}
                self.side_jumps[pid]=clock
                self.event('side-jump-pilot',pid,{'areaId':p['area_id'],'provisionalPhysics':True})
                return {'ok':True,'pilot':True}
            if typ=='side_action':
                if set(body)!={'type','action'} or body.get('action') not in ('up_stab','down_stab','forward_stab'):
                    return {'error':'Unknown side-view action'}
                if p['hp']<=0:return {'error':'Defeated player cannot attack'}
                # Require source-identified original Link artwork for specific pose-backed
                # attacks; do not pretend a blank hosted world has authentic graphics.
                if not self.player_pose_summary():return {'error':'Publish original Link display poses from Forge WORLD Live first'}
                clock=now()
                if clock-self.combat_cooldowns.get(pid,0)<SIDE_ATTACK_COOLDOWN:return {'error':'Pilot attack cooling down'}
                act=body['action']
                air=self.side_air_height(pid,clock)
                if act=='down_stab' and air<4:return {'error':'Downward Stab requires a jump (pilot)'}
                self.combat_cooldowns[pid]=clock
                self.side_actions[pid]=(act,clock+SIDE_ATTACK_SECONDS,{'forward_stab':4,'up_stab':8,'down_stab':9}[act])
                # Server owns both attacker/target coordinates. These are BOUNDED
                # VERTICAL PILOT regions, NOT original Link sword OAM hitboxes.
                candidates=[]
                for enemy in self.db.execute('SELECT id,side_x,hp,mode,area_id FROM players WHERE id!=?',(pid,)).fetchall():
                    if enemy['mode']!='sideview' or enemy['area_id']!=p['area_id'] or enemy['hp']<=0 or enemy['id'] not in self.clients:continue
                    delta_x=(enemy['side_x']-p['side_x'])*8
                    delta_y=self.side_air_height(enemy['id'],clock)-air
                    facing=p['side_facing'] if p['side_facing'] in (-1,1) else 1
                    if act=='forward_stab':within=0<=delta_x*facing<=19 and abs(delta_y)<=14
                    elif act=='up_stab':within=abs(delta_x)<=13 and 9<=delta_y<=58
                    else:within=abs(delta_x)<=13 and -58<=delta_y<=-9
                    if within:candidates.append((abs(delta_x)+abs(delta_y),enemy['id']))
                if not candidates:
                    self.event('side-stab-pilot-miss',pid,{'action':act,'sourcePose':self.side_actions[pid][2],'provisionalHitbox':True,'areaId':p['area_id']})
                    return {'ok':True,'hit':False,'action':act,'sourcePose':self.side_actions[pid][2],'pilot':True}
                candidates.sort();victim_id=candidates[0][1];victim=self.player(victim_id)
                damage=8 # TEST ONLY, not NES damage calculation
                remaining=max(0,victim['hp']-damage)
                self.db.execute('UPDATE players SET hp=? WHERE id=?',(remaining,victim_id))
                self.event('side-stab-pilot-hit',pid,{'action':act,'sourcePose':self.side_actions[pid][2],'target':victim_id,'damage':damage,'provisionalHitbox':True,'areaId':p['area_id'],'xpReward':0})
                if remaining==0:self.respawn_player(victim_id,'side-stab-pilot-no-xp')
                return {'ok':True,'hit':True,'action':act,'sourcePose':self.side_actions[pid][2],'target':victim_id,'damage':damage,'pilot':True,'respawned':remaining==0}
            if typ=='pvp_test_attack':
                # This action verifies shared-room authorization and client synchronization only.
                # Never claim the provisional strike equals original Zelda II hitboxes/damage.
                if set(body)!={'type'}:return {'error':'Invalid PvP test command'}
                if p['hp']<=0:return {'error':'Unable to attack while defeated'}
                clock=now()
                if clock-self.combat_cooldowns.get(pid,0)<0.45:return {'error':'Pilot attack cooling down'}
                self.combat_cooldowns[pid]=clock
                direction=p['side_facing'] if p['side_facing'] in (-1,1) else 1
                candidates=[]
                for enemy in self.db.execute('SELECT id,side_x,hp,mode,area_id FROM players WHERE id!=?',(pid,)).fetchall():
                    distance=(enemy['side_x']-p['side_x'])*direction
                    if enemy['mode']=='sideview' and enemy['area_id']==p['area_id'] and 0<=distance<=2 and enemy['hp']>0 and enemy['id'] in self.clients:
                        candidates.append((distance,enemy['id']))
                if not candidates:
                    self.event('pvp-test-miss',pid,{'areaId':p['area_id'],'sideX':p['side_x'],'facing':direction,'provisional':True})
                    return {'ok':True,'hit':False,'pilot':True}
                candidates.sort();victim_id=candidates[0][1];victim=self.player(victim_id)
                dmg=8 # explicitly test-only: NOT an original Z2 damage lookup
                new_hp=max(0,victim['hp']-dmg)
                self.db.execute('UPDATE players SET hp=? WHERE id=?',(new_hp,victim_id))
                self.event('pvp-test-hit',pid,{'target':victim_id,'damage':dmg,'hpAfter':new_hp,'areaId':p['area_id'],'provisional':True,'xpReward':0})
                if new_hp==0:self.respawn_player(victim_id,'pvp-network-test-no-xp')
                return {'ok':True,'hit':True,'target':victim_id,'damage':dmg,'pilot':True,'respawned':new_hp==0}
            if typ=='side_step':
                direction=body.get('direction')
                if type(direction)!=int or direction not in (-1,1):return {'error':'Side-view step must be -1 or +1'}
                prev=self.cooldowns.get(pid,0)
                if now()-prev<0.06:return {'error':'Side-view input rate limited'}
                next_x=p['side_x']+direction
                # Only verified multi-screen art extends the provisional network walk boundary.
                # Native collision and exit conditions are not implied by this pixel range.
                art=self.db.execute('SELECT width_px FROM stage_frames WHERE world_id=? AND x=? AND y=? AND capture_method=?',
                   (self.world['sourceWorldId'],p['x'],p['y'],'executed-original-construction:first-screen')).fetchone()
                max_x=max(31,art['width_px']//8-1) if art else 31
                if not 0<=next_x<=max_x:return {'error':'At experimental room edge; use Leave side-view'}
                self.db.execute('UPDATE players SET side_x=?,side_facing=? WHERE id=?',(next_x,direction,pid))
                # Walking selector 0/1/2 recovered from emulator observations.
                # Step-rate-to-frame mapping is a hosted approximation.
                self.side_actions[pid]=('walk',now()+0.16, (0,1,2)[next_x%3])
                self.cooldowns[pid]=now()
                return {'ok':True}
            if typ=='leave_area':
                # This returns to the same overworld map cell, not a made-up exit destination.
                if not self.can_step(p['x'],p['y']):return {'error':'Anchor terrain invalid; administrator must repair world'}
                self.db.execute("UPDATE players SET mode='overworld',area_id='',side_x=8 WHERE id=?",(pid,))
                self.event('sideview-exit',pid,{'areaId':p['area_id'],'x':p['x'],'y':p['y'],'destination':'same-overworld-cell'})
                return {'ok':True}
            return {'error':'In shared side-view area; leave it before overworld movement'}
        if p['mode']!='overworld':return {'error':'Resolve or exit the current encounter before returning to the overworld'}
        if typ=='enter_area':
            area=self.area_for(p)
            if not area:return {'error':'No supported pilot entrance on this overworld square; only Town, Cave, Palace, or a camp'}
            side_x=self.available_side_x(area,pid)
            self.db.execute("UPDATE players SET mode='sideview',area_id=?,side_x=? WHERE id=?",(area,side_x,pid))
            self.event('sideview-enter',pid,{'areaId':area,'sceneVerified':False,'sharedInstance':True})
            return {'ok':True,'areaId':area} 
        if typ=='move':
            dx,dy=body.get('dx'),body.get('dy')
            if type(dx)!=int or type(dy)!=int or abs(dx)+abs(dy)!=1:return {'error':'One adjacent tile only'}
            prev=self.cooldowns.get(pid,0)
            if now()-prev<0.09:return {'error':'Move rate limited'}
            x,y=p['x']+dx,p['y']+dy
            if not self.can_step(x,y):return {'error':'Terrain blocked by pilot rule; native traversal not implemented'}
            self.db.execute('UPDATE players SET x=?,y=?,steps=steps+1 WHERE id=?',(x,y,pid));self.cooldowns[pid]=now()
            terrain=self.world['terrain'][y*self.world['width']+x]
            # One-way entry on ARRIVAL, not while standing on the cell. Leaving side-view
            # returns to the cell; player must leave and step back to enter again.
            arrived=self.player(pid)
            area=self.area_for(arrived)
            if area:
                side_x=self.available_side_x(area,pid)
                self.db.execute("UPDATE players SET mode='sideview',area_id=?,side_x=? WHERE id=?",(area,side_x,pid))
                self.event('sideview-auto-enter',pid,{'areaId':area,'x':x,'y':y,'terrain':terrain,'sharedInstance':True,'nativePhysics':False})
                return {'ok':True,'autoEntered':True,'areaId':area}
            if self.experimental_encounters and terrain in ENCOUNTER_TERRAIN and (p['steps']+1)%ENCOUNTER_STEPS==0:
                self.encounter_start(pid,p,terrain)
            return {'ok':True}
        if typ=='build':
            kind=body.get('kind')
            if kind not in ('camp','defense','boss'):return {'error':'Unsupported build asset'}
            x,y=body.get('x'),body.get('y')
            if type(x)!=int or type(y)!=int or abs(x-p['x'])+abs(y-p['y'])>2 or not self.can_step(x,y):return {'error':'Placement outside player reach or blocked'}
            cost=COSTS[kind]
            if p['xp']<cost:return {'error':'Not enough unallocated XP'}
            if self.db.execute('SELECT 1 FROM structures WHERE x=? AND y=?',(x,y)).fetchone():return {'error':'Cell occupied'}
            if kind!='camp':
                parent=body.get('parentId');camp=self.db.execute('SELECT * FROM structures WHERE id=? AND kind=?',(parent,'camp')).fetchone()
                if not camp or camp['player_id']!=pid or abs(camp['x']-x)+abs(camp['y']-y)>3:return {'error':'Owned nearby camp required'}
            else:parent=None
            sid=str(uuid.uuid4());self.db.execute('UPDATE players SET xp=xp-? WHERE id=?',(cost,pid))
            self.db.execute('INSERT INTO structures(id,player_id,kind,x,y,parent_id,hp) VALUES(?,?,?,?,?,?,?)',(sid,pid,kind,x,y,parent,10 if kind=='boss' else 0))
            if kind=='camp':
                self.db.execute('UPDATE players SET respawn_camp_id=? WHERE id=?',(sid,pid))
                self.event('fairy-camp-anchor',pid,{'structureId':sid,'x':x,'y':y,'hostedExtension':True})
            self.event('build',pid,{'structureId':sid,'kind':kind,'x':x,'y':y,'cost':cost})
            return {'ok':True,'structureId':sid,'cost':cost}
        if typ=='boss_hp':
            sid=body.get('structureId');boss=self.db.execute('SELECT * FROM structures WHERE id=? AND kind=?',(sid,'boss')).fetchone()
            if not boss or boss['player_id']!=pid:return {'error':'Only owner can improve boss'}
            if p['xp']<COSTS['boss_hp']:return {'error':'Not enough unallocated XP'}
            if boss['hp']>=30:return {'error':'Pilot boss HP cap reached'}
            self.db.execute('UPDATE players SET xp=xp-? WHERE id=?',(COSTS['boss_hp'],pid))
            self.db.execute('UPDATE structures SET hp=hp+5 WHERE id=?',(sid,))
            self.event('boss-upgrade',pid,{'structureId':sid,'hp':boss['hp']+5})
            return {'ok':True}
        return {'error':'Unsupported action'}
    async def websocket(self,req):
        require_local_origin(req)
        ws=web.WebSocketResponse(heartbeat=20,max_msg_size=2048);await ws.prepare(req)
        pid=None
        try:
            msg=await ws.receive(timeout=8)
            if msg.type!=WSMsgType.TEXT:raise ValueError('Authenticate before sending input')
            body=json.loads(msg.data)
            if body.get('type')!='authenticate':raise ValueError('First message must authenticate')
            token=body.get('sessionToken','')
            sess=self.sessions.get(hashlib.sha256(str(token).encode()).hexdigest())
            if not sess or sess[1]<now():raise ValueError('Invalid or expired wallet session')
            pid=sess[0]
            async with self.lock:
                if pid not in self.clients and len(self.clients)>=MAX_PLAYERS:raise ValueError('Hosted world full')
                old=self.clients.get(pid)
                if old and old is not ws:await old.close(code=4001,message=b'New session')
                self.clients[pid]=ws
                await ws.send_json({'type':'authenticated','playerId':pid})
                await ws.send_json(self.public()) # snapshot includes World art for new clients
                await self.broadcast()
            async for msg in ws:
                if msg.type!=WSMsgType.TEXT:continue
                try:body=json.loads(msg.data)
                except:await ws.send_json({'type':'error','error':'Invalid JSON'});continue
                async with self.lock:
                    with self.db:
                        result=await self.action(pid,body)
                    if result.get('ok'):await self.broadcast()
                    else:await ws.send_json({'type':'error','error':result.get('error','Rejected')})
        except (ValueError,asyncio.TimeoutError) as exc:
            await ws.send_json({'type':'error','error':str(exc)})
        finally:
            async with self.lock:
                if pid and self.clients.get(pid) is ws:
                    del self.clients[pid];await self.broadcast()
        return ws

async def side_animation_tick(app):
    host=app['host']
    try:
        while True:
            await asyncio.sleep(0.055)
            if not host.clients:continue
            clock=now()
            live={r['id'] for r in host.db.execute("SELECT id FROM players WHERE mode='sideview'")}
            pending=any(pid in live and (clock-at<SIDE_JUMP_SECONDS) for pid,at in host.side_jumps.items())
            pending|=any(pid in live and clock<act[1] for pid,act in host.side_actions.items())
            if pending:
                async with host.lock:await host.broadcast()
    except asyncio.CancelledError:pass

async def begin_side_tick(app):
    app['side_tick_task']=asyncio.create_task(side_animation_tick(app))
async def end_side_tick(app):
    app['side_tick_task'].cancel()
    try:await app['side_tick_task']
    except asyncio.CancelledError:pass

def create_app(db,admin,experimental_encounters=False):
    host=Host(db,admin,experimental_encounters=experimental_encounters)
    # Startup gate: fail closed if keccak unavailable. No SHA3 substitution.
    if keccak256(b'').hex()!='c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470':raise RuntimeError('Keccak provider self-test failed')
    app=web.Application(middlewares=[cors],client_max_size=2000000)
    app['host']=host
    app.on_startup.append(begin_side_tick);app.on_cleanup.append(end_side_tick)
    app.router.add_get('/',lambda r:web.FileResponse(ROOT/'client.html'))
    app.router.add_get('/client.js',lambda r:web.FileResponse(ROOT/'client.js'))
    app.router.add_get('/render-world.js',lambda r:web.FileResponse(ROOT/'render-world.js'))
    app.router.add_get('/api/health',lambda r:web.json_response({'ok':True,'host':'localhost','hasWorld':host.world is not None,'protocol':13,'maxRoomWidthPx':2048,'wallet':'EOA personal_sign','public':False}))
    app.router.add_post('/api/admin/world',host.load_world)
    app.router.add_post('/api/admin/patch',host.patch_world)
    app.router.add_post('/api/admin/stage-frame',host.upload_stage_frame)
    app.router.add_post('/api/admin/native-scene-art',host.upload_native_art)
    app.router.add_post('/api/admin/player-poses',host.upload_player_poses)
    app.router.add_get('/api/player-poses',host.get_player_poses)
    app.router.add_post('/api/admin/native-rooms',host.upload_native_rooms)
    app.router.add_get('/api/native-rooms',host.get_native_room)
    app.router.add_get('/api/stage-frame',host.get_stage_frame)
    app.router.add_get('/api/admin/state',host.admin_state)
    app.router.add_post('/api/admin/command',host.admin_command)
    app.router.add_post('/api/auth/challenge',host.challenge)
    app.router.add_post('/api/auth/verify',host.login)
    app.router.add_get('/api/me',host.me)
    app.router.add_get('/api/state',host.state)
    app.router.add_get('/ws',host.websocket)
    return app

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--db',default=str(ROOT/'localhost-world.db'))
    parser.add_argument('--admin-token',default=os.environ.get('NES_FORGE_LOCAL_ADMIN_TOKEN'))
    parser.add_argument('--simulate-encounters',action='store_true',help='UNVERIFIED experimental placeholder encounter simulator; disabled by default')
    args=parser.parse_args();token=args.admin_token or secrets.token_urlsafe(30)
    print('NES FORGE LOCALHOST HOST v0.17 (EXPERIMENTAL POC ONLY)')
    print(f'Player URL: http://{DOMAIN}/')
    print('Hosted room protocol: 13 · full source scene raster up to 2048x240 · native gameplay NOT recovered')
    print(f'WORLD Live admin token: {token}')
    print('Unverified placeholder encounters: '+('OPTED IN (NOT Z2 GAMEPLAY)' if args.simulate_encounters else 'OFF (fidelity-safe default)'))
    print('Localhost only. NO production, LAN or public hosting. Ctrl+C stops it.',flush=True)
    web.run_app(create_app(args.db,token,experimental_encounters=args.simulate_encounters),host='127.0.0.1',port=8765,access_log=None,print=lambda *_:None)
