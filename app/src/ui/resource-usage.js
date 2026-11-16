/* CHR/pose usage is an editor view over ResourceContext. It never copies pixels,
 * creates Scene OAM, changes signatures, or adds a persisted asset/selection store.
 * Physical writers remain explicit actions through PunchOutArtUI/ProjectStore.
 */
(() => {
  'use strict';
  const services = Forge.services, context = services.ResourceContext;
  const el = (tag, id, text) => {const node = document.createElement(tag); if (id) node.id = id;
    if (text !== undefined) node.textContent = text; return node;};
  const root = el('section', 'chrPoseUsage'), title = el('strong', 'chrPoseUsageTitle');
  const scope = el('select', 'chrUsageScope'), info = el('p', 'chrPoseUsageInfo');
  const variants = el('div', 'chrPoseAppearances'), known = el('p', 'chrNativeConsumers');
  const inspect = el('button', 'chrInspectNativeUses', 'Inspect known native uses of this tile');
  const resources = el('button', 'chrPoseResources', 'Pose resources');
  const palette = el('button', 'chrNativePalette', 'Edit native fight palette');
  scope.setAttribute('aria-label', 'CHR tile view');
  for (const [value, label] of [['whole', 'Whole bank / Scene buffer'], ['pose', 'Used by selected pose']]) {
    const option = el('option', null, label); option.value = value; scope.appendChild(option);
  }
  const label = el('label', null, 'Tile view '); label.htmlFor = scope.id; label.append(scope);
  root.append(title, label, info, variants, resources, palette, inspect, known);
  document.getElementById('chrPreviewControls').prepend(root);
  const browserNote = el('p', 'chrBrowserSelectionNote');
  document.getElementById('chrBankBrowser').appendChild(browserNote);
  const css = el('style');
  css.textContent = '#chrPoseUsage{border:1px solid var(--bdr);padding:8px;margin-bottom:10px;font:11px/1.5 system-ui}#chrPoseUsage label{display:block;margin-top:7px}#chrPoseUsage button{margin:3px 0;min-height:32px;max-width:100%;white-space:normal;padding:6px 8px;background:var(--bg3);color:var(--txt);border:1px solid var(--bdr);border-radius:3px;font:11px/1.4 system-ui;cursor:pointer}#chrPoseUsage select{max-width:100%;font:inherit}#chrPoseAppearances{display:flex;flex-wrap:wrap;gap:6px}#chrPoseAppearances figure{margin:0;padding:4px;border:1px solid var(--bdr)}#chrPoseAppearances canvas{image-rendering:pixelated;width:32px;height:32px}#chrPoseAppearances figcaption{font-size:10px}#chrBrowserSelectionNote{font-size:11px;line-height:1.5;color:var(--acc)}';
  document.head.appendChild(css);
  let lastKey = '', inspectedKey = '';
  const hex = tile => '$' + tile.toString(16).toUpperCase().padStart(2, '0');

  function drawAppearance(use, usage, pixels) {
    const figure = el('figure'), canvas = el('canvas'); canvas.width = canvas.height = 8;
    const ctx = canvas.getContext('2d'), colors = usage.paletteScene?.sprPal?.[use.pal] || [15,0,16,48];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const ci = pixels?.[use.flipV ? 7-y : y]?.[use.flipH ? 7-x : x] || 0;
      ctx.fillStyle = ci ? 'rgb(' + (NP[colors[ci]] || NP[15]).join(',') + ')' : ((x+y)&1 ? '#263040' : '#384458');
      ctx.fillRect(x,y,1,1);
    }
    const caption = 'SP' + use.pal + (use.flipH ? ' · H' : '') + (use.flipV ? ' · V' : '') +
      (use.behind ? ' · behind BG' : '') + (usage.frame.spriteMode===16 ? ' · displayed ' + (use.displayHalf ? 'bottom' : 'top') : '');
    canvas.setAttribute('aria-label', 'Tile appearance ' + caption);
    figure.append(canvas, el('figcaption', null, caption)); variants.appendChild(figure);
  }

  function refresh() {
    if (S.tab !== 'chr') return;
    const scene = S.scenes[S.activeScene], usage = context.chrUsage();
    let native = null; try {native = context.native(scene);} catch (_) {}
    scope.options[1].disabled = !usage;
    scope.value = window.forgeCHR.usageOnly && usage ? 'pose' : 'whole';
    title.textContent = usage ? usage.frame.name : 'CHR buffer context';
    const tile = S.editTile, uses = usage?.uses.filter(use => use.tile === tile) || [];
    info.textContent = usage ? usage.pieceCount + ' pieces · ' + usage.tileIds.length + ' distinct tile IDs. ' +
      hex(tile) + ': ' + uses.length + ' piece use(s). Sheet indices and pixel editor remain unflipped; appearances below show actual palette/flips. ' +
      (native?.role === 'physical-chr-writer' ? 'Current native pixels with the selected pose’s snapshot colors. Exported pixels change through this writer; earlier pose snapshots retain their copied art.' :
        usage.origin ? 'Pose-source snapshot. Native pixels and fight colors have separate writers.' : 'Canonical pose reads this Scene’s sprite pixels and palettes.') :
      'No selected pose is linked to this buffer. Scene placements remain separate. Whole bank does not imply exclusive character ownership.';
    resources.hidden = !usage; palette.hidden = !usage?.origin?.paletteWriter;
    const physical = native?.role === 'physical-chr-writer' || S.chrBank === 'spr' && Number.isInteger(native?.bank);
    inspect.hidden = !physical;
    const selected = (native?.source.sha256 || '') + ':' + native?.bank + ':' + tile;
    if (selected !== inspectedKey) known.textContent = physical ? 'Native use coverage is partial. Inspect this tile to see observed full-pose consumers.' : '';
    const key = [scene?.id, S.chrBank, tile, usage?.frame.id, JSON.stringify(uses), JSON.stringify(usage?.paletteScene?.sprPal),
      JSON.stringify((S.chrBank==='spr'?S.sprChr:S.chr)?.[tile])].join('|');
    if (key !== lastKey) {
      lastKey = key; variants.replaceChildren(); const seen = new Set();
      for (const use of uses) {const signature = [use.pal,use.flipH,use.flipV,use.behind,use.displayHalf].join(':');
        if (seen.has(signature)) continue; seen.add(signature);
        drawAppearance(use, usage, (S.chrBank==='spr'?S.sprChr:S.chr)?.[tile]);}
    }
    browserNote.textContent = 'ROM browser selection: ' + (S.allChrBanks?.[S.chrBankIdx]?.label || 'none') +
      '. This chooser does not select the displayed Scene buffer. The → BG / → Spr buttons explicitly copy its pixels; native source snapshots still require their registered writer for ROM export.';
  }

  scope.onchange = () => {
    const usage = context.chrUsage(); window.forgeCHR.usageOnly = scope.value==='pose' && !!usage;
    if (window.forgeCHR.usageOnly && !usage.tileIds.includes(S.editTile) && usage.tileIds.length) S.editTile=S.selTile=usage.tileIds[0];
    render();
  };
  resources.onclick = () => {const usage=context.chrUsage();if(usage)services.ResourceRelationshipPreview.openAt('metasprite:'+usage.frame.id);};
  palette.onclick = () => {try {const usage=context.chrUsage(), writer=usage?.origin?.paletteWriter;
    if(!writer)throw Error('No verified fight palette writer for this selection.');services.PunchOutArtUI.open(writer.kind,writer.index);
  } catch(error) {info.textContent=error.message;}};
  inspect.onclick = () => {try {
    const scene=S.scenes[S.activeScene], origin=context.native(scene);
    if(!origin||!Number.isInteger(origin.bank))throw Error('No known physical bank for this buffer.');
    const result=context.consumers(origin.bank,S.editTile); inspectedKey=origin.source.sha256+':'+origin.bank+':'+S.editTile;
    known.textContent = 'Bank '+result.bank+' · '+hex(S.editTile)+': '+(result.consumers.map(value=>value.label+' ('+value.selectors.length+' full poses)').join('; ')||'no observed full-pose consumer')+'. '+
      result.coverage.decoded+' full poses decoded; '+result.coverage.contextRequired+' need other context. '+result.scope;
  }catch(error){known.textContent=error.message;}};
  const previousRender=render;render=function(){const result=previousRender();refresh();return result;};
  services.ResourceUsageUI=Object.freeze({refresh});
})();
