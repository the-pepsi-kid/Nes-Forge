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


def resolve_chromium():
    """The Chromium every browser suite uses, as QA/verify.py resolves it: CHROMIUM_PATH when it names a file, otherwise
    Node Playwright's browser (Python Playwright may expect a build that is not installed). None: Playwright's own."""
    explicit = os.environ.get('CHROMIUM_PATH')
    if explicit and Path(explicit).is_file():
        return explicit
    env = dict(os.environ)
    env['NODE_PATH'] = os.pathsep.join(filter(None, [str(ROOT / 'QA' / 'node_modules'), env.get('NODE_PATH')]))
    try:
        found = subprocess.run(['node', '-e', "process.stdout.write(require('playwright').chromium.executablePath())"], cwd=ROOT, env=env,
                               capture_output=True, text=True, timeout=60).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None
    return found if found and Path(found).is_file() else None
sys.path.insert(0, str(ROOT/'tools'))
from release_identity import release_name
RELEASE_NAME = release_name()
URL = 'http://127.0.0.1:8765'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
report = {'editorSha256': hashlib.sha256((ROOT/'NES_Forge.html').read_bytes()).hexdigest(), 'profiles': []}
# Every action is a named step with its time. A step that fails records what the page looked like: the target's
# matches, geometry, styles and enabled state, the element actually under the click point (an overlay shows here),
# the viewport, scroll, active tab, recovery and dialog state, and a screenshot. Timeouts are not raised to hide one.
TIMEOUT_MS = 10000
CURRENT = {}
STATE_JS = """sel => { const out = {viewport: {w: innerWidth, h: innerHeight}, scroll: {x: scrollX, y: scrollY}, readyState: document.readyState,
  tab: window.S?.tab ?? null, recoveryPhase: window.Forge?.services?.ProjectStore?.state?.recoveryPhase ?? null,
  autosaveBanner: !!document.querySelector('#autosaveBanner.show'), resourcesOpen: !!document.querySelector('.frx-visible'),
  activeElement: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null,
  gatewayStatus: document.getElementById('projectGatewayStatus')?.textContent?.slice(0, 160) ?? null};
  if (!sel) return out;
  const els = [...document.querySelectorAll(sel)], el = els[0]; out.matches = els.length;
  if (el) { const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    out.target = {id: el.id, tag: el.tagName, text: (el.textContent || '').trim().slice(0, 80), disabled: !!el.disabled, hidden: !!el.hidden,
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity, pointerEvents: cs.pointerEvents,
      rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}, inViewport: r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth};
    const x = Math.min(Math.max(r.x + r.width / 2, 0), innerWidth - 1), y = Math.min(Math.max(r.y + r.height / 2, 0), innerHeight - 1), top = document.elementFromPoint(x, y);
    out.atClickPoint = top ? {tag: top.tagName, id: top.id, cls: String(top.className).slice(0, 80), isTarget: el === top || el.contains(top), text: (top.textContent || '').trim().slice(0, 60)} : null; }
  return out; }"""
class StepFailure(Exception):
    pass
def step(label, selector, action):
    page, profile = CURRENT['page'], CURRENT['profile']
    started = time.monotonic()
    try:
        result = action()
    except Exception as error:
        elapsed = round((time.monotonic() - started) * 1000)
        try:
            state = page.evaluate(STATE_JS, selector)
        except Exception as state_error:
            state = {'unavailable': str(state_error)[:200]}
        shot = None
        if args.output:
            shot = args.output.with_name(args.output.stem + '-failure-%dpx.png' % profile['width'])
            try:
                page.screenshot(path=str(shot))
            except Exception:
                shot = None
        report['failure'] = {'profile': '%dx%d%s' % (profile['width'], profile['height'], ' touch' if profile['touchEmulation'] else ''),
                             'step': label, 'selector': selector, 'elapsedMs': elapsed, 'timeoutMs': TIMEOUT_MS,
                             'error': str(error).splitlines()[0][:300], 'state': state, 'screenshot': str(shot) if shot else None,
                             'stepsBefore': list(profile['steps']), 'console': CURRENT['console'][-8:], 'pageErrors': CURRENT['errors'][-5:]}
        raise StepFailure('%s (%s) failed after %d ms: %s' % (label, selector, elapsed, str(error).splitlines()[0][:200])) from error
    profile['steps'].append({'step': label, 'selector': selector, 'ms': round((time.monotonic() - started) * 1000)})
    return result
def click(label, selector, first=False):
    page = CURRENT['page']
    return step(label, selector, lambda: (page.locator(selector).first if first else page.locator(selector)).click())
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
                # Chromium's own headless WebGL is used. Forcing ANGLE's SwiftShader backend
                # (--use-angle=swiftshader) costs a one-time ~7 s stall on a page's first GPU frame (measured on this
                # and earlier builds), which landed inside timed clicks. It is the fallback only when the default
                # launch has no WebGL, and then that first frame is waited for as its own measured step.
                options = {'headless': True}
                chromium_path = resolve_chromium()
                if chromium_path:
                    options['executable_path'] = chromium_path
                browser = playwright.chromium.launch(**options)
                probe = browser.new_page()
                renderer = probe.evaluate("(() => { const g = document.createElement('canvas').getContext('webgl'); if (!g) return null; const d = g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'webgl'; })()")
                probe.close()
                report['gpu'] = {'launch': 'default', 'renderer': renderer}
                if renderer is None:
                    browser.close()
                    options['args'] = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
                    browser = playwright.chromium.launch(**options)
                    report['gpu'] = {'launch': 'forced SwiftShader (default launch had no WebGL)', 'renderer': 'SwiftShader', 'firstFrameWarmupMs': []}
                report['chromium'] = browser.version
                for width, height in [(1440, 900), (390, 844)]:
                    context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=width < 600, accept_downloads=True)
                    page = context.new_page()
                    errors, console = [], []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('console', lambda m: console.append((m.type + ': ' + m.text)[:300]) if m.type in ('error', 'warning') else None)
                    page.on('dialog', lambda dialog: dialog.accept())
                    page.set_default_timeout(TIMEOUT_MS)
                    steps = []
                    profile = {'width': width, 'height': height, 'touchEmulation': width < 600, 'steps': steps}
                    CURRENT.update(page=page, profile=profile, console=console, errors=errors)
                    step('open the editor', None, lambda: page.goto(URL+'/editor', wait_until='load'))
                    if 'firstFrameWarmupMs' in report['gpu']:
                        warm = time.monotonic()
                        page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))')
                        report['gpu']['firstFrameWarmupMs'].append(round((time.monotonic() - warm) * 1000))
                    assert RELEASE_NAME in page.title(), page.title()
                    step('choose the example project', '#projectGatewayFile', lambda: page.locator('#projectGatewayFile').set_input_files(ROOT/'Examples'/'Teapot418.nesforge.json'))
                    click('open the project from the intake', '#projectGateway-project')
                    assert page.evaluate('Forge.services.ProjectStore.capture().projectName').lower().find('teapot') >= 0
                    click('CODE tab', 'button.tab[data-view="code"]')
                    # Studio layout: Play builds and runs the edited project.
                    click('Play mode', '#studioMode-play')
                    step('the built game runs', None, lambda: page.wait_for_function('emu.loaded && emu.frameCount > 1'))
                    assert page.locator('#emuCanvas').is_visible()
                    page.screenshot()
                    # Library lists every resource with an editability badge, from Forge.commands.
                    click('Library mode', '#studioMode-library')
                    step('library items listed', '.sp-item .lv', lambda: page.wait_for_selector('.sp-item .lv'))
                    assert page.locator('.sp-item').count() >= 5
                    click('first library item', '.sp-item', first=True)
                    step('library item details', '.sp-detail h2', lambda: page.wait_for_selector('.sp-detail h2'))
                    click('Build mode', '#studioMode-build')
                    step('build card', '.bd-card', lambda: page.wait_for_selector('.bd-card'))
                    assert page.locator('.bd-ok').count() == 1, 'authored example must build'
                    # Alt+2 returns to Edit. The studio bar sits above every original control, none hidden: skins, the
                    # Resource Explorer, recovered content, the area library, project investigation, the intake entry,
                    # the working-context ribbon and the coloured build buttons.
                    step('Alt+2 returns to Edit', None, lambda: page.keyboard.press('Alt+2'))
                    for selector in ['#projectGatewayOpen', '#frx-open', '#nf-skin-select', '#nf-skin-import', '#punchOutContentOpen',
                                     '#areaLibraryOpen', '#investigationOpen', '#fcw-ribbon', '.ctl>button[onclick="buildAndRun()"]']:
                        assert page.locator(selector).first.is_visible(), selector + ' is hidden in the studio layout'
                    click('open Resources', '#frx-open', first=True)
                    step('Resources visible', '#frx-app', lambda: page.wait_for_selector('#frx-app', state='visible'))
                    click('close Resources', '#frx-close')
                    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), 'horizontal page scroll'
                    # Spatial (VR/AR) adapter: desktop preview renders the game and every World/Scene as floating screens.
                    click('open the spatial preview', '#studioSpatial')
                    step('spatial canvas', '#spatialCanvas', lambda: page.wait_for_selector('#spatialCanvas'))
                    spatial = page.evaluate("Forge.commands.run('spatial.info')")
                    assert spatial['ok'] and spatial['result']['open'] and spatial['result']['screens'] >= 2, spatial
                    shot = page.evaluate("Forge.commands.run('spatial.capture')")
                    assert shot['ok'] and len(shot['result']['png']) > 2000, 'spatial preview did not render'
                    click('close the spatial preview', '#spatialClose')
                    assert page.locator('#spatialOverlay').count() == 0
                    click('Learn', '#studioLearn')
                    step('choose the first-game lesson', '#projectLessonChapter', lambda: page.locator('#projectLessonChapter').select_option('first-game'))
                    assert page.locator('#projectLessonBody h2').count() >= 9
                    assert not errors, errors
                    profile.update({'openBuildAndRun':True,'library':True,'buildPanel':True,'originalControls':True,'spatialPreview':True,
                                    'firstGameLesson':True,'uncaughtErrors':errors})
                    report['profiles'].append(profile)
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
