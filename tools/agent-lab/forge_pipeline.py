#!/usr/bin/env python3
"""NES Forge local ROM investigation pipeline (no dependency beyond Python + Node).

Read-only to ROMs and Forge. Extracted commercial data remains under private/;
review/ contains only non-asset evidence summaries, suitable for manual review.
No network call except optional local Atomic Chat (127.0.0.1/localhost).
"""
from __future__ import annotations
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib import request, error, parse

ROOT = Path(__file__).resolve().parent
DOMAINS = (
    "rom_identification", "physical_banks", "chr_tiles", "runtime_mapping",
    "scenes_layouts", "palettes", "sprites_animations", "entities_collision",
    "audio", "gameplay_logic", "editing", "native_rebuild", "pixel_parity",
)
VALID_STATES = ("unverified", "extracted", "catalogued", "decoded", "runtime_observed", "validated", "editable", "roundtrip_verified")


def digest(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def read_json(p: Path):
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(p: Path, val):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(val, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def clean_title(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", name)[:50].strip("_") or "game"


def safe_display_title(name: str) -> str:
    return Path(name).stem[:100]


def parse_header(p: Path):
    with p.open("rb") as f:
        h = f.read(16)
    if len(h) < 16 or h[:4] != b"NES\x1a":
        raise ValueError("This is not a valid iNES/NES 2.0 header (.nes ROM required).")
    nes2 = (h[7] & 12) == 8
    mapper = (h[6] >> 4) | (h[7] & 0xF0) | (((h[8] & 0x0F) << 8) if nes2 else 0)
    prg_bytes = h[4] * 16384
    chr_bytes = h[5] * 8192
    if nes2:
        def size(lo, hi, bank):
            if hi != 15:
                return ((hi << 8) | lo) * bank
            return 2 ** (lo >> 2) * (2 * (lo & 3) + 1)
        prg_bytes = size(h[4], h[9] & 15, 16384)
        chr_bytes = size(h[5], h[9] >> 4, 8192)
    declared = 16 + (512 if h[6] & 4 else 0) + prg_bytes + chr_bytes
    if declared > p.stat().st_size:
        raise ValueError("ROM is truncated relative to its declared PRG/CHR sizes")
    if prg_bytes + chr_bytes > 128 * 1024 * 1024:
        raise ValueError("Declared ROM is too large for the local analysis safety cap (128 MiB)")
    return {"format": "NES 2.0" if nes2 else "iNES", "mapper": mapper,
            "prg_bytes": prg_bytes, "chr_bytes": chr_bytes,
            "trainer_bytes": 512 if (h[6] & 4) else 0,
            "chr_type": "CHR-RAM or program-loaded patterns" if chr_bytes == 0 else "CHR-ROM"}


def find_extractor(root: Path, explicit: str | None) -> Path | None:
    if explicit:
        return Path(explicit).expanduser().resolve()
    for p in (root / "Tools/extract-cartridge.cjs",
              root / "tools/extract-cartridge.cjs",
              root.parent / "tools/extract-cartridge.cjs",
              Path.cwd() / "tools/extract-cartridge.cjs",
              root / "tools/NES_Forge_ROM_Extractor_RUN_ME.js",
              root / "extract-cartridge.cjs"):
        if p.is_file():
            return p
    return None


def find_forge(root: Path, explicit: str | None) -> Path | None:
    # Never guess which historical HTML is canonical. Owner supplies --forge.
    return Path(explicit).expanduser().resolve() if explicit else None


def find_harness(root: Path, forge: Path | None, explicit: str | None) -> Path | None:
    if explicit:
        return Path(explicit).expanduser().resolve()
    candidates = [root / "forge_kit/Tests/upstream/harness.cjs",
                  root / "QA/t/u/harness.cjs"]
    if forge:
        candidates += [forge.parent / "QA/t/u/harness.cjs",
                       forge.parent / "Tests/upstream/harness.cjs",
                       forge.parent / "app/tests/harness.cjs"]
    return next((p for p in candidates if p.is_file()), None)


def stage_result(name: str, status: str, note: str = "", **extra):
    return {"stage": name, "status": status, "note": note, **extra}


def run_node(stage: str, argv: list[str], log_path: Path, timeout: int) -> dict:
    start = time.monotonic()
    try:
        p = subprocess.run(["node", *argv], capture_output=True, text=True,
                           errors="replace", timeout=timeout, check=False)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text((p.stdout or "") + "\n" + (p.stderr or ""), encoding="utf-8")
        return stage_result(stage, "passed" if p.returncode == 0 else "failed",
                            "Tool completed" if p.returncode == 0 else f"Tool returned exit code {p.returncode}",
                            exit_code=p.returncode, seconds=round(time.monotonic() - start, 1))
    except (OSError, subprocess.TimeoutExpired) as exc:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(str(exc), encoding="utf-8")
        return stage_result(stage, "failed", f"Could not run tool: {type(exc).__name__}",
                            seconds=round(time.monotonic() - start, 1))


def verify_extracted_banks(raw_dir: Path, checks: dict, manifest: dict, header: dict, rom_file: Path) -> tuple[bool, str]:
    """Independently hash bank outputs; never trust the extractor's PASS flag alone."""
    if checks.get("bank_hashes_verified") is not True or checks.get("header_valid") is not True:
        return False, "Extractor did not assert header and bank checks"
    entries = checks.get("bank_checks")
    if not isinstance(entries, list):
        return False, "Missing per-bank checks"
    expected = {"prg": (header["prg_bytes"] + 16383) // 16384,
                "chr": (header["chr_bytes"] + 8191) // 8192}
    if (sum(expected.values()) != len(entries)
            or manifest.get("extracted", {}).get("prg_banks") != expected["prg"]
            or manifest.get("extracted", {}).get("chr_banks") != expected["chr"]):
        return False, "Bank counts do not match the ROM header"
    seen = set()
    prg_offset = 16 + header["trainer_bytes"]
    chr_offset = prg_offset + header["prg_bytes"]
    with rom_file.open("rb") as source:
        source.seek(0, 2)
        actual_length = source.tell()
    if actual_length < chr_offset + header["chr_bytes"]:
        return False, "Cartridge shorter than declared PRG/CHR size"
    for item in entries:
        kind, num = item.get("type"), item.get("bank")
        if kind not in expected or not isinstance(num, int) or num < 0 or num >= expected[kind]:
            return False, "Invalid bank type or index"
        if (kind, num) in seen:
            return False, "Duplicate bank index"
        seen.add((kind, num))
        f = raw_dir / "assets" / kind / f"{kind}_bank_{num:03d}.bin"
        if not f.is_file() or digest(f) != item.get("sha256") or f.stat().st_size != item.get("size"):
            return False, f"Bank file missing, wrong size, or hash mismatch: {kind} {num}"
        offset = (prg_offset if kind == "prg" else chr_offset) + num * (16384 if kind == "prg" else 8192)
        with rom_file.open("rb") as source:
            source.seek(offset)
            expected_bytes = source.read(item["size"])
        if expected_bytes != f.read_bytes():
            return False, f"Bank differs from original ROM bytes: {kind} {num}"
    return True, f"Independently compared {len(entries)} bank files with original ROM bytes"


def init_domains(header):
    d = {key: {"state": "unverified", "evidence": "No validated evidence gathered"} for key in DOMAINS}
    d["rom_identification"] = {"state": "decoded", "evidence": "Validated iNES/NES 2.0 signature and header fields"}
    return d


def build_public_summary(rom_hash, header, stages, domains, native_stats, warnings, forge_identity):
    # Allowlist only; never include file paths, ROM bytes, decoded graphics, runtime dumps or model claims.
    return {
        "schema": "NESForgeCompatibilityEvidence/v0.3", "publication_status": "manual_review_required", "source_sha256": rom_hash,
        "editor": forge_identity,
        "header": header,
        "stages": [{"stage": s["stage"], "status": s["status"], "exit_code": s.get("exit_code")}
                   for s in stages],
        "domains": domains,
        "observed_counts": {
            "native_room_records": native_stats.get("rooms"),
            "native_pages": native_stats.get("pages"),
            "native_collision_rooms": native_stats.get("rooms_with_collision"),
            "native_failed_records": native_stats.get("failed")
        },
        "limits": [
            "No claim of complete game support or pixel parity without a separate verification test.",
            "Extracted physical banks are not proof of editable scenes, audio or game logic.",
            "Native resource output may embed the source ROM; keep all native projects private.",
            *warnings
        ]
    }


def write_html(file: Path, title: str, public: dict, local_stages: list, qwen: dict | None):
    def esc(x): return html.escape(str(x), quote=True)
    rows = "\n".join(
        f'<tr><td>{esc(k.replace("_", " ").title())}</td><td><span class="state">{esc(v["state"])}</span></td><td>{esc(v["evidence"])}</td></tr>'
        for k, v in public["domains"].items())
    stage_rows = "\n".join(
        f'<tr><td>{esc(s["stage"])}</td><td>{esc(s["status"])}</td><td>{esc(s["note"])}</td></tr>'
        for s in local_stages)
    tasks = ""
    if qwen and qwen.get("state") == "connected":
        tasks = "<h2>Qwen's suggestions (unverified)</h2><ul>" + "".join(
            f"<li>{esc(x)}</li>" for x in qwen.get("suggested_tasks", [])) + "</ul>"
    native_link = '<p><a href="native/resources.html">Open native room previews (private)</a></p>' if (file.parent / "native/resources.html").is_file() else ""
    file.write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Forge review</title>
<style>:root{{color-scheme:dark}}body{{max-width:1040px;margin:35px auto;padding:0 20px;font:15px/1.55 system-ui;background:#121620;color:#edf0f4}}h1{{font-size:29px}}h2{{margin-top:32px}}.muted{{color:#aeb9cc}}table{{border-collapse:collapse;width:100%}}td,th{{text-align:left;padding:11px;border-bottom:1px solid #323b48}}th{{color:#9dbbd5}}.state{{font:12px ui-monospace,monospace;border:1px solid #4c5a70;padding:4px 7px;border-radius:7px}}a{{color:#7dc7ed}}.note{{border-left:3px solid #f0b35c;padding-left:15px}}</style>
</head><body><h1>NES Forge compatibility review</h1><p class="muted">{esc(title)} · ROM SHA-256: <code>{esc(public["source_sha256"][:16])}…</code> · Mapper {esc(public["header"]["mapper"])}</p>
<p class="note">This is an evidence report, not a claim of fully editable game support. AI suggestions are not verified findings.</p>
<h2>Feature coverage</h2><table><thead><tr><th>Domain</th><th>State</th><th>What was verified</th></tr></thead><tbody>{rows}</tbody></table>
<h2>Pipeline stages</h2><table><thead><tr><th>Stage</th><th>Status</th><th>Details</th></tr></thead><tbody>{stage_rows}</tbody></table>
{native_link}{tasks}<p class="muted">Private ROM-derived files remain in this local folder. Only the allowlisted JSON evidence is intended for manual GitHub review.</p></body></html>''', encoding="utf-8")


def load_review_tasks(path: str | None, rom_sha256: str) -> list[dict]:
    """Return narrow source-bound review tasks; never treat them as execution authority."""
    if not path:
        return []
    source = Path(path).expanduser().resolve()
    if not source.is_file() or source.stat().st_size > 4 * 1024 * 1024:
        raise ValueError("Review workorders missing or too large")
    doc = read_json(source)
    if doc.get("schema") != "NESForgeAgentWorkorders/v1" or doc.get("allow_modify_rom") is not False or doc.get("allow_modify_forge") is not False:
        raise ValueError("Review workorders must be a read-only v1 document")
    items = doc.get("tasks")
    if not isinstance(items, list) or len(items) > 5000:
        raise ValueError("Review task list is not bounded")
    matches = []
    for item in items:
        if not isinstance(item, dict) or item.get("rom_sha256") != rom_sha256:
            continue
        if item.get("state") != "pending_review_not_executed":
            continue
        instruction = item.get("instruction")
        acceptance = item.get("acceptance")
        if not isinstance(instruction, str) or not isinstance(acceptance, str):
            continue
        matches.append({"id": str(item.get("id", ""))[:100],
                        "category": str(item.get("category", ""))[:48],
                        "instruction": instruction[:1000],
                        "acceptance": acceptance[:750],
                        "status": "owner_review_required"})
    # Keep one task per category in the model prompt. The local queue retains all.
    return matches[:20]


def ask_qwen(public: dict, api: str, model: str | None, review_tasks: list[dict] | None = None) -> dict:
    parsed = parse.urlparse(api)
    if parsed.scheme != "http" or parsed.hostname not in ("localhost", "127.0.0.1", "::1"):
        return {"state": "disabled", "note": "Only local Atomic Chat APIs are allowed"}
    base = api.rstrip("/")
    try:
        req = request.Request(base + "/models", headers={"Accept": "application/json"})
        with request.urlopen(req, timeout=3) as resp:
            models = json.load(resp).get("data") or []
        chosen = model or (models[0].get("id") if models else None)
        if not chosen:
            return {"state": "unavailable", "note": "No active model listed by Atomic Chat"}
        # Intentionally sends metadata only; never sends source bytes or ROM-derived layouts.
        facts = {"header": public["header"], "domains": public["domains"],
                 "observed_counts": public["observed_counts"],
                 "review_findings": (review_tasks or [])[:3]}
        message = ("You are triaging NES Forge compatibility evidence. Distinguish verified observations "
                   "from hypotheses. Give at most three narrow next actions, grounded ONLY in the JSON below. "
                   "Do NOT claim playable scenes or 1:1 fidelity. Reply with JSON object "
                   '{"suggested_tasks":["action 1","action 2"]}.\n' + json.dumps(facts, separators=(",", ":")))
        body = {"model": chosen, "stream": False, "temperature": 0, "max_tokens": 350,
                "messages": [{"role": "user", "content": message}]}
        req = request.Request(base + "/chat/completions",
                              data=json.dumps(body).encode(),
                              headers={"Content-Type": "application/json"})
        with request.urlopen(req, timeout=90) as resp:
            result = json.load(resp)
        raw = result["choices"][0]["message"]["content"]
        # Models sometimes fence JSON; keep unparsed text private but never execute it.
        text = str(raw).strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        v = json.loads(text)
        tasks = v.get("suggested_tasks", [])
        if not isinstance(tasks, list):
            raise ValueError("Qwen did not provide a list of suggested_tasks")
        return {"state": "connected", "model": chosen,
                "suggested_tasks": [str(x)[:400] for x in tasks[:3] if isinstance(x, str)]}
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError, TimeoutError) as exc:
        return {"state": "unavailable", "note": f"Qwen analysis unavailable: {type(exc).__name__}"}


def run(args):
    root = Path(args.root).expanduser().resolve() if args.root else ROOT
    rom = Path(args.rom).expanduser().resolve()
    if not rom.is_file():
        raise ValueError("ROM path does not exist")
    if rom.suffix.lower() != ".nes":
        raise ValueError("Expected a .nes ROM")
    header = parse_header(rom)
    rom_hash = digest(rom)
    if root in rom.parents and (root / "review") in rom.parents:
        raise ValueError("Do not import a report or a ROM from the shareable review folder")
    output_root = Path(args.output_root).expanduser().resolve() if args.output_root else root
    output_root.mkdir(parents=True, exist_ok=True)
    tool_dir = Path(args.tools).resolve() if args.tools else root / "tools"
    extractor = find_extractor(root, args.extractor)
    forge = find_forge(root, args.forge)
    harness = find_harness(root, forge, args.harness)
    if forge and not forge.is_file():
        raise ValueError("Specified Forge HTML file does not exist")
    if harness and not harness.is_file():
        raise ValueError("Specified Forge harness file does not exist")
    forge_identity = ({"sha256": digest(forge), "build_family": "owner_selected"} if forge else
                      {"sha256": None, "build_family": "none"})
    # Keep separate private artifacts for different editor versions of the same ROM.
    name = clean_title(rom.stem) + "_" + rom_hash[:12] + "_" + ((forge_identity["sha256"] or "no_editor")[:12])
    private = output_root / "private" / name
    # Review folder names are fingerprint-only: no original filename leaks to review/.
    review = output_root / "review" / (rom_hash[:12] + "_" + ((forge_identity["sha256"] or "no_editor")[:12]))
    private.mkdir(parents=True, exist_ok=True)
    review.mkdir(parents=True, exist_ok=True)
    domains = init_domains(header)
    stages = []
    warnings = []

    print("\n=== NES Forge local investigation ===")
    print("Cartridge:", safe_display_title(rom.name), "| Mapper:", header["mapper"])
    print("Editor SHA-256:", forge_identity["sha256"] or "NOT PROVIDED (raw extraction only)")
    print("Everything extracted stays PRIVATE on your PC. No GitHub push is performed.\n")

    raw_dir = private / "raw"
    if extractor and extractor.is_file():
        print("[1/3] Reading physical ROM banks ...")
        for stale in (raw_dir / "manifest.json", raw_dir / "checks.json"):
            stale.unlink(missing_ok=True)
        s = run_node("physical_bank_extraction", [str(extractor), str(rom), str(raw_dir)], private / "logs/extract.log", 300)
        stages.append(s)
        manifest = raw_dir / "manifest.json"
        checks = raw_dir / "checks.json"
        if s["status"] == "passed" and manifest.is_file() and checks.is_file():
            check = read_json(checks)
            raw_manifest = read_json(manifest)
            verified, details = verify_extracted_banks(raw_dir, check, raw_manifest, header, rom)
            if verified and raw_manifest.get("sha256") == rom_hash:
                domains["physical_banks"] = {"state": "extracted", "evidence": details}
                if header["chr_bytes"]:
                    domains["chr_tiles"] = {"state": "decoded", "evidence": "NES 2bpp CHR-ROM tiles decoded to grayscale previews (not palette-verified)"}
                else:
                    domains["chr_tiles"] = {"state": "unverified", "evidence": "Cartridge uses CHR-RAM; graphics may be uploaded during execution"}
            else:
                stages[-1]["status"] = "failed"
                stages[-1]["note"] = "Bank hashes/header validation not proven: " + details
        else:
            warnings.append("Physical bank extraction could not be verified; see private logs.")
    else:
        stages.append(stage_result("physical_bank_extraction", "skipped", "Existing Forge extractor not found under tools/"))
        warnings.append("Copy tools/extract-cartridge.cjs from the current NES Forge repository to this kit's tools folder.")

    native_stats = {}
    capture_stats = {"frames_checked": 0, "selfcheck_passed": 0, "note": "Emulator self-consistency is not independent 1:1 parity"}
    native_script = tool_dir / "forge_native_resources.cjs"
    if forge and harness and native_script.is_file():
        print("[2/3] Testing existing Forge native resource adapters ...")
        (private / "native/resources_report.json").unlink(missing_ok=True)
        s = run_node("native_resource_recovery",
                     [str(native_script), str(rom), str(private / "native"), "--forge", str(forge), "--harness", str(harness)],
                     private / "logs/native.log", args.timeout)
        stages.append(s)
        report = private / "native/resources_report.json"
        if report.is_file():
            nr = read_json(report)
            native_stats = nr.get("stats", {}) if isinstance(nr.get("stats"), dict) else {}
            if (s["status"] == "passed" and nr.get("status") == "PASS"
                    and nr.get("rom", {}).get("sha256") == rom_hash
                    and native_stats.get("rooms", 0) > 0):
                n, pages = native_stats["rooms"], native_stats.get("pages", 0)
                domains["scenes_layouts"] = {"state": "decoded", "evidence": f"Native adapter decoded {n} room records and {pages} pages; pixel parity untested"}
                domains["palettes"] = {"state": "decoded", "evidence": "Native adapter generated room palette data; no pixel parity test"}
                if native_stats.get("rooms_with_collision", 0) > 0:
                    domains["entities_collision"] = {"state": "decoded", "evidence": f"Static collision data decoded for {native_stats['rooms_with_collision']} rooms; enemies and behavior unverified"}
                if any((private / "native").glob("*.native.nesforge.json")):
                    domains["editing"] = {"state": "decoded", "evidence": "Native project artifact generated; opening/editing and round trip not independently verified"}
        elif s.get("exit_code") == 3:
            s["status"] = "unsupported"
            s["note"] = "No matching native resource adapter for this exact ROM"
        if s["status"] == "failed":
            warnings.append("Native adapter failed or is incompatible with this editor; check private/native.log.")
    else:
        reasons = []
        if not forge: reasons.append("Forge.html/NES_Forge.html not located")
        if not harness: reasons.append("compatible loadForge harness not located")
        if not native_script.is_file(): reasons.append("native resources tool missing")
        stages.append(stage_result("native_resource_recovery", "skipped", "; ".join(reasons)))
    # GameRENative investigates some ROMs that do not have a native writer/adapter.
    # The catalog counts are source-linked *records*, not proof of complete scenes.
    investigated_stats = {}
    investigated_script = tool_dir / "forge_investigated.cjs"
    if forge and harness and investigated_script.is_file():
        print("[investigated] Checking source-scoped GameRENative catalogs ...")
        investigated_dir = private / "investigated"
        for stale in (investigated_dir / "summary.json", investigated_dir / "catalog.private.json"):
            stale.unlink(missing_ok=True)
        s = run_node("investigated_source_catalog", [str(investigated_script), str(rom),
            str(investigated_dir), "--forge", str(forge), "--harness", str(harness)],
            private / "logs/investigated.log", args.timeout)
        stages.append(s)
        summary_path = investigated_dir / "summary.json"
        if s["status"] == "passed" and summary_path.is_file():
            summary = read_json(summary_path)
            if summary.get("source_sha256") != rom_hash:
                s["status"] = "failed"
                s["note"] = "Investigation profile ROM hash did not match original"
            elif summary.get("status") == "catalogued":
                counts = summary.get("counts", {})
                investigated_stats = {k: v for k, v in counts.items() if isinstance(v,int) and v>=0}
                if investigated_stats.get("scenes",0) and domains["scenes_layouts"]["state"] == "unverified":
                    domains["scenes_layouts"] = {"state":"catalogued",
                        "evidence":f"Investigated {investigated_stats['scenes']} source scene/context records; pixel parity and native writer unverified"}
                if investigated_stats.get("poses",0) or investigated_stats.get("animations",0):
                    domains["sprites_animations"] = {"state":"catalogued",
                        "evidence":f"Catalogued {investigated_stats.get('poses',0)} poses and {investigated_stats.get('animations',0)} scripts; ordering/parity unverified"}
                # Symbol/actor counts are *not* verified collision or behavior.
            else:
                s["status"] = "unsupported"
                s["note"] = "No matching exact GameRENative profile; raw inspection still available"
        if s["status"] == "failed":
            warnings.append("GameRENative investigation failed; inspect private logs.")
    else:
        stages.append(stage_result("investigated_source_catalog", "skipped", "GameRENative runner or matching editor/harness absent"))

    # Optional runtime traces: only observed emulator state, NOT independent parity.
    if args.capture and forge and harness:
        capture_script = tool_dir / "forge_capture.cjs"
        if capture_script.is_file():
            print("[runtime] Recording bounded emulator observations (frames 30 and 120) ...")
            capture_dir = private / "captures"
            s = run_node("emulator_observation",
                         [str(capture_script), str(rom), str(capture_dir), "--forge", str(forge),
                          "--harness", str(harness), "--at", "30,120", "--tag", "boot"],
                         private / "logs/capture.log", args.timeout)
            stages.append(s)
            if s["status"] == "passed":
                for frame in (30, 120):
                    snap = capture_dir / f"boot_f{frame}"
                    state_file = snap / "state.json"
                    if not (state_file.is_file() and (snap / "screen.png").is_file()
                            and (snap / "forge_shapes.json").is_file()):
                        s["status"] = "failed"
                        s["note"] = "Incomplete runtime capture"
                        break
                    state = read_json(state_file)
                    if state.get("rom", {}).get("sha256") != rom_hash:
                        s["status"] = "failed"
                        s["note"] = "Runtime snapshot fingerprint mismatch"
                        break
                    capture_stats["frames_checked"] += 1
                    if state.get("self_check", {}).get("verdict") == "PASS":
                        capture_stats["selfcheck_passed"] += 1
                if s["status"] == "passed" and capture_stats["frames_checked"] == 2:
                    domains["runtime_mapping"] = {"state": "runtime_observed",
                        "evidence": "Forge emulator captured mapper/PPU states at two frames; independent game accuracy untested"}
            if s["status"] == "failed":
                warnings.append("Runtime capture failed or incomplete; inspect private logs.")
        else:
            stages.append(stage_result("emulator_observation", "skipped", "forge_capture.cjs not installed"))
    elif args.capture:
        stages.append(stage_result("emulator_observation", "skipped", "Forge and matching harness required"))
    else:
        stages.append(stage_result("emulator_observation", "skipped", "Optional; use --capture to collect PPU/mapper observations"))

    if args.audio and forge and harness:
        print("[optional] Attempting native audio recovery (may be computationally expensive) ...")
        audio_script = tool_dir / "forge_native_audio.cjs"
        if audio_script.is_file():
            (private / "native/audio/audio_report.json").unlink(missing_ok=True)
            s = run_node("native_audio_recovery",
                         [str(audio_script), str(rom), str(private / "native"), "--forge", str(forge), "--harness", str(harness), "--frames", "1024"],
                         private / "logs/audio.log", args.timeout)
            stages.append(s)
            ar = private / "native/audio/audio_report.json"
            if ar.is_file():
                a = read_json(ar)
                if (a.get("status") == "PASS" and s["status"] == "passed"
                        and a.get("rom", {}).get("sha256") == rom_hash):
                    domains["audio"] = {"state": "decoded", "evidence": "Native audio extraction reported PASS; audible parity and roundtrip unverified"}
        else:
            stages.append(stage_result("native_audio_recovery", "skipped", "audio tool missing"))
    elif args.audio:
        stages.append(stage_result("native_audio_recovery", "skipped", "Forge and harness required"))
    else:
        stages.append(stage_result("native_audio_recovery", "skipped", "Optional deep analysis (enable with --audio)"))

    # Model output is not used to change authoritative compatibility statuses.
    public = build_public_summary(rom_hash, header, stages, domains, native_stats, warnings, forge_identity)
    public["observed_counts"]["investigated_catalog"] = investigated_stats
    # Every ROM receives one canonical eight-category inventory, regardless of adapter support.
    inventory = {
      "schema":"NESForgePrivateGameInventory/v1", "source_sha256":rom_hash,
      "display_title":safe_display_title(rom.name), "mapper":header["mapper"],
      "categories":{
        "world_scenes": ["scenes_layouts"],
        "graphics": ["chr_tiles","palettes"],
        "animations": ["sprites_animations"],
        "audio": ["audio"],
        "collision_physics": ["entities_collision"],
        "ai_behavior": ["gameplay_logic"],
        "code_runtime": ["rom_identification","physical_banks","runtime_mapping"],
        "build_patches": ["editing","native_rebuild","pixel_parity"],
      }, "domains": domains, "catalog_counts": investigated_stats,
      "note": "This index organizes evidence from multiple tools; empty/unverified does not mean absent from the game."
    }
    write_json(private / "inventory.json", inventory)
    public["observed_counts"]["runtime_frames"] = capture_stats["frames_checked"]
    public["observed_counts"]["runtime_selfcheck_passed"] = capture_stats["selfcheck_passed"]
    print("[3/3] Preparing local review and public-safe evidence ...")
    review_tasks = load_review_tasks(args.review_workorders, rom_hash)
    qwen = {"state": "disabled", "note": "--no-ai selected"} if args.no_ai else ask_qwen(public, args.api, args.model, review_tasks)
    local = {"schema": "NESForgeLocalReview/v0.3", "rom_path": str(rom),
             "rom_sha256": rom_hash, "forge_path": str(forge) if forge else None,
             "forge_sha256": forge_identity["sha256"],
             "harness_path": str(harness) if harness else None,
             "harness_sha256": digest(harness) if harness else None,
             "extractor_sha256": digest(extractor) if extractor and extractor.is_file() else None,
             "native_tool_sha256": digest(native_script) if native_script.is_file() else None,
             "stages": stages,
             "domains": domains, "qwen": qwen,
             "private_output": str(private), "public_summary": str(review / "evidence.json")}
    queue = {"schema": "NESForgeInvestigationQueue/v0.1",
             "rom_sha256": rom_hash, "editor_sha256": forge_identity["sha256"],
             "source": "model suggestions are unverified until reproduced by deterministic tools",
             "actions": [{"id": f"qwen-{i+1}", "role": "local_reverse_engineering_assistant",
                          "status": "proposed_unverified", "description": action,
                          "acceptance": "Confirm exact ROM offsets and independently repeat the result before source changes"}
                         for i, action in enumerate(qwen.get("suggested_tasks", []))]}
    for item in review_tasks:
        queue["actions"].append({"id": item["id"], "role": item["category"],
                                 "status": item["status"], "description": item["instruction"],
                                 "acceptance": item["acceptance"]})
    write_json(private / "NEXT_ACTIONS.json", queue)
    write_json(private / "local_report.json", local)
    write_json(review / "evidence.json", public)
    write_html(private / "REPORT.html", rom.stem, public, stages, qwen)
    print("\nFinished:")
    print("  PRIVATE assets & HTML report:", private)
    print("  GitHub-reviewable evidence only:", review / "evidence.json")
    print("  Qwen:", qwen.get("state"))
    for s in stages:
        print(" ", s["stage"], "→", s["status"])
    return 0 if domains["physical_banks"]["state"] != "unverified" else 2


def main():
    ap = argparse.ArgumentParser(description="Local, evidence-first NES Forge ROM recovery")
    ap.add_argument("rom", help="Local .nes ROM (never uploaded)")
    ap.add_argument("--root", help="Tool root (defaults to this kit folder)")
    ap.add_argument("--output-root", help="Directory for private and review results, kept separate from source tree")
    ap.add_argument("--forge", help="Latest consolidated Forge.html / NES_Forge.html")
    ap.add_argument("--harness", help="Matching loadForge harness; e.g. repo/QA/t/u/harness.cjs")
    ap.add_argument("--extractor", help="Path to Forge's verified tools/extract-cartridge.cjs")
    ap.add_argument("--tools", help="Directory containing package's native .cjs tools")
    ap.add_argument("--audio", action="store_true", help="Attempt native audio discovery (slow; not always supported)")
    ap.add_argument("--capture", action="store_true", help="Record boot-frame mapper/PPU evidence (private, experimental)")
    ap.add_argument("--no-ai", action="store_true", help="Skip local Qwen analysis")
    ap.add_argument("--api", default="http://127.0.0.1:1337/v1", help="Local Atomic Chat API")
    ap.add_argument("--model", help="Exact local model identifier (auto-detected if omitted)")
    ap.add_argument("--review-workorders", help="Private Qwen update review workorders; matched strictly by ROM SHA-256")
    ap.add_argument("--timeout", type=int, default=900, help="Per native step timeout seconds")
    args = ap.parse_args()
    try:
        sys.exit(run(args))
    except (ValueError, OSError, KeyError, json.JSONDecodeError) as e:
        print("ERROR:", str(e), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
