'use strict';
const fs=require('fs'),{JSDOM,VirtualConsole}=require('jsdom');const noop=()=>{};
function load(file, url = 'https://forge.test/', storedAppearance = false) {
  const errors = [], consoleErrors = [], domErrors = [];
  const canvas = new Proxy({createImageData: (w, h) => ({width: w, height: h, data: new Uint8ClampedArray(w * h * 4)}),
    getImageData: (x, y, w, h) => ({width: w, height: h, data: new Uint8ClampedArray(w * h * 4)}),
    measureText: value => ({width: String(value).length * 6}), createLinearGradient: () => ({addColorStop: noop})},
  {get: (object, key) => key in object ? object[key] : noop});
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', (...values) => consoleErrors.push(values.join(' ')));
  virtualConsole.on('jsdomError', error => domErrors.push({type: error.type, message: error.message}));
  const dom = new JSDOM(fs.readFileSync(file, 'utf8'), {url, runScripts: 'dangerously', virtualConsole,
    beforeParse(window) {
      window.addEventListener('error', event => errors.push({name: event.error?.name, message: event.message}));
      window.HTMLCanvasElement.prototype.getContext = () => canvas;
      window.HTMLCanvasElement.prototype.toDataURL = () => '';
      window.ResizeObserver = class {observe() {} disconnect() {}};
      window.requestAnimationFrame = () => 1; window.cancelAnimationFrame = noop;
      window.setInterval = () => 1;
      window.URL.createObjectURL = () => '';
      // Browser TextEncoder returns a typed array from the browser realm. A
      // direct Node encoder would incorrectly trip the app's strict byte guard.
      window.TextEncoder = class extends TextEncoder {encode(text) {return window.Uint8Array.from(super.encode(text));}};
      window.TextDecoder = TextDecoder;
      window.alert = noop; window.confirm = () => true; window.HTMLElement.prototype.scrollIntoView=noop;
      Object.defineProperty(window,'crypto',{value:require('crypto').webcrypto});
      window.HTMLCanvasElement.prototype.setPointerCapture=noop;window.HTMLCanvasElement.prototype.releasePointerCapture=noop;
      if (storedAppearance) {
        window.localStorage.setItem('nesforge.appearance.skin', 'on');
        window.localStorage.setItem('nesforge.appearance.density', 'comfortable');
      }
    }});
  return {dom, window: dom.window, document: dom.window.document, errors, consoleErrors, domErrors};
}
module.exports={load};
