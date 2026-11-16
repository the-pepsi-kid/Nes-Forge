'use strict';
const fs=require('node:fs');
const {JSDOM,VirtualConsole}=require('jsdom');
const noop=()=>{};
function load(file, url = 'https://forge.test/', storedAppearance = false) {
  const errors = [], consoleErrors = [], domErrors = [], downloads = []; const blobs=new Map();
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
      window.setTimeout = (callback, delay, ...args) => Number(delay || 0) === 0 ? setImmediate(callback, ...args) : 1; window.setInterval = () => 1;
      window.Blob=Blob; window.Response=Response; window.DecompressionStream=DecompressionStream;
      window.URL.createObjectURL = blob => { const key='blob:qa/'+(blobs.size+1); blobs.set(key,blob);return key; };
      window.URL.revokeObjectURL = key => blobs.delete(key);
      window.HTMLAnchorElement.prototype.click=function(){if(this.download)downloads.push({name:this.download,blob:blobs.get(this.href)});};
      window.TextEncoder = class extends TextEncoder {
        encode(value) { return window.Uint8Array.from(super.encode(value)); }
      };
      window.TextDecoder = TextDecoder;
      Object.defineProperty(window.crypto, 'subtle', {value: require('node:crypto').webcrypto.subtle});
      window.ImageData = class ImageData {
        constructor(data, width, height) {
          if (typeof data === 'number') {
            this.width = data; this.height = width; this.data = new window.Uint8ClampedArray(data * width * 4);
          } else { this.data = data; this.width = width; this.height = height ?? data.length / (width * 4); }
        }
      };
      window.alert = noop; window.confirm = () => true;
      if (storedAppearance) {
        window.localStorage.setItem('nesforge.appearance.skin', 'on');
        window.localStorage.setItem('nesforge.appearance.density', 'comfortable');
      }
    }});
  return {dom, window: dom.window, document: dom.window.document, errors, consoleErrors, domErrors, downloads};
}

module.exports={load};
