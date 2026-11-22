# Project crash recovery

Status: implemented on `dev/alpha-13-studio-restore`. Code: `app/src/services/recovery-journal.js` (storage) and the
recovery section of `app/src/services/project-store.js` (orchestration). Test: `QA/project-recovery.cjs`, with the
5.7 MB investigated Ninja Gaiden project, plus step 7 of `QA/one-rom-loop.cjs`.

## What was wrong

Recovery wrote the whole serialized project (5.7 MB for an investigated Ninja Gaiden project) to one IndexedDB record
every 30 s, plus a best-effort write in `beforeunload`. That write starts with a ~60 ms serialization, and it could
not finish before a large project's tab closed. Edits made in the last 30 s were lost. The restore then said
"Recovery restored" anyway.

## How it works now

- **Sections.** The project is split into its top-level fields and one section per scene. Each section is identified
  by a hash of its JSON (2 × 53-bit hashes plus the length). The investigation catalogs (4.1 MB) are re-serialized
  only when the project is replaced, because they are never edited in place.
- **One journal per tab.** Each Forge tab is a session in its own database (`nes-forge-recovery-journal`), separate
  from browser saves.
  - A session's recovery point is a *head* record listing the section hashes, plus the previous point's list.
  - Section texts are blobs keyed by session and hash.
  - A new point writes only the sections that changed, typically one scene or one field (hundreds of bytes to about
    100 KB). It writes them and the head in **one IndexedDB transaction**: a point is complete or absent, never partial.
  - Blobs referenced by neither the new point nor the previous one are deleted in that same transaction.
- **When it writes.**
  - The first write starts as soon as an edit's event handler finishes. While edits continue, writes are at most
    every 150 ms, and the last edit is always written.
  - Edit signals are every undo snapshot and every change broadcast. A check every 4–20 s (adapted to the cost of
    reading the project) catches changes made without a signal.
  - There is no reliance on a 2 s debounce or on `beforeunload`.
- **When the tab goes away** (`pagehide`, `beforeunload`, `freeze`, `visibilitychange` to hidden), Forge
  synchronously writes the sections not yet committed to localStorage (the *close-time record*), and tries a normal
  write too. On `pagehide` it also writes a *normal end* record with the session's last change count.
- **Per-edit marker.** Every edit synchronously records its sequence number in localStorage. A restore compares the
  recovered point with the normal-end record (reliable) or the marker (which can prove a loss but not completeness).
  It then says exactly what it restored:
  - **"Recovery restored: every change through …"** only when the session ended normally and the point covers its
    last change.
  - **"Recovered changes through … N later changes (made until …) could not be recovered."** when changes are known
    to be missing. This notice is shown as a persistent banner, not just a toast.
  - **"Restored every change Forge had recorded (through …). Forge or the browser ended unexpectedly, so changes made
    in its last moments cannot be confirmed."** after a crash or kill.
  - If a section fails its checksum, the previous complete point is restored. The message names the damaged section
    and the lost changes.
- **Sessions.**
  - Each tab holds a Web Lock for its lifetime, so another open tab's work is never offered as "recovery".
  - The most recent earlier session that holds work is offered. Restore writes the restored project into the new
    tab's journal *before* the earlier session's data is removed.
  - At most five earlier sessions are kept, and none older than 14 days. Blank sessions are not kept.
  - Records from the older single-record format are still offered once.
- **Indicators** in the status bar:
  - `● Unsaved changes` / `✓ Saved` say whether there are changes since the last project or browser save.
  - The recovery part reads `recovery ✓ HH:MM:SS`, `recovery saving…`, `recovery preparing…`,
    `recovery behind · N changes since HH:MM:SS` (after 2 s), `recovery failed · use Save As` or
    `recovery unavailable`. The tooltip gives the details.
  - Each state has its own level (`data-recovery`) and colour: `ok`, `busy` (blue), `behind` (amber), `failed`
    (red background, also used for "unavailable"). The text is shown in full at 10 px; it is never cut off.
- **The restore toast** names its outcome, like the notice:
  - "Recovery complete: every change came back";
  - "Recovery restored: the last moments before Forge ended cannot be confirmed — see the notice", after an
    unexpected end;
  - "Recovery incomplete: N changes were lost — see the notice".
  Before, an unexpected end with every change back still said "Recovery incomplete".

## Measured (`QA/project-recovery.cjs`, build `a6c05ae9…`, Ninja Gaiden investigated project, 5,743,162 characters)

| | |
|---|---|
| First recovery copy of the project | 5.74 M characters written in 61–269 ms (three runs) |
| Edit to durable recovery point | median 31 ms, max 40 ms (8 scene edits); metasprite edit 3 ms |
| Data written per edit | 661 characters (the changed section), not the 5.7 MB project |
| Reading the project's sections | about 12–14 ms |

| Scenario | Result |
|---|---|
| Tab closed right after scene and metasprite edits, before any write finished (browser kept running) | every edit restored; "every change" |
| Tab closed after the indicator showed ✓ | every edit restored; "every change" |
| Page refreshed right after the edits | every edit restored; "every change" |
| Browser process killed (SIGKILL) after ✓ | every edit restored; message says the browser ended unexpectedly (not "every change") |
| Browser process killed right after the edits | the edits were restored; same honest message |
| A stored section damaged | detected by checksum; previous point restored; message names the section and the lost change |
| Storage refusing writes and the close-time record failing | status showed "recovery failed · use Save As"; restore reported "8 later changes … could not be recovered" |
| Write aborted after its records were issued (deterministic) | previous point unchanged and checksum-verified; status "recovery failed"; the next write restored exactly |
| Browser killed 0/15/30/60/120 ms into the 5.7 MB first write | every restore was one complete, verified point. In three kills the write was still in flight, and the earlier project was restored intact. In two it had finished, and the large project was restored. None was a mix |
| A second tab while the first is open | the first tab's work is not offered; it is offered after that tab closes |

## Limits (reported, not hidden)

- **Immediate close cannot be guaranteed after a crash or browser kill.**
  - An edit made in the few tens of milliseconds before the browser process dies (before its IndexedDB commit:
    median 26 ms, max 77 ms measured) can be lost.
  - localStorage may not have reached disk either, so Forge cannot always tell. In that case the restore says it
    cannot confirm the final moments; it never claims completeness.
  - For a closed or refreshed tab while the browser keeps running, every edit was preserved in testing.
- **Power loss or an OS crash** depends on Chromium's IndexedDB durability ("relaxed" by default: committed data is
  handed to the OS, without a forced flush). This was not tested here.
- **First copy of a newly opened large project.** Until it is written (61–269 ms for 5.7 MB; the indicator shows
  "preparing…" or "saving…"), the close-time record cannot hold the whole project, because localStorage allows about
  5 MB.
  - If the browser dies in that window, the restore gives the previous point, for example the project open before
    the import. Its message says the final moments cannot be confirmed.
  - The opened file itself is not affected.
- **Close-time record size.** It is bounded by the localStorage quota. If the uncommitted changes exceed it, the
  restore reports them as lost.
- **Not recovered:** the undo history and the running emulator state, as before.
- **Storage use.** Each session keeps its own copy (5.7 MB for this project) until it is restored, dismissed or
  pruned (five sessions, 14 days).
