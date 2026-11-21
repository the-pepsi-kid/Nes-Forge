# Agent Lab local worker: connection security

Status: implemented on `dev/alpha-13-studio-restore` (capture worker v0.4.1, Forge Background investigation panel).
Tests: `tools/agent-lab/tests/capture_worker.test.cjs` (unit) and `QA/one-rom-loop.cjs` step 13 (end to end).

## The problem

Forge is a single HTML file. It is usually opened from `file://`, and it also has to work when hosted. The worker
(`tools/agent-lab/capture_worker.cjs serve`) is a local HTTP service that holds the user's ROM copies, emulator
checkpoints and capture results. Forge must reach it from the browser. No other page, in any tab, may use it.

What can reach a loopback service:

| Caller | Can send a request | Can read the response | Origin it sends |
|---|---|---|---|
| Forge from `file://` | yes | if CORS allows `null` | `null` |
| Any web page (`https://…`) | yes ("simple" requests without preflight, or with CORS) | only if CORS allows its origin | its origin |
| A sandboxed iframe, a `data:` page, some redirects, other `file://` pages | yes | if CORS allows `null` | `null` |
| A DNS-rebinding page (`evil.example` resolving to 127.0.0.1) | yes, same-origin to itself | yes, without CORS | `evil.example` (and `Host: evil.example`) |
| Local processes of the same user | yes | yes | none |
| Other users on the machine | yes, unless the API refuses | if the API answers | none |

So `Origin: null` cannot identify Forge, because sandboxed frames and `data:` pages send it too. An origin check alone
is not authentication. The previous version used a shared token typed into Forge and stored in localStorage, with
CORS `*`, and the token file was readable by every local user. It is replaced as described below.

## The strategy: pairing plus signed requests

1. **Pairing code, single use.** When the worker starts, or on `capture_worker.cjs pair --root <folder>`, it prints
   an 8-character code (about 40 bits). It is valid for 10 minutes and accepted once. Five wrong attempts invalidate
   it, and every failure counts toward a limit of 30 per minute. Only the SHA-256 of the code is stored, in
   `pairing.json` (mode 0600).
2. **Exchange.** In Forge's Background investigation panel, the developer enters the worker address and the code.
   `POST /pair` returns a client id and a random 256-bit secret, once. Forge imports the secret with
   `crypto.subtle.importKey('raw', …, {name:'HMAC', hash:'SHA-256'}, extractable=false, ['sign'])`, zeroes the raw
   bytes and stores the resulting `CryptoKey` in IndexedDB (`nes-forge-agent-lab`/`pairing`). Script cannot read the
   key back, and it never appears in the UI, localStorage, the project or a screenshot.
3. **Every request is signed.** Headers `X-Forge-Client`, `X-Forge-Time`, `X-Forge-Nonce` and `X-Forge-Signature`.
   The signature is HMAC-SHA-256 over `METHOD \n path \n time \n nonce \n SHA-256(body)`. The worker checks:
   - the client exists and has not been revoked;
   - the time is within ±2 minutes;
   - the nonce has not been seen before (replay);
   - the signature, compared in constant time.
   Changing the body, the path or the method breaks the signature.
4. **Defence in depth around the signature:**
   - The worker binds `127.0.0.1` only.
   - The `Host` header must be `127.0.0.1:<port>`, `localhost:<port>` or `[::1]:<port>`, which defeats DNS
     rebinding (421 otherwise).
   - A request with an `Origin` outside the allow-list is refused before anything else (403), and no CORS headers
     are sent to it.
   - The allow-list is `null` (Forge from `file://`) plus any `--allow-origin https://…` given by the user, for a
     hosted Forge.
   - CORS reflects only an allowed origin (never `*`), with `Vary: Origin`. Private Network Access is allowed only
     for those origins.
   - Responses are `Cache-Control: no-store`. Bodies are limited to 16 MiB.
5. **Scripts** (QA, the CLI) use the admin token in `<root>/token` (mode 0600) in `X-Forge-Agent-Token`. It is refused
   whenever an `Origin` header is present, so no browser page can use it, even if it learned it.
6. **Files.**
   - The root folder (when the worker creates it) and `jobs/`, `roms/`, `checkpoints/` are 0700.
   - `token`, `clients.json`, `pairing.json`, `worker-id`, job files and ROM copies are 0600.
   - The root must be outside any Git checkout.
   - On Windows, `chmod` cannot express this. Use a folder under the user profile, whose ACLs restrict access.
7. **Revocation.** "Forget pairing" in Forge deletes the local key and revokes the client on the worker
   (`DELETE /clients/<id>`). `capture_worker.cjs clients --root <folder> [--revoke <id>]` lists or revokes clients.

## What this protects, and what it does not

- **Protected.**
  - Any web page, sandboxed frame, `data:` page or rebinding host gets 401, 403 or 421. It never receives ROMs,
    checkpoints, results or job control.
  - Other local users cannot read the secrets or data (POSIX modes).
  - A captured request cannot be replayed or altered.
  - The secret cannot be copied out of the browser through script, storage dumps or screenshots, because the key is
    non-extractable.
- **Not protected.**
  - Script running in Forge's own origin can *use* the stored key while it runs. For `file://` in Chromium, that
    includes other local HTML files the user opens, because file pages share storage. It can sign requests, but it
    cannot extract the key.
  - Malware running as the same OS user can read the 0600 files.
  - Both are outside what a local web service can defend against. The second already has the user's ROMs.
- **Alternatives considered.**
  - *Serve Forge from the worker (same origin, strict Origin check).* Strong isolation, but Forge's projects,
    library and recovery live in the `file://` origin's storage and would not be visible there. Forge would also
    depend on the worker.
  - *Native messaging or a browser extension.* Per-browser installation, against the standalone design.
  - *Origin allow-list without a secret.* Insufficient, because `null` is forgeable.
  - *Plain bearer token.* Visible, copyable and replayable. This was the previous design.

## Operating it

```bash
node tools/agent-lab/capture_worker.cjs serve --root <private folder> --forge NES_Forge.html
```

The worker prints `pairing code ABCD-EFGH`. In Forge, open Background investigation, then enter the address and the
code, then click Pair. Pairing is remembered in this browser profile across worker restarts.

To get a new code while the worker is running:

```bash
node tools/agent-lab/capture_worker.cjs pair --root <private folder>
```

For a hosted Forge, add `--allow-origin https://your.host`.
