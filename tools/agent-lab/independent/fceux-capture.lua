-- NES Forge AL-EXP-02: capture script for the independent emulator (FCEUX 2.6, Lua 5.1).
-- Runs the one job in FORGE_JOB (a Lua file returning a table) on the cartridge FCEUX was started with, from power-on,
-- and writes plain text records to job.out. (FCEUX's Qt build loads a new cartridge only after the script yields, so
-- the driver starts one FCEUX process per run.) Nothing here comes from NES Forge's emulator: every value is read
-- from FCEUX's own state.
--
-- Synchronization: a checkpoint is "the k-th time the CPU is about to execute the instruction at the cartridge's NMI
-- vector target" (memory.registerexecute fires before the instruction runs). Input is supplied by latch index: before
-- each frame the joypad is set to the mask of the next $4016 strobe falling edge, so the program latches the same
-- sequence of masks as in NES Forge whatever the frame counts (one latch per frame at most; more is reported).
-- Captured at a checkpoint: A, X, Y, S, P, PC; CPU RAM $0000-$07FF and which bytes were written since power-on;
-- PPU $2000-$2FFF (logical, normalized to physical nametable RAM by the comparison); palette RAM $3F00-$3F1F; CHR
-- $0000-$1FFF; the 256x240 picture as NES colour indices (emu.getscreenpixel), i.e. the frame completed before this
-- vertical blank. With trace on, every executed instruction is decoded and each effective PRG data read ($8000+) is
-- logged as (PC, address), computed from FCEUX's registers and memory before the instruction runs.
local job = dofile(os.getenv("FORGE_JOB"))
local out = assert(io.open(job.out, "w"))
local band, bor, lshift = bit.band, bit.bor, bit.lshift
local BUTTONS = {"A", "B", "select", "start", "up", "down", "left", "right"} -- Forge mask bit i

local function hex(s) return (s:gsub(".", function(c) return string.format("%02x", string.byte(c)) end)) end
local function rangehex(reader, from, len) return hex(reader(from, len)) end

-- addressing modes of the instructions that read memory as data (official opcodes)
local MODE = {}
local function set(list, mode) for _, op in ipairs(list) do MODE[op] = mode end end
set({0x6d, 0x2d, 0x0e, 0x2c, 0xcd, 0xec, 0xcc, 0xce, 0x4d, 0xee, 0xad, 0xae, 0xac, 0x4e, 0x0d, 0x2e, 0x6e, 0xed}, "abs")
set({0x7d, 0x3d, 0x1e, 0xdd, 0xde, 0x5d, 0xfe, 0xbd, 0xbc, 0x5e, 0x1d, 0x3e, 0x7e, 0xfd}, "absx")
set({0x79, 0x39, 0xd9, 0x59, 0xb9, 0xbe, 0x19, 0xf9}, "absy")
set({0x71, 0x31, 0xd1, 0x51, 0xb1, 0x11, 0xf1}, "indy")
set({0x61, 0x21, 0xc1, 0x41, 0xa1, 0x01, 0xe1}, "indx")

local function effective(pc)
  local op = memory.readbyte(pc); local mode = MODE[op]; if not mode then return nil end
  local lo, hi = memory.readbyte(pc + 1), memory.readbyte(pc + 2)
  if mode == "abs" then return lo + hi * 256 end
  if mode == "absx" then return band(lo + hi * 256 + memory.getregister("x"), 0xffff) end
  if mode == "absy" then return band(lo + hi * 256 + memory.getregister("y"), 0xffff) end
  if mode == "indy" then local p = memory.readbyte(lo) + memory.readbyte(band(lo + 1, 0xff)) * 256; return band(p + memory.getregister("y"), 0xffff) end
  if mode == "indx" then local z = band(lo + memory.getregister("x"), 0xff); return memory.readbyte(z) + memory.readbyte(band(z + 1, 0xff)) * 256 end
end

local function mask_buttons(m)
  local t = {}; for i, name in ipairs(BUTTONS) do t[name] = band(m, lshift(1, i - 1)) ~= 0 end; return t
end

emu.speedmode("maximum")
out:write("engine lua=", _VERSION, "\n")
for _, run in ipairs(job.runs) do
  local nmi, latches, strobe, written, reads, pending, multi = 0, 0, false, {}, {}, {}, 0
  local frameLatches = 0
  for _, c in ipairs(run.checkpoints) do pending[c.nmi] = c.label end
  local remaining = #run.checkpoints
  out:write("run ", run.id, "\n")
  memory.registerwrite(0x0000, 0x0800, function(address) written[band(address, 0x7ff)] = true end)
  memory.registerwrite(0x4016, function(address, size, value)
    if value == nil then return end -- never read $4016 here: reading it would clock the controller
    if band(value, 1) == 1 then strobe = true elseif strobe then strobe = false; latches = latches + 1; frameLatches = frameLatches + 1 end
  end)
  if run.trace then
    memory.registerexecute(0x8000, 0x8000, function()
      local pc = memory.getregister("pc"); local ea = effective(pc)
      if ea and ea >= 0x8000 and #reads < run.maxReads then reads[#reads + 1] = string.format("%04x%04x%02x", pc, ea, band(nmi, 0xff)) end
    end)
  end
  memory.registerexecute(run.nmiTarget, function()
    nmi = nmi + 1
    local label = pending[nmi]
    if label then
      out:write("cp ", label, " ", nmi, " ", emu.framecount(), " ", latches, "\n")
      out:write("regs ", string.format("%02x%02x%02x%02x%02x%04x", memory.getregister("a"), memory.getregister("x"), memory.getregister("y"), memory.getregister("s"), memory.getregister("p"), memory.getregister("pc")), "\n")
      out:write("ram ", rangehex(memory.readbyterange, 0, 0x800), "\n")
      local w = {}; for i = 0, 0x7ff do w[#w + 1] = written[i] and "1" or "0" end; out:write("written ", table.concat(w), "\n")
      out:write("ppu ", rangehex(ppu.readbyterange, 0x2000, 0x1000), "\n")
      out:write("pal ", rangehex(ppu.readbyterange, 0x3f00, 0x20), "\n")
      if run.chr then out:write("chr ", rangehex(ppu.readbyterange, 0x0000, 0x2000), "\n") end
      if run.pixels then
        local px = {}
        for y = 0, 239 do for x = 0, 255 do local r, g, b, p = emu.getscreenpixel(x, y, true); px[#px + 1] = string.format("%02x", band(p or 0xff, 0xff)) end end
        out:write("pix ", table.concat(px), "\n")
      end
      if run.trace then out:write("reads ", #reads, " ", table.concat(reads), "\n") end
      remaining = remaining - 1
    end
  end)
  local frames = 0
  while remaining > 0 and frames < run.maxFrames do
    local m = run.latches[latches + 1] or run.defaultMask
    joypad.set(1, mask_buttons(m))
    frameLatches = 0
    emu.frameadvance()
    if frameLatches > 1 then multi = multi + 1 end
    frames = frames + 1
  end
  memory.registerexecute(run.nmiTarget, nil)
  if run.trace then memory.registerexecute(0x8000, 0x8000, nil) end
  memory.registerwrite(0x4016, nil)
  memory.registerwrite(0x0000, 0x0800, nil)
  out:write("end ", run.id, " ", frames, " ", nmi, " ", latches, " ", multi, " ", remaining, "\n")
  out:flush()
end
out:write("done\n")
out:close()
emu.exit()
