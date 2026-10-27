"""Hosted-only encounter defeat preserves unspent XP and attained levels.

Synthetic, unverified Zelda II combat; no claim of original-ROM parity.
"""
import asyncio
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "host"))
from server import Host

world = json.loads((ROOT / "tests/synthetic_snapshot.json").read_text())
checks = {}

async def verify():
    with tempfile.TemporaryDirectory() as tmp:
        db = Path(tmp) / "xp-defeat.sqlite3"
        host = Host(db, "test-only-admin", experimental_encounters=True)
        host.world = world
        host.revision = "local-test"
        x, y = host.spawn(world)
        pid = "defeated-test-player"
        host.db.execute(
            "INSERT INTO players(id,address,x,y,xp,earned_xp,level,attack_level,magic_level,life_level,hp,mp,mode,encounter,enemy_hp) "
            "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (pid, "0x" + "a" * 40, x, y, 347, 547, 1, 3, 2, 2, 1, 64, "encounter", "Bot", 90),
        )
        before = host.player(pid)
        response = await host.action(pid, {"type":"encounter_action","action":"guard"})
        after = host.player(pid)
        checks["defeat_processed_in_test_encounter"] = response.get("ok") is True and after["mode"] == "overworld" and after["hp"] == 64
        checks["unspent_xp_survives_defeat"] = after["xp"] == before["xp"] == 347
        checks["total_earned_xp_survives_defeat"] = after["earned_xp"] == before["earned_xp"] == 547
        checks["attack_magic_life_survive_defeat"] = all(after[key] == before[key] for key in ("attack_level","magic_level","life_level"))
        audit = host.db.execute("SELECT detail FROM journal WHERE action='encounter-defeat' ORDER BY seq DESC LIMIT 1").fetchone()
        detail = json.loads(audit["detail"]) if audit else {}
        checks["audit_identifies_hosted_retention"] = detail.get("retainedUnspentXp") == 347 and detail.get("hostedXpRetention") is True and "lostUnspentXp" not in detail
        checks["cannot_repeat_encounter_after_defeat"] = "error" in await host.action(pid, {"type":"encounter_action","action":"guard"})
        host.db.close()
        reopened = Host(db, "test-only-admin")
        again = reopened.player(pid)
        checks["unspent_xp_and_levels_survive_server_restart"] = all(again[k] == after[k] for k in ("xp","earned_xp","attack_level","magic_level","life_level"))
        checks["unsafe_placeholder_combat_still_disabled_by_default"] = not reopened.experimental_encounters
        reopened.db.close()

asyncio.run(verify())
print(json.dumps(checks, indent=2))
assert all(checks.values()), checks
