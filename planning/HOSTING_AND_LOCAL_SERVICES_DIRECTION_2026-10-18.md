# Hosting and optional local services direction

**Status:** accepted future direction, documented October 18, 2026. This checkpoint changes documentation only; it introduces no runtime features, network requests or saved-format changes. The active Audio/RE priority remains driver mapping, catalog discovery and validated recovery of music, SFX and their coding methods. A short recovered phrase is evidence toward that goal, not completion of it. Preserve the finite sequencing in [the roadmap](../app/ROADMAP.md).

## One application, optional capabilities

Distribute NES Forge as one self-contained HTML file. Maintain modular source and bundle it into that artifact. Users can open Forge for offline authoring and local play; optional services extend it when available. One-file distribution does not mean that external servers run inside the file.

| Operating profile | Proposed behavior | What must remain running |
| --- | --- | --- |
| Offline | Author, import, save and play locally | The browser while using Forge |
| Browser Host/Join | One browser owns the session's game state; peers connect using WebRTC | Host browser and device, plus any required connection services |
| Service-assisted | The same HTML connects to selected PC, cyberdeck or LAN services | Only the services needed for the chosen capabilities |

For convenient browser rooms, support configurable signaling and STUN/TURN services. Manual offer/answer exchange can be a fallback where network conditions permit. Joining a room must establish the project/build identity, supported protocol and input/state synchronization rules. Two-player gameplay requires compatible game behavior and player assignments; connectivity alone does not add multiplayer to a ROM.

## Service capabilities

Services may advertise one or several capabilities:

| Capability | Responsibility |
| --- | --- |
| Project storage | Save/load, backups and revision checks through Forge's existing project format |
| Persistent hosting | Own the simulation, session rules, durable world state and restart/reconnect behavior |
| Connection services | Room discovery, signaling or traffic relay, as supported |
| Build and analysis tools | Run explicitly requested jobs and return identified outputs and diagnostics |
| Device bridge | Expose supported hardware operations and inputs through a defined interface |
| Optional identity | Authenticate identities, including wallet signatures where supported |

A wallet is optional identity, not a server address or a requirement for offline use. A service that serves the HTML over HTTP is a launcher/content server; persistent gameplay additionally needs an independent process that runs the simulation and owns durable state.

## Connection contract

The user selects an endpoint or pairs a device. Forge then discovers that service's capabilities; it does not scan arbitrary localhost ports. A versioned handshake identifies the service, protocol, capabilities, limits and authentication requirements. Unsupported versions fail clearly; unavailable features remain explained in the UI.

Authorize access to the relevant projects, jobs or devices. Services independently validate requests and the approved browser origin. Keep credentials and machine-specific paths out of portable project exports. Validate returned data and artifacts through the existing owners; do not execute arbitrary JavaScript supplied by a service. `ProjectStore`, `BuildGraph`/`RuntimeCompiler` and `EmulatorBridge` retain their responsibilities under [the architecture contract](../app/ARCHITECTURE_CONTRACT.md).

Test secure-context, origin/CORS, mixed-content and local-network permission requirements on supported browsers. Do not assume every `file://` page can reach every local endpoint. A companion can serve the same unchanged HTML from localhost to provide a compatible origin; cross-device LAN access needs its own tested configuration. Do not require disabling browser protections.

## Authority, interruption and recovery

Each session declares exactly one game-state authority: the browser host or a service host. Browser hosting lasts only while that browser can execute; background suspension, device sleep and closure must be handled. Persistent hosting requires the separate service process to remain available.

On connection loss, pause or disconnect the affected session and retain independent offline editing where appropriate. Never silently create a competing authority. Reconnection checks session identity and revision before resuming. Any future host handover needs an explicit state-transfer protocol. Saving a project and saving a running world are distinct operations.

## Existing groundwork and missing integration

The application already has project serialization and compile/load/run/pause/reset/step boundaries. Its local timeline checkpoints are not a portable network snapshot API. Current controller input supplies one local NES port; the second controller is disconnected. Existing `BroadcastChannel` authoring synchronization is within the same browser, not cross-device gameplay.

The [local Hosted World draft](../app/hosted/README.md) demonstrates a loopback Node service with ordinary items, sessions, revisions and durable state. It has no Forge emulator bridge and does not establish production hosting, wallet support or multiplayer runtime compatibility. Future integration must preserve these distinctions.

Keep display/input profiles separate from game behavior: monochrome, grayscale and full-color presentations can share the application model. Browser and device performance still need measurement. A future browser runtime target should compile authored canonical projects; recovered ROM behavior can join that model only where its semantics have been validated.

## Implementation acceptance

Verify offline use without services; successful and incompatible handshakes; project save/load preservation; safe interruption/reconnection; one authoritative world across host restart; and each supported browser/device profile. Validate multiplayer inputs and runtime state independently of transport. These are future acceptance requirements, not results from this documentation checkpoint.

## Browser references

- [WebRTC peer connections and signaling](https://webrtc.org/getting-started/peer-connections)
- [Browser page lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [Local Network Access permissions](https://developer.chrome.com/blog/local-network-access)

Browser policies evolve; recheck the relevant documentation and actual target browsers when implementing the connection contract.
