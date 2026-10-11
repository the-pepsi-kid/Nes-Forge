#!/usr/bin/env python3
"""Reproduce the unmodified pinned DABG ROM offline; needs Python 3, C compiler, make."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parent
PINS = {
    'DABG-pinned-source.tar.gz': '745613df912935dd2a0ffad403e2065e8b2d52afe5fecbeacd904e6cfb77f81d',
    'cc65-2.19-pinned-source.tar.gz': '31c969fb9d6727ddf9ba0ec19d0300188bb0c96dd762f3f354b82b1c157febc4',
}
EXPECTED_ROM = 'eca79b9d0b546e96c1bc73099e239539fb9c7773ff10a431bb3a9cd6763208ca'

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def extract(archive, destination):
    if sha256(archive) != PINS[archive.name]:
        raise ValueError('Archive checksum mismatch: ' + archive.name)
    destination.mkdir()
    with tarfile.open(archive, 'r:gz') as tf:
        prefix = PurePosixPath(tf.getmembers()[0].name)
        for member in tf.getmembers():
            relative = PurePosixPath(member.name).relative_to(prefix)
            if not relative.parts:
                continue
            if relative.is_absolute() or '..' in relative.parts or member.issym() or member.islnk():
                raise ValueError('Unsafe archive member: ' + member.name)
            target = destination.joinpath(*relative.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            elif member.isfile():
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(tf.extractfile(member).read())
                target.chmod(member.mode & 0o777)
            else:
                raise ValueError('Unsupported archive member: ' + member.name)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work', type=Path, required=True, help='New empty work directory; never overwrite an existing directory')
    parser.add_argument('--jobs', type=int, default=4)
    args = parser.parse_args()
    if args.jobs < 1 or args.jobs > 64:
        parser.error('--jobs must be between 1 and 64')
    work = args.work.resolve()
    work.mkdir(parents=True, exist_ok=False)
    extract(ROOT / 'upstream/DABG-pinned-source.tar.gz', work / 'DABG')
    extract(ROOT / 'upstream/cc65-2.19-pinned-source.tar.gz', work / 'cc65')
    source_inventory = json.loads((ROOT / 'metadata/Source_Files.json').read_text())['files']
    for item in source_inventory:
        path = work / 'DABG' / item['path']
        if path.stat().st_size != item['byteLength'] or sha256(path) != item['sha256']:
            raise ValueError('Source inventory mismatch: ' + item['path'])
    commands = [
        (['make', '-j' + str(args.jobs), 'ca65', 'ld65'], work / 'cc65'),
        ([str(work / 'cc65/bin/ca65'), 'dabg.s', '-o', '../build/dabg.o', '-l', '../build/dabg.lst', '-g'], work / 'DABG'),
        ([str(work / 'cc65/bin/ld65'), '-C', 'nrom256.x', '../build/dabg.o', '-o', '../build/dabg.nes', '-m', '../build/dabg.map', '-Ln', '../build/dabg.lbl', '--dbgfile', '../build/dabg.dbg'], work / 'DABG'),
    ]
    (work / 'build').mkdir()
    with (work / 'build.log').open('w') as log:
        for command, cwd in commands:
            log.write(json.dumps({'cwd': str(cwd), 'argv': command}) + '\n')
            log.flush()
            subprocess.run(command, cwd=cwd, stdout=log, stderr=subprocess.STDOUT, check=True)
    actual = sha256(work / 'build/dabg.nes')
    if actual != EXPECTED_ROM:
        raise ValueError('ROM reproduction mismatch: ' + actual)
    receipt = {
        'format': 'NESForgeIndependentSourceReproduction', 'version': 1,
        'sourceCommit': '5ecc60b6af3f726851bfeb1c2555388c5953e0c0',
        'toolchainCommit': '555282497c3ecf8b313d87d5973093af19c35bd5',
        'sourceFilesVerified': len(source_inventory),
        'romByteLength': (work / 'build/dabg.nes').stat().st_size,
        'romSha256': actual, 'expectedRomSha256': EXPECTED_ROM,
        'sourceModified': False, 'romMatch': True,
    }
    (work / 'Reproduction.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))

if __name__ == '__main__':
    main()
