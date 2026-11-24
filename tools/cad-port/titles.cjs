'use strict';
// Folder -> CadEditor's own game title (cad_editor_supported_games.txt), by tokens, initials and trailing numbers.
const fs = require('node:fs'), path = require('node:path');
const ROMAN = {ii: '2', iii: '3', iv: '4', v: '5', vi: '6'};
const norm = s => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).map(w => ROMAN[w] || w).filter(w => w && !['the', 'of', 'and', 'a', 'unl', 'unlicensed', 'fds', 'prototype', 'j', 'u', 'e'].includes(w));
function parseList(file) {
  const out = [];
  // NES sections only: the list continues with Sega Mega Drive, Game Boy and GBA titles
  for (const line of fs.readFileSync(file, 'utf8').split(/\n(?=----Screens\/blocks editor \(Sega)/)[0].split('\n')) { const m = /^\s{4}(\S.*?)\s{2,}\((.*)\)\s*$/.exec(line) || /^\s{4}(\S.*?)\s*$/.exec(line); if (m && !/^-/.test(m[1])) out.push({title: m[1].trim(), note: (m[2] || '').trim()}); }
  return out;
}
function splitFolder(f) { const m = /^(.*?)(\d+)?$/.exec(f.replace(/_/g, ' ')); return {words: norm(m[1]), number: m[2] || null}; }
function match(folder, list) {
  const {words, number} = splitFolder(folder), full = norm(folder.replace(/_/g, ' '));
  let best = null;
  for (const e of list) {
    const t = norm(e.title), num = t.filter(w => /^\d+$/.test(w)), tw = t.filter(w => !/^\d+$/.test(w));
    const wantNum = number || full.filter(w => /^\d+$/.test(w)).pop() || null;
    if ((num[0] || null) !== wantNum) continue;
    const fw = words.filter(w => !/^\d+$/.test(w));
    const initials = tw.map(w => w[0]).join('');
    let score = 0;
    const sing = w => w.replace(/s$/, '');
    if (fw.length === 1 && fw[0] === initials && initials.length >= 3) score = 3;
    else if (fw.join('') === tw.join('') || fw.map(sing).join('') === tw.map(sing).join('')) score = 3.5;
    else if (fw.join(' ') === tw.join(' ')) score = 4;
    else { const common = fw.filter(w => tw.includes(w)).length; if (common === fw.length && common > 0) score = 2 + common / Math.max(tw.length, 1); else if (common >= 2) score = common / Math.max(fw.length, tw.length); }
    if (score > (best?.score || 0)) best = {...e, score};
  }
  return best && best.score >= 1 ? best : null;
}
module.exports = {parseList, match, norm};
if (require.main === module) {
  const CAD = process.argv[2] || '/home/user/spiiin/cadeditor', list = parseList(path.join(CAD, 'CadEditor/cad_editor_supported_games.txt'));
  const folders = fs.readdirSync(path.join(CAD, 'CadEditor/settings_nes')).filter(f => fs.statSync(path.join(CAD, 'CadEditor/settings_nes', f)).isDirectory());
  const res = folders.map(f => [f, match(f, list)]);
  console.log('titles in the list', list.length, '| folders matched', res.filter(r => r[1]).length, 'of', folders.length);
  for (const [f, m] of res.filter(r => ['tmnt', 'tmnt2', 'tmnt3', 'battletoads', 'castlevania_2', 'megaman_2', 'ninja_gaiden_3', 'chip_and_dale', 'duck_tales_2', 'battletoads_and_double_dragon'].includes(r[0]))) console.log(' ', f, '->', m ? m.title + ' (' + m.note + ')' : 'none');
  console.log('unmatched sample:', res.filter(r => !r[1]).map(r => r[0]).slice(0, 25).join(', '));
}
