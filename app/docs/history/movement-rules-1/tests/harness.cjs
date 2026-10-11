'use strict';
// Executes the complete release script without rewriting application functions.
// This tiny DOM supports data/command regression tests; it does not model layout,
// canvas pixels, real user activation, IndexedDB, or browser download dialogs.
const fs = require('node:fs');
const vm = require('node:vm');

function loadForge(htmlPath, {strictMissingIds = [], environment = {}} = {}) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const elements = new Map();
  const errors = [];
  const events = new Map();
  let objectURLs = 0, downloadClicks = 0;
  const noop = () => {};
  function element(tag = 'div') {
    const classes = new Set();
    const el = {
      tagName: tag.toUpperCase(), style: {setProperty: noop, removeProperty: noop}, dataset: {}, children: [],
      value: '', checked: false, disabled: false, width: 512, height: 480, clientWidth: 1024, clientHeight: 768,
      textContent: '', className: '', listeners: new Map(),
      classList: {add: (...xs) => xs.forEach(x => classes.add(x)), remove: (...xs) => xs.forEach(x => classes.delete(x)),
        contains: x => classes.has(x), toggle: (x, force) => { const yes = force ?? !classes.has(x); yes ? classes.add(x) : classes.delete(x); return yes; }},
      addEventListener(type, fn) { const xs = this.listeners.get(type) || []; xs.push(fn); this.listeners.set(type, xs); },
      removeEventListener: noop,
      dispatchEvent(e) { e.target ||= this; e.currentTarget = this; for (const fn of this.listeners.get(e.type) || []) fn(e); return true; },
      appendChild(child) { return this.insertBefore(child,null); },
      append(...xs) { xs.forEach(x => this.appendChild(x)); }, prepend(...xs) { const ref=this.children[0]||null; xs.forEach(x => this.insertBefore(x,ref)); },
      insertBefore(child,ref=null) { if(child===ref)return child; const old=child.parentNode?.children,index=old?.indexOf(child); if(index>=0)old.splice(index,1); const at=ref===null?this.children.length:this.children.indexOf(ref); /* Static markup is not fully parsed; preserve the old fallback for unknown refs. */ this.children.splice(at<0?this.children.length:at,0,child); child.parentElement=child.parentNode=this; return child; }, before: noop, after: noop, remove: noop,
      replaceChildren(...xs) { this.children = []; this.append(...xs); },
      insertAdjacentHTML(position, html) { this._html = (this._html || '') + html; },
      setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this[k] ?? null; }, removeAttribute(k) { delete this[k]; },
      querySelector(selector) { return query(selector); }, querySelectorAll() { return []; },
      closest: () => null, focus: noop, blur: noop, select: noop, scrollIntoView: noop,
      getBoundingClientRect() { return {left: 0, top: 0, width: this.width, height: this.height, right: this.width, bottom: this.height}; },
      click() { if (this.tagName === 'A') downloadClicks++; this.onclick?.({target: this, currentTarget: this, preventDefault: noop, stopPropagation: noop}); this.dispatchEvent({type: 'click'}); },
      getContext() { return canvas; }, toDataURL: () => 'data:image/png;base64,',
      setPointerCapture: noop, releasePointerCapture: noop,
    };
    Object.defineProperty(el, 'id', {get() { return this._id; }, set(id) { this._id = id; elements.set(id, this); }});
    Object.defineProperty(el, 'innerHTML', {get() { return this._html || ''; }, set(value) { this._html = String(value); this.children = []; }});
    Object.defineProperty(el, 'options', {get() { return this.children; }});
    Object.defineProperty(el, 'firstChild', {get() { return this.children[0] || null; }});
    return el;
  }
  const canvas = new Proxy({
    createImageData: (w, h) => ({width: w, height: h, data: new Uint8ClampedArray(w * h * 4)}),
    getImageData: (x, y, w, h) => ({width: w, height: h, data: new Uint8ClampedArray(w * h * 4)}),
    measureText: text => ({width: String(text).length * 6}),
    createLinearGradient: () => ({addColorStop: noop}),
  }, {get: (o, key) => key in o ? o[key] : noop});
  // Optional realistic absence for controls that the application creates on
  // demand after checking getElementById. The default legacy stub is unchanged.
  const strictMissing = new Set(strictMissingIds);
  const get = id => { if (!elements.has(id)) { if(strictMissing.has(id))return null; const e = element(); e.id = id; } return elements.get(id); };
  const query = selector => selector.startsWith('#') ? get(selector.slice(1).split(/[ .>[:]/)[0]) : get('selector:' + selector);
  const document = {body: element('body'), head: element('head'), documentElement: element('html'), title: '',
    getElementById: get, querySelector: query, querySelectorAll: () => [],
    createElement: element, createTextNode: s => ({textContent: s}),
    addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
  };
  for (const match of html.matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"[^>]*>/gi)) {
    const el = element(match[1]); el.id = match[2]; el.parentElement = el.parentNode = document.body;
    const value = match[0].match(/\bvalue="([^"]*)"/); if (value) el.value = value[1];
    for (const prop of ['width', 'height']) { const m = match[0].match(new RegExp(prop + '="(\\d+)"')); if (m) el[prop] = +m[1]; }
    el.checked = /\bchecked\b/.test(match[0]);
  }
  const store = new Map();
  class TestURL extends URL {}
  TestURL.createObjectURL = () => { objectURLs++; return 'blob:test'; }; TestURL.revokeObjectURL = noop;
  const context = {
    document, console: {log: noop, warn: noop, error: (...args) => errors.push(args.map(x => x?.message || String(x)).join(' '))},
    URL: TestURL, URLSearchParams, TextEncoder, TextDecoder, Blob, Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array,
    Int8Array, Int16Array, Int32Array, Float32Array, Float64Array, ArrayBuffer, DataView,
    atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64'),
    location: {href: 'https://forge.test/', hash: '', protocol: 'https:', origin: 'https://forge.test'},
    navigator: {userAgent: 'Node regression harness', platform: 'test', clipboard: {writeText: async () => {}}},
    localStorage: {getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,String(v)), removeItem: k => store.delete(k)},
    setTimeout: () => 1, clearTimeout: noop, setInterval: () => 1, clearInterval: noop,
    requestAnimationFrame: () => 1, cancelAnimationFrame: noop, performance: {now: () => 0},
    confirm: () => true, prompt: () => null, alert: noop,
    addEventListener(type, fn) { const xs = events.get(type) || []; xs.push(fn); events.set(type, xs); },
    removeEventListener: noop, dispatchEvent(e) { for (const fn of events.get(e.type) || []) fn(e); },
    innerWidth: 1280, innerHeight: 900, devicePixelRatio: 1, isSecureContext: true,
    CustomEvent: class { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    Image: class {},
    ImageData: class { constructor(data, width, height) { this.data = data; this.width = width; this.height = height || data.length / (4 * width); } },
    ResizeObserver: class { observe() {} disconnect() {} },
    getComputedStyle: () => ({getPropertyValue: () => '', display: 'block'}),
    open: () => null,
  };
  Object.assign(context, environment);
  context.window = context.self = context.top = context.parent = context;
  vm.createContext(context);
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  if (!scripts.length) throw new Error('No inline application script found');
  for (let i = 0; i < scripts.length; i++) vm.runInContext(scripts[i], context, {filename: `${htmlPath}:script${i}`, timeout: 10000});
  const run = (source, timeout = 2000) => vm.runInContext(source, context, {filename: 'regression-command.js', timeout});
  return {context, run, get, errors, scripts, html, storage: store, metrics: () => ({objectURLs, downloadClicks}),
    state: () => run('S'), json: source => JSON.parse(run('JSON.stringify(' + source + ')'))};
}
module.exports = {loadForge};
