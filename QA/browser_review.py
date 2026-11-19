"""Exercise the shipped editor through the hosted editor URL in a real Chromium engine."""
import argparse
import hashlib
import json
import os
import secrets
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'tools'))
from release_identity import release_name
RELEASE_NAME = release_name()
URL = 'http://127.0.0.1:8765'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
report = {'editorSha256': hashlib.sha256((ROOT/'NES_Forge.html').read_bytes()).hexdigest(), 'profiles': []}
try:
    with tempfile.TemporaryDirectory() as folder:
        host = subprocess.Popen([sys.executable, str(ROOT/'host/server.py'), '--db', str(Path(folder)/'review.sqlite'),
                                 '--admin-token', secrets.token_hex(24)], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        try:
            for _ in range(60):
                if host.poll() is not None:
                    raise RuntimeError('The review host could not start. Port 8765 must be available.')
                try:
                    with urlopen(URL+'/editor', timeout=2) as response:
                        digest = hashlib.sha256(response.read()).hexdigest()
                    assert digest == report['editorSha256'], 'Host delivered a different editor.'
                    break
                except OSError:
                    time.sleep(.1)
            else:
                raise RuntimeError('The local review host did not respond.')
            report['hostServesIdenticalEditor'] = True
            with sync_playwright() as playwright:
                options = {'headless': True}
                if os.getenv('CHROMIUM_PATH'):
                    options['executable_path'] = os.environ['CHROMIUM_PATH']
                browser = playwright.chromium.launch(**options)
                report['chromium'] = browser.version
                for width, height in [(1440, 900), (390, 844)]:
                    context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=width < 600, accept_downloads=True)
                    page = context.new_page()
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('dialog', lambda dialog: dialog.accept())
                    page.set_default_timeout(10000)
                    page.goto(URL+'/editor', wait_until='load')
                    assert RELEASE_NAME in page.title(), page.title()
                    page.locator('#projectGatewayFile').set_input_files(ROOT/'Examples'/'Teapot418.nesforge.json')
                    page.locator('#projectGateway-project').click()
                    assert page.evaluate('Forge.services.ProjectStore.capture().projectName').lower().find('teapot') >= 0
                    page.locator('button.tab[data-view="code"]').click()
                    page.locator('button[onclick="buildAndRun()"]').click()
                    page.wait_for_function('emu.loaded && emu.frameCount > 1')
                    assert page.locator('#emuCanvas').is_visible()
                    page.screenshot()
                    page.locator('#projectLessonsOpen').click()
                    page.locator('#projectLessonChapter').select_option('first-game')
                    assert page.locator('#projectLessonBody h2').count() >= 9
                    assert not errors, errors
                    report['profiles'].append({'width':width, 'height':height, 'touchEmulation':width < 600,
                                               'openBuildAndRun':True,'firstGameLesson':True,'uncaughtErrors':errors})
                    context.close()
                browser.close()
                report['passed'] = True
        finally:
            host.terminate()
            host.communicate(timeout=10)
except Exception as error:
    report['passed'] = False
    details = str(error).splitlines()
    report['error'] = type(error).__name__+' '+(details[0] if details else 'Browser interaction failed.')
    report['diagnostics'] = list(dict.fromkeys(
        line.strip() for line in details if len(line)<700 and any(phrase in line.lower() for phrase in
        ('operation not permitted','permission denied','fatal:','process did exit',"executable doesn't exist"))
    ))[:5]
if args.output:
    args.output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
sys.exit(0 if report['passed'] else 1)
