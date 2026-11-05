#!/usr/bin/env python3
"""Read-only requirements check for the NES Forge localhost proof of concept."""
import importlib.util, os, platform, socket, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
checks=[]
def check(title,fn):
    try:detail=fn();checks.append((True,title,str(detail)))
    except Exception as e:checks.append((False,title,str(e)))
check('Python >=3.11',lambda: platform.python_version() if sys.version_info >=(3,11) else (_ for _ in ()).throw(RuntimeError('Python 3.11 or newer required')))
check('aiohttp installed',lambda: importlib.util.find_spec('aiohttp') or (_ for _ in ()).throw(RuntimeError('Run: python -m pip install aiohttp')))
def crypto():
    from eth_verify import keccak256
    got=keccak256(b'').hex()
    assert got=='c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470','Ethereum Keccak provider not available'
    return 'Ethereum Keccak-256 self-test passed'
check('Ethereum wallet signature dependency',crypto)
def port():
    s=socket.socket()
    try:s.bind(('127.0.0.1',8765));return 'Available for local host'
    except OSError:return 'Port 8765 already in use; if the host is running, that is normal'
    finally:s.close()
check('Localhost port',port)
print('NES Forge 3.x — Localhost Setup Check\n')
for ok,name,detail in checks:print(('PASS' if ok else 'FAIL')+' · '+name+' — '+detail)
print('\nRuns only on your machine; no wallet data, internet connection or ROM required.')
sys.exit(0 if all(ok for ok,_,_ in checks) else 1)
