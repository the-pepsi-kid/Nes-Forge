# Local Hosted World reference draft

This is a **separate local service draft**, not completion or acceptance of roadmap 3.2, 3.3, 3.4.1 or 4.0. It implements the first ordinary-item authority experiment for later review, while the main roadmap proceeds one item at a time. It does not modify the Forge project, schema 12, cartridge runtime, emulator, build pipeline or exported ROM. It has no wallet or cryptocurrency connection.

The executable demonstration has two clients sharing a World and one ground item. The server decides who picked it up; requests carry a base revision and an idempotency key. Sessions, inventories, accepted/rejected receipts and issuance claims survive restart in a checksummed snapshot. A browser workshop exercises the actual HTTP API.

## Run locally

Use Node.js 20 or later. No npm dependencies or installation step are required. From the application directory containing `hosted/`:

```sh
node hosted/server.cjs --data ./forge-hosted-data --port 8787
```

Open the printed `http://127.0.0.1:8787` address in a browser. The process binds only to `127.0.0.1`. Port `0` requests a free ephemeral port. To stop, press Ctrl+C; this closes the HTTP server and releases its exclusive data lock. Restart with the same `--data` directory to reopen the same World. Nothing is deployed publicly.

The browser workshop is a host-service inspector, not a replacement game engine or a NES game. A connected NES cartridge/emulator bridge has not been implemented by this draft. The main Forge HTML has no new Hosted control or automatic network request.

## Two-client review

1. Open the address in one tab, create Alice, and save her reconnect key.
2. Open the same address in another tab and create Bob. Each tab has a separate session; if your browser copied the first tab's session storage, use Create player in the second tab to create Bob.
3. Refresh both tabs. Both start at `(0, 0)` beside the single training blade at `(1, 0)`.
4. Attempt Pick up in both tabs. One request wins. The other sees a stale revision or an unavailable item. Refresh both and verify exactly one inventory owns the blade.
5. In the winning tab, choose Retry last identical request. It returns the same outcome and does not issue another item.
6. Equip the blade. Transfer it to the other player. The original owner loses possession and equipped status; the recipient receives the same item ID.
7. Move to `(1, 0)`, store the item in the chest at `(1, 1)`, then retrieve it. Chest inventories are private to their owner.
8. Gather a berry next to `(0, 1)`. Each player has one server-issued bush claim. Using a berry heals two points from the initial five health, consumes it and keeps its identity as a tombstone. Repeating Gather cannot issue the claim again.
9. At the vendor/chest, buy a berry for two ordinary game coins. Two berries craft one potion. The price, quantities, recipe and supply limits are server-defined.
10. Stop and restart the server with the same directory. Refresh the tabs or paste the saved reconnect tokens. Verify positions, ownership, health, coins and chest contents persist. Retry a previous accepted request.

A reconnect key is a bearer credential for one local player. Save it privately. The browser retains it in session storage for tab reloads; downloaded keys are a deliberate user action. Disconnect this view clears that tab's session without deleting the server player. Registration is not an account-recovery system; a lost registration response or lost key can leave an unreachable test player. There is no password reset or session revocation interface in this profile.

## HTTP and domain contracts

| Route | Behavior |
| --- | --- |
| `GET /v1/health` | Reports the declared local profile and explicitly unavailable wallet/ROM bridge capabilities. |
| `POST /v1/sessions` | JSON `{ "name": "Alice" }`; returns random player/session identity, a 256-bit bearer token and a projection. |
| `GET /v1/state` | `Authorization: Bearer TOKEN`; returns this player's bounded projection. |
| `POST /v1/intents` | Same authorization; versioned intent envelope below. |

```json
{
  "version": 1,
  "requestId": "unique-request-id",
  "baseRevision": 2,
  "intent": { "type": "pickup", "payload": { "itemId": "welcome-blade" } }
}
```

After a lost response, retry the **identical** envelope. Do not change its revision, payload or request ID. Reuse of an ID with different content is rejected. A previously rejected request remains rejected when retried. After an explicit stale result, refresh and create a new request ID for a new action. Receipts are recorded atomically with the mutation before a success response is sent.

`domain.cjs` owns movement, range, item ownership, equipment, consumption, gathering, ordinary vendor/recipe rules, issuance and projections. `service.cjs` owns session authentication, revision checks, idempotency and durable transaction orchestration. `server.cjs` owns HTTP, JSON/body validation, origin policy and static workshop files. No networking callback changes canonical gameplay rules.

Item instances preserve an ID, issuing World, source definition/version, local mapped definition, quantity, claim ID and owner/location. Transfer and chest actions move an existing item; they do not mint a replacement. Fully consumed instances remain recorded with quantity zero. Player/session identities persist across reconnect; the profile does not infer player identity from a client-supplied player ID.

## Storage, backup and recovery

The single-process store serializes mutations, writes a new checksummed snapshot to an exclusive temporary file, fsyncs it, renames it, then fsyncs the directory. It acknowledges an outcome only afterward. A write or sync failure blocks the process from accepting further outcomes until restart. A restart reads and validates the snapshot; corruption fails closed rather than silently creating a fresh World. `world.lock` prevents two server processes opening the same data. A verifiably dead PID on the same host can be recovered; unknown host/permissions and ambiguous lock state fail closed. An interrupted lock-recovery guard requires operator inspection rather than unsafe automatic deletion.

The initial automated durability evidence is on the available Linux filesystem. Other filesystem/platform guarantees, power-loss hardware behavior and unreliable/network filesystems are not certified. Keep a data directory on local storage. Do not copy an active World to start a second authority for the same items: a backup is for recovery, not parallel item issuance.

Stop the server before backup. From the application directory:

```sh
node hosted/manage.cjs backup ./forge-hosted-data ./Forge_World_Backup.json
node hosted/manage.cjs check ./Forge_World_Backup.json
node hosted/manage.cjs restore ./forge-hosted-restored ./Forge_World_Backup.json
node hosted/server.cjs --data ./forge-hosted-restored --port 8787
```

Backup refuses an active data lock and an existing output file. Restore validates the snapshot and requires a **new, nonexistent** target directory. Restore never silently replaces a live World. Backups contain session token hashes and gameplay state; protect them as private local data. Stop the original authority before starting a restored copy. Artifact update/rollback, schema migrations and remote deployment are not implemented.

## Explicit imported-issuer policy

New Worlds default to no accepted external issuers. A creation-only `--config WORLD_CONFIG.json` may declare `acceptedIssuers`, each with an Ed25519 public key and exact remote-definition/version to local-definition mappings:

```json
{
  "id": "demo-world",
  "name": "My local item workshop",
  "acceptedIssuers": {
    "friendly-world": {
      "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n",
      "definitions": { "fruit@1": "berry" }
    }
  }
}
```

The `importVoucher` intent accepts `{voucher, signature}`. The voucher fields are `issuerWorld`, `destinationWorld`, `playerId`, `sourceItemId`, `claimId`, `definitionId`, `definitionVersion`, and `quantity`. `voucherMessage()` defines the canonical signed bytes; the signature is base64-encoded Ed25519. The server verifies the issuer, signature, exact destination/player, allowed definition version and local stat mapping. It records both the source-item claim and voucher claim; replay cannot issue a second local instance.

This is an opt-in **ordinary-item issuer attestation**, not a blockchain token, transferable financial asset, cross-World escrow, or proof that another server destroyed its original item. Correct issuing behavior remains a trust assumption. The host accepts no private signing keys. Tests generate an independent temporary keypair and verify accepted, tampered, wrong-destination, unmapped and replayed vouchers. A full cross-World protocol remains pending.

## Fixed profile limits and unfinished work

| Limit | Current value / consequence |
| --- | --- |
| Map | One 16 × 15 cell World; cardinal moves; no arbitrary ROM/map/collision decoding. |
| Players/sessions | 32 persistent test players; no deletion, expiry, revocation, rate limiting or production account system. |
| Item records | 256 including consumed tombstones; no silent identity eviction. |
| Inventory / chest | 8 / 16 slots per player; quantity 1–99 per instance. |
| Projection | Self plus nearby actors within four cells on each axis, at most 12 actors; omission count is explicit. |
| Persistent byte projection | Exactly 64 bytes with basic player/inventory tags. These are **not** copied into ROM RAM. Full stable IDs remain in the host JSON contract. |
| Receipts | 4,096; capacity refusal preserves old replay protection. No compaction/archive migration yet. |
| Snapshot | 16 MiB; mutations refuse to exceed it. |
| HTTP | 16 KiB request JSON; 64 simultaneous TCP connections; 10-second request/header timeout; exact loopback Host and same-origin policy; no CORS wildcard, remote bind or TLS. |

Future work includes a compatible 6502 host bridge and memory/event bindings, deterministic game/session simulation, authored chunk streaming, actor simulation/combat, construction/destruction and persistent bases, general economy authoring, robust accounts/session lifecycle, remote transport/deployment, production security review, performance/capacity measurement, update/rollback, hardware roles and external-device acceptance. Wallets, minting, loss settlement, traditional netplay and mesh are absent. This draft does not satisfy the roadmap's finite Audio/RE acceptance gate or promote later milestones.

## Automated checks

```sh
node hosted/test.cjs
```

The script outputs one JSON report with explicit per-case records and exits nonzero on any failure. It runs real loopback HTTP requests, separate-process kill/restart, and filesystem backup/corruption/failure cases. It includes two-client races, replay/reconnect, authoritative item/range rules and opt-in issuer validation. Temporary data and child processes are cleaned up. This is model/HTTP/storage evidence; it does not establish visual-browser, speaker, phone, physical controller, NES hardware or public-service acceptance.
