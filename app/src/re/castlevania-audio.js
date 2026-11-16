/* Castlevania US. The bank 0 dispatcher at $8187 reads groups of three-byte
 * channel records. Its $838A frame routine arbitrates six voices and executes
 * the selected streams. Input bytes come from the exact owner-supplied ROM. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CastlevaniaAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const profiles = Object.freeze([
    '55bcab0d9efc33a9d9efc90f2c3c4ab12f3221a44b1f357e6c6202a456399aa8',
    '0bf466eb3819eee34e41de076b5c1bf16375d0de5ba64ede8ade6ed599accb53'
  ].map((sha256, revision) => Object.freeze({
    id: 'castlevania-us-prg' + revision, title: 'Castlevania · US PRG ' + revision, sha256,
    mapper: 2, byteLength: 131088, bank: 0, fixedBank: 7, defaultCueId: 'request:39'
  })));
  const hex = n => '$' + n.toString(16).toUpperCase().padStart(2, '0');
  const need = (ok, message) => { if (!ok) throw Error('Castlevania Audio: ' + message); };
  const location = cpu => ({cpu, fileOffset: 16 + cpu - 0x8000, bank16KiB: 0});

  function decode(bytes, expected) {
    const hash = (typeof FamiTone2Native !== 'undefined' ? FamiTone2Native : require('./famitone2-native.js')).sha256;
    need(bytes instanceof Uint8Array && bytes.length === 131088 && profiles.some(p => p.sha256 === expected) && hash(bytes) === expected,
      'Choose a supported original US revision.');
    function read(cpu) {
      need(Number.isInteger(cpu) && cpu >= 0x8000 && cpu < 0xc000, 'Read outside bank 0.');
      return bytes[location(cpu).fileOffset];
    }
    const word = at => read(at) | (read(at + 1) << 8);
    const table = word(0x8185), records = [], streams = [], cues = [];
    // The first stream begins immediately after the table. Request zero
    // branches before the table lookup, regardless of the flags in record 0.
    const firstStream = 0x88b6;
    need(table === 0x879f && (firstStream - table) % 3 === 0, 'Invalid request table extent.');
    for (let at = table; at < firstStream; at += 3) {
      const flags = read(at), route = flags & 63, start = word(at + 1);
      need((route >> 2) < 6 && start >= firstStream && start < 0xc000, 'Invalid channel record.');
      records.push({index: records.length, source: location(at), route, slot: route >> 2,
        recordCount: 1 + (flags >> 6), stream: location(start)});
    }
    need(Math.min(...records.map(r => r.stream.cpu)) === firstStream, 'Table overlaps stream data.');

    function walk(record) {
      const start = record.stream.cpu, slot = record.slot;
      const timer = slot === 3 || (read(start) & 0xf0) === 0x20;
      let pc = start, returnTo = null, repeat = 0, timerControl = 0;
      const seen = new Set(), events = new Map();
      const take = () => {
        need(pc >= firstStream, 'Stream reaches the dispatcher or table.');
        return read(pc++);
      };
      const destination = () => { const low = take(); return low | (take() << 8); };
      function emit(address, kind, fields = {}) {
        const key = address + ':' + kind;
        if (!events.has(key)) events.set(key, {kind, source: location(address), byteLength: pc - address, ...fields});
      }
      function result(terminal) {
        return {id: 'record:' + record.index, recordIndex: record.index, slot, channel: slot & 3,
          source: record.stream, mode: timer ? 'timer' : 'score', terminal, events: [...events.values()]};
      }
      for (let step = 0; step < 16384; step++) {
        const key = [pc, returnTo, repeat, timerControl].join('/');
        if (seen.has(key)) return result('repeated-driver-state');
        seen.add(key);
        const at = pc, value = take();
        if (value === 0xfd) {
          const target = destination(); emit(at, 'call', {target: location(target)});
          returnTo = pc; pc = target; continue;
        }
        if (value === 0xfe) {
          const count = take(), target = destination();
          emit(at, 'repeat', {count, target: location(target)});
          // $8352 increments an 8-bit counter. The BMI branch saturates the
          // counter on $FF loops. An unsigned repeat test changes their exit.
          const next = (repeat + 1) & 255;
          if (next === count) repeat = 0;
          else { if ((next - count) & 0x80) repeat = next; pc = target; }
          continue;
        }
        if (value === 0xff) {
          if (returnTo === null || slot === 3) { emit(at, 'end'); return result('end'); }
          emit(at, 'return'); pc = returnTo; returnTo = null; continue;
        }
        if (timer) {
          // $84D2 may consume setup and sweep prefixes in the same tick as the timer word.
          pc = at;
          for (let prefix = 0; ; prefix++) {
            need(prefix < 64, 'Timer prefix limit reached.');
            if ((read(pc) & 0xf0) === 0x20) {
              const address = pc, duration = take() & 15;
              timerControl = take(); emit(address, 'timer-setup', {duration, control: timerControl});
            }
            if (slot === 2 || read(pc) !== 0x11) break;
            const address = pc; take(); emit(address, 'detune');
          }
          if (slot !== 2 && read(pc) === 0x10) {
            const address = pc; take(); const sweep = take(); emit(address, 'sweep', {value: sweep});
          }
          if (slot !== 2 && (timerControl & 16) && read(pc) === 0xf8) {
            const address = pc; take(); emit(address, 'volume-prefix');
          }
          const address = pc, high = take(), low = take();
          emit(address, slot === 3 ? 'noise-period' : 'timer', {timerHigh: high & 7, timerLow: low});
          continue;
        }
        if (value >> 4 === 0xd) {
          const control = take(), parameters = {baseDuration: value & 15, control};
          if (slot !== 2) parameters.gate = take();
          emit(at, 'score-setup', parameters);
        } else if (value === 0xf0 && slot !== 2) {
          const sweep = take(); emit(at, 'sweep', {value: sweep});
        } else if (value === 0xe8) emit(at, 'detune');
        else if (value === 0xe9 || value === 0xea) emit(at, 'dispatch', {request: value === 0xe9 ? 2 : 1});
        else if (value >> 4 === 0xe) emit(at, 'octave', {value: value & 15});
        else {
          const pitchClass = value >> 4, durationUnits = 1 + (value & 15);
          need(pitchClass <= 12, 'Unsupported score byte at ' + hex(at));
          if (pitchClass === 12) emit(at, 'rest', {durationUnits});
          else emit(at, 'note', {pitchClass, durationUnits});
        }
      }
      throw Error('Castlevania Audio: Stream exceeds the bounded parser budget.');
    }
    const rev=profiles.findIndex(p=>p.sha256===expected);
    const caller=(bank,cpu)=>({bank16KiB:bank,cpu,fileOffset:16+bank*0x4000+(cpu&0x3fff)});
    const triggers={
      0x27:{label:'Castle gate introduction',caller:caller(6,0xb932)},
      0x2a:{label:'Stage 01 courtyard music',caller:caller(7,[0xc24a,0xc2cb][rev])},
      0x0a:{label:'Courtyard B-button attack',caller:caller(6,0x9a94)}
    };
    for (let index = 0; index < records.length;) {
      const count = index === 0 ? 1 : records[index].recordCount;
      const group = records.slice(index, index + count);
      need(group.length === count, 'Group leaves the request table.');
      const clear = index === 0 || group.every(r => read(r.stream.cpu) === 0);
      const decoded = clear ? [] : group.map(walk);
      streams.push(...decoded);
      const triple = !clear && group.length === 3 && group.every((r, i) => r.slot === i);
      const label = index === 0 ? 'Clear pulse overrides' : clear ? 'Clear channel group' :
        triple ? 'Three-channel sequence' : 'Sound request';
      const trigger=triggers[index];
      cues.push({id: 'request:' + index, index, label: label + ' ' + hex(index)+(trigger?' · '+trigger.label:''),
        ...(trigger?{observedTrigger:trigger}:{}),
        kind: clear ? 'control' : triple ? 'music-candidate' : 'command', bank: 0,
        recordIndices: group.map(r => r.index), channels: decoded.map(s => s.channel),
        streamIDs: decoded.map(s => s.id), source: index === 0 ? location(0x8187) : group[0].source});
      index += count;
    }
    return {format: 'NESForgeCastlevaniaNativeAudio', version: 1, cues, records, streams, instruments: [], samples: [],
      driver: {dispatch: location(0x8187), update: location(0x838a), table: location(table), recordStride: 3,
        voiceStateBases: Array.from({length: 6}, (_, slot) => read(0x82af + slot)),
        streamPointerOffsets: [3, 4], percussionDispatch: location(0x8656), pulseArbitration: location(0x876b)},
      summary: {tableRecords: records.length, playableRequests: cues.filter(c => c.kind !== 'control').length,
        threeChannelSequences: cues.filter(c => c.kind === 'music-candidate').length,
        controls: cues.filter(c => c.kind === 'control').length, channelStreams: streams.length,
        structuralEvents: streams.reduce((n, s) => n + s.events.length, 0)},
      limitations: ['Request IDs group consecutive channel records. Human song names and most gameplay triggers remain unassigned.',
        'Commands retain their physical source addresses. Native audition starts with cleared RAM and one request. In-game priority, pause and fade depend on surrounding game state.',
        'Tracker import adapts a finite playback window. Editing the original ROM score is unavailable.']};
  }
  return Object.freeze({profiles, decode});
});
