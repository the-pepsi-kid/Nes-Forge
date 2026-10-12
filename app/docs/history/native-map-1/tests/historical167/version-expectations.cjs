'use strict';
// Explicit v7 frame defaults and v8 project metadata are the only migration changes.
// No authored frame property is discarded before comparing expected data.
const schemaFor = h => h.context.Forge?.services?.ProjectStore ? 9 : h.context.Forge165 ? 8 : h.context.Forge164?.model?.schemaVersion ?? 6;
const foundationFor = h => h.context.Forge?.release ? h.context.Forge.release.version : h.context.Forge166 ? '1.6.6' : h.context.Forge165 ? '1.6.5' : h.context.Forge164 ? '1.6.4' : '1.6.3';
const migratedFrames = (h, frames) => frames.map(frame => h.context.Forge164 ?
  { ...frame, hitboxes: frame.hitboxes ?? [], hurtboxes: frame.hurtboxes ?? [], events: frame.events ?? [] } : frame);
module.exports = {schemaFor, foundationFor, migratedFrames};
