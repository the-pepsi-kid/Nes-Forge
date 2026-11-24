'use strict';
// A small two-pass 6502 assembler for the AL-EXP-02 synthetic fixtures: AL-EXP-01's assembler (which stays unchanged,
// so its pinned fixtures keep regenerating) with the few extra instructions the AL-EXP-02 programs use. It is
// deliberately separate from Forge's own assembler, so the system under test does not build its own test cartridge.
const OPS = {
  ADC: {imm: 0x69, zp: 0x65}, AND: {imm: 0x29, zp: 0x25}, ASL: {acc: 0x0a, zp: 0x06}, BCC: {rel: 0x90}, BCS: {rel: 0xb0}, BEQ: {rel: 0xf0},
  BIT: {abs: 0x2c}, BNE: {rel: 0xd0}, BPL: {rel: 0x10}, CLC: {imp: 0x18}, CLD: {imp: 0xd8}, CMP: {imm: 0xc9, zp: 0xc5, abs: 0xcd}, CPX: {imm: 0xe0},
  CPY: {imm: 0xc0}, DEC: {zp: 0xc6}, DEX: {imp: 0xca}, DEY: {imp: 0x88}, EOR: {imm: 0x49}, INC: {zp: 0xe6}, INX: {imp: 0xe8}, INY: {imp: 0xc8},
  JMP: {abs: 0x4c}, JSR: {abs: 0x20}, LDA: {imm: 0xa9, zp: 0xa5, abs: 0xad, absx: 0xbd, absy: 0xb9, indy: 0xb1},
  LDX: {imm: 0xa2, zp: 0xa6}, LDY: {imm: 0xa0, zp: 0xa4}, LSR: {acc: 0x4a}, ORA: {zp: 0x05}, PHA: {imp: 0x48}, PLA: {imp: 0x68},
  ROL: {zp: 0x26}, RTI: {imp: 0x40}, RTS: {imp: 0x60}, SBC: {imm: 0xe9}, SEC: {imp: 0x38}, SEI: {imp: 0x78},
  STA: {zp: 0x85, abs: 0x8d}, STX: {zp: 0x86}, STY: {zp: 0x84}, TAX: {imp: 0xaa}, TAY: {imp: 0xa8}, TXA: {imp: 0x8a}, TXS: {imp: 0x9a}, TYA: {imp: 0x98},
};
const SIZE = {imp: 1, acc: 1, imm: 2, zp: 2, rel: 2, indy: 2, abs: 3, absx: 3, absy: 3};

// Operands: a number, a label name, {label, add}, {lo: label}, {hi: label}.
function assemble(origin, program, symbols = {}) {
  const labels = {...symbols};
  const value = (operand, pass) => {
    if (typeof operand === 'number') return operand;
    const resolve = name => { if (!(name in labels)) { if (pass === 1) return 0; throw Error('undefined label ' + name); } return labels[name]; };
    if (typeof operand === 'string') return resolve(operand);
    if (operand.lo !== undefined) return value(operand.lo, pass) & 0xff;
    if (operand.hi !== undefined) return (value(operand.hi, pass) >> 8) & 0xff;
    if (operand.label !== undefined) return resolve(operand.label) + (operand.add || 0);
    throw Error('bad operand ' + JSON.stringify(operand));
  };
  let out = [], starts = [];
  for (const pass of [1, 2]) {
    out = []; starts = []; let pc = origin;
    for (const line of program) {
      if (line.label) { if (pass === 1) { if (line.label in labels) throw Error('duplicate label ' + line.label); labels[line.label] = pc; } continue; }
      const [mn, mode = 'imp', operand] = line; const code = OPS[mn]?.[mode];
      if (code === undefined) throw Error('unsupported instruction ' + mn + ' ' + mode);
      out.push(code); starts.push([pc, SIZE[mode]]);
      if (mode === 'rel') { const target = value(operand, pass), delta = target - (pc + 2); if (pass === 2 && (delta < -128 || delta > 127)) throw Error('branch out of range at $' + pc.toString(16)); out.push(delta & 0xff); }
      else if (SIZE[mode] === 2) { const v = value(operand, pass); if (pass === 2 && (v < 0 || v > 255)) throw Error(mn + ' operand out of range'); out.push(v & 0xff); }
      else if (SIZE[mode] === 3) { const v = value(operand, pass); out.push(v & 0xff, (v >> 8) & 0xff); }
      pc += SIZE[mode];
    }
  }
  return {bytes: Uint8Array.from(out), labels, instructions: starts};
}
module.exports = {assemble, OPS, SIZE};
