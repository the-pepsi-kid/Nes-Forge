/*
 * NES FORGE MODULE: src/re/punch-out-audio.js
 * Entry: PunchOutAudio
 * Purpose: Identify immutable driver ranges and decode source music, procedural SFX and sample descriptors.
 * Connections: NativeAudioCatalog/profiles register it; NativeAudioMachine owns native CPU/APU playback.
 * Contract: Startup PCM is an instruction-timed native one-shot. Tracker imports are adaptations, not native Audio encoders.
 * Developer walkthrough: app/docs/NATIVE_RECOVERY_TUTORIAL.md
 * Bundle order: app/source-manifest.json; regenerate with app/tools/bundle.py.
 */
/* Punch-Out US: source-native music sequence/header and sample descriptors.
 * Procedural SFX remain procedural. Original scheduling, sweeps, articulation
 * and DPCM playback execute in the existing isolated CPU/APU machine. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PunchOutAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const identities = [{
      "id": "punch-out-us-prg0",
      "sha256": "0435f6d9bcfeb474a592c3a950530a99c03a6f6cacff793dc88f822bb8cc6952",
      "audioSha256": "f2e8dfe105b56a618fe311424e52c64b0ee35f6e92014bf0595274c323797855"
    }, {
      "id": "punch-out-us-prg1",
      "sha256": "22ce21aa9c477d87e9cdc386b185f2166b18d438257640aa1d8e75ee9960e06e",
      "audioSha256": "7a5cfe001acb2cb2cfc04ecbc4c01d0918cac97a4f91d17abb32953cc75e8f58"
    }],
    parts = [{
      "start": 0,
      "length": 16
    }, {
      "start": 49168,
      "length": 8192
    }, {
      "start": 65552,
      "length": 8192
    }, {
      "start": 106512,
      "length": 24576
    }],
    hash = b => (typeof FamiTone2Native !== 'undefined' ? FamiTone2Native : require(
      './famitone2-native.js')).sha256(b),
    need = (v, m) => {
      if (!v) throw Error('Punch-Out Audio: ' + m);
    };

  /* Audio identity uses header + startup/driver/fixed banks, not arena bytes. This
   * allows verified Scene derivatives while requiring the actual driver revision. */
  function identify(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length !== 262160) return null;
    const digest = hash(Uint8Array.from(parts.flatMap(p => Array.from(bytes.slice(p.start, p
      .start + p.length)))));
    return identities.find(p => p.audioSha256 === digest) || null;
  }

  /* expected binds the catalog to this complete current ROM, even when immutable
   * audio ranges identify the family. Table tokens describe structure, not final sound. */
  function decode(bytes, expected) {
    const identity = identify(bytes);
    need(identity && hash(bytes) === expected, 'Unsupported audio revision');
    const off = a => {
        need(Number.isInteger(a) && a >= 0x8000 && a <= 0xffff, 'Invalid CPU address');
        return a < 0xa000 ? 0x10010 + a - 0x8000 : 0x1a010 + a - 0xa000;
      },
      b = a => bytes[off(a)],
      w = a => b(a) | b(a + 1) << 8,
      loc = a => ({
        bank8KiB: a < 0xa000 ? 8 : 13 + ((a - 0xa000) >> 13),
        cpu: a,
        fileOffset: off(a)
      }),
      cues = [],
      headers = [],
      streams = [],
      instrumentBases = new Set(),
      dataPointers = new Set();
    need([0xa9, 0xc0, 0x8d, 0x17, 0x40].every((v, i) => b(0x8000 + i) === v),
      'Driver entry changed');
    for (let index = 1; index <= 31; index++) {
      const sequence = 0x9000 + b(0x9000 + index - 1),
        entries = [];
      let ended = false;
      for (let n = 0; n < 64; n++) {
        const at = sequence + n,
          token = b(at);
        if (!token) {
          ended = true;
          break;
        }
        const header = (index < 16 ? 0x9069 : 0x90de) + token;
        need(header >= 0x906e && header <= 0x915e, 'Music header leaves reviewed table');
        const start = w(header + 1);
        need(start >= 0x9160 && start < 0xa000, 'Music data leaves reviewed bank');
        const entry = {
          source: loc(header),
          sequence: loc(at),
          lengthBase: b(header),
          data: loc(start),
          channelIndices: [0, b(header + 4), b(header + 3), b(header + 5)],
          envelopeBases: [b(header + 7), b(header + 6)]
        };
        dataPointers.add(start);
        entry.envelopeBases.forEach(x => instrumentBases.add(x));
        entries.push(entry);
      }
      need(ended, 'Unbounded music sequence');
      headers.push({
        id: 'music:' + index,
        index,
        source: loc(sequence),
        entries
      });
    }
    const starts = [...dataPointers].sort((a, b) => a - b);
    for (const header of headers) {
      const id = header.id,
        streamIDs = [];
      for (let section = 0; section < header.entries.length; section++) {
        const e = header.entries[section],
          channels = [1, 0, 2, 3],
          active = e.channelIndices.map((v, i) => ({
            index: v,
            channel: channels[i]
          })).filter((v, i) => i === 0 || v.index !== 0),
          bounds = [...new Set(active.map(c => c.index))].sort((a, b) => a - b),
          end = starts.find(a => a > e.data.cpu) || 0xa000;
        for (const ch of active) {
          const start = e.data.cpu + ch.index,
            limit = Math.min(e.data.cpu + (bounds.find(v => v > ch.index) ?? 256), end),
            events = [];
          need(start < limit && limit <= 0xa000, 'Invalid bounded channel extent');
          for (let pc = start; pc < limit; pc++) {
            const v = b(pc),
              event = {
                source: loc(pc),
                byte: v
              };
            events.push(event);
            if (v >= 128) {
              event.kind = 'duration-token';
              event.index = v & 31;
              event.lengthBase = e.lengthBase;
            } else if (ch.channel === 1 && v === 0) {
              event.kind = 'segment-end';
              break;
            } else if (ch.channel === 0 && v === 0 && pc + 1 < limit) {
              event.kind = 'sweep-control';
              event.value = b(++pc);
              event.operand = loc(pc);
            } else if (ch.channel === 3 && v === 0) {
              event.kind = 'noise-restart';
              break;
            } else event.kind = ch.channel === 3 ? 'native-drum-token' : v === 2 ? 'rest' :
              'native-pitch-index';
          }
          const streamId = id + ':section' + section + ':ch' + ch.channel;
          streamIDs.push(streamId);
          streams.push({
            id: streamId,
            cueIds: [id],
            channel: ch.channel,
            section,
            source: loc(start),
            events,
            terminal: 'native-segment-or-declared-data-boundary'
          });
        }
      }
      cues.push({
        id,
        index: header.index,
        label: 'Music ' + String(header.index).padStart(2, '0') + (header.entries.length ?
          '' : ' · ' + ([27, 28].includes(header.index) ? 'stop control' : 'empty slot')),
        kind: header.entries.length ? 'music-request' : [27, 28].includes(header.index) ?
          'control' : 'empty-request',
        bank: 8,
        requestRegister: 0xf2,
        requestValue: header.index,
        streamIDs,
        channels: [...new Set(streams.filter(s => s.cueIds.includes(id)).map(s => s
          .channel))],
        header: header.source
      });
    }
    for (const [family, count, register, entry] of [
        ['sq1', 24, 0xf0, 0x80ca],
        ['sq2', 21, 0xf1, 0x84b1],
        ['dmc', 7, 0xf3, 0x8025]
      ])
      for (let index = 1; index <= count; index++) {
        const id = family + ':' + index,
          streamID = id + ':native';
        streams.push({
          id: streamID,
          cueIds: [id],
          source: loc(entry),
          events: [{
            kind: 'procedural-native-dispatch',
            source: loc(entry),
            byte: b(entry),
            requestRegister: register,
            requestValue: index
          }],
          terminal: 'native-execution-required'
        });
        cues.push({
          id,
          index,
          label: (family === 'dmc' ? 'DPCM ' : family.toUpperCase() + ' SFX ') + String(index)
            .padStart(2, '0'),
          kind: 'effect',
          bank: 8,
          requestRegister: register,
          requestValue: index,
          streamIDs: [streamID],
          ...(family === 'dmc' ? {
            channels: [4],
            sampleId: 'dmc:' + index
          } : {}),
          dispatch: loc(entry),
          limitations: [
            'Procedural effect; inspect actual native APU writes for channel routing and timing.'
          ]
        });
      }
    const startupSource = {
        bank8KiB: 6,
        cpu: 0x9000,
        fileOffset: 0xd010
      },
      startupStream = 'pcm:startup:native';
    streams.push({
      id: startupStream,
      cueIds: ['pcm:startup'],
      source: startupSource,
      encoding: 'Native two-bit delta tokens with procedural step selection and instruction timing',
      encodedData: {
        source: {
          bank8KiB: 6,
          cpu: 0x9200,
          fileOffset: 0xd210
        },
        byteLength: 2816,
        sha256: hash(bytes.slice(0xd210, 0xdd10)),
        payloadExported: false
      },
      events: [{
        kind: 'native-direct-dac-routine',
        source: startupSource,
        byte: bytes[startupSource.fileOffset]
      }],
      terminal: 'native-return-or-selected-window'
    });
    cues.push({
      id: 'pcm:startup',
      label: 'Startup PCM + native bell',
      kind: 'native-pcm',
      bank: 6,
      entry: 0x9000,
      streamIDs: [startupStream],
      channels: [0, 1, 4],
      limitations: [
        'One-shot original bank-6 routine with instruction-clocked direct DAC writes and its native bell. It runs continuously across the selected update windows, never restarting each frame.',
        'Native audition only: the tracker has no PCM sample model. A shorter window truncates the routine; choose at least 199 updates for its complete isolated execution.'
      ]
    });
    const samples = Array.from({
      length: 7
    }, (_, i) => {
      const at = 0xf768 + i * 2,
        address = 0xc000 + b(at) * 64,
        length = b(at + 1) * 16 + 1,
        start = off(address);
      need(start + length <= bytes.length && address + length <= 65536,
        'DPCM sample leaves fixed PRG');
      return {
        id: 'dmc:' + (i + 1),
        source: loc(address),
        descriptor: loc(at),
        address,
        byteLength: length,
        sha256: hash(bytes.slice(start, start + length)),
        rateIndex: 15,
        loop: i === 0,
        limitations: [
          'Native sample bytes are source-owned and are not exported into canonical Audio. Laugh requests may schedule subsequent descriptors.'
        ]
      };
    });
    const instruments = [...instrumentBases].sort((a, b) => a - b).map(base => ({
      id: 'envelope:' + base,
      kind: 'native-duty-envelope-window',
      source: loc(0xf674 + base),
      base,
      limitations: [
        'Native articulation and shared table windows do not imply canonical instrument equivalence.'
      ]
    }));
    return {
      format: 'NESForgePunchOutNativeAudio',
      version: 1,
      cues,
      headers,
      streams,
      instruments,
      samples,
      driver: {
        update: loc(0x8000),
        music: loc(0x88e2),
        sq1: loc(0x80ca),
        sq2: loc(0x84b1),
        dmc: loc(0x8025)
      },
      summary: {
        musicRequests: cues.filter(c => c.kind === 'music-request').length,
        emptySlots: cues.filter(c => c.kind === 'empty-request').length,
        controlCues: 2,
        proceduralEffects: 45,
        dpcmRequests: 7,
        startupPcmRoutines: 1,
        channelStreams: streams.length,
        structuralEvents: streams.reduce((n, s) => n + s.events.length, 0),
        instruments: instruments.length,
        samples: samples.length
      },
      limitations: [
        'Both supplied US revisions use the same startup PCM bank, audio bank and fixed helpers/samples. Each original header and immutable audio banks are required; current derivative identity uses its actual complete-ROM hash.',
        'Music sections and bounded source tokens are decoded structurally. Actual native execution owns timing, segment transitions, envelopes, sweeps, noise, DPCM and channel arbitration.',
        'SQ1/SQ2 SFX remain procedural dispatches, not invented static scores. Labels are native request IDs, not verified song names.',
        'DPCM descriptor lengths use the native 16*n+1 rule; sample payloads stay in the source. Native audition retains them; canonical transcription omits DPCM and short-mode noise.',
        'Startup PCM executes as a separate bank-6 one-shot native routine with instruction timing. It is cataloged and auditionable but has no canonical tracker or native sample writer.',
        'There is no native audio writer. Editable conversion is a finite frame-end adaptation, not lossless recovery of native instruments or loops.'
      ]
    };
  }
  return Object.freeze({
    identities,
    parts,
    identify,
    decode
  });
});
