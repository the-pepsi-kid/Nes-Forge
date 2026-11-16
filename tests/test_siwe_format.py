import asyncio, json, re, secrets, sys, tempfile
from pathlib import Path
from aiohttp import ClientSession

ROOT=Path(__file__).resolve().parents[1]
HOST=ROOT/'host'
ADDRESS='0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'

async def wait_health(session):
    for _ in range(80):
        try:
            async with session.get('http://127.0.0.1:8765/api/health') as r:
                if r.status == 200: return
        except Exception:
            pass
        await asyncio.sleep(.05)
    raise RuntimeError('host did not start')

async def main():
    with tempfile.TemporaryDirectory() as d:
        proc=await asyncio.create_subprocess_exec(sys.executable,str(HOST/'server.py'),'--db',str(Path(d)/'siwe.sqlite3'),'--admin-token','test-'+secrets.token_hex(24),stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT)
        try:
            async with ClientSession() as s:
                await wait_health(s)
                for origin, authority in [('http://127.0.0.1:8765','127.0.0.1:8765'),('http://localhost:8765','localhost:8765')]:
                    async with s.post('http://127.0.0.1:8765/api/auth/challenge',headers={'Origin':origin},json={'address':ADDRESS,'chainId':1}) as r:
                        assert r.status == 200, await r.text()
                        ch=await r.json()
                    m=ch['message']; lines=m.splitlines()
                    assert lines[0] == f'{authority} wants you to sign in with your Ethereum account:', lines[0]
                    assert not lines[0].startswith('http://') and not lines[0].startswith('https://')
                    assert lines[1] == ADDRESS
                    assert lines[2] == ''
                    assert lines[3] == 'NES Forge local hosted-world player authentication. No transaction or payment.'
                    assert lines[4] == ''
                    assert lines[5] == f'URI: http://{authority}/'
                    assert lines[6] == 'Version: 1'
                    assert lines[7] == 'Chain ID: 1'
                    assert re.fullmatch(r'Nonce: [A-Za-z0-9]{8,}',lines[8]), lines[8]
                    assert re.fullmatch(r'Issued At: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ',lines[9]), lines[9]
                    assert re.fullmatch(r'Expiration Time: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ',lines[10]), lines[10]
                    assert ch['address']==ADDRESS
                print('SIWE challenge format valid for 127.0.0.1 and localhost origins')
        finally:
            proc.terminate()
            await proc.wait()

asyncio.run(main())
