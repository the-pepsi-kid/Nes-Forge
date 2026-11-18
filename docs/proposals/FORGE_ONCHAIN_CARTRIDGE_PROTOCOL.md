# Forge Native On-Chain Cartridge Protocol — research proposal

**Status:** conceptual, not shipped, no deployments, financial commitments or mainnet minting. Distinct from the existing offline NES Forge editor and 800-title recovery program.

## Desired property: actual bytes on the chain

No Pinata/IPFS/HTTP metadata pointer standing in for content. Store complete *original or appropriately licensed* 8-bit asset bytes in EVM immutable contract code using an SSTORE2-style pattern. Retrieve them through an ordinary Ethereum-compatible RPC and verify the expected cryptographic hash before decoding. A Node/browser client and RPC are transport; no web asset host is the source of truth. Blockchain nodes are still required to access a chain when online.

**Small first target:** one authored 2-bpp CHR sprite, palette indices, animation timing, optional bounded collision/behavior data. Canonical binary schema includes `magic`, `version`, format, asset type, byte lengths, source/compiler version, hash and optional dependencies. Prefer raw bytes/compact binary rather than JPEG/PNG representations. Testnet readback must reconstruct **exactly the same bytes** and display in Forge; prove the SHA-256 matches before adding token identity.

## Complementary layers

| Layer | Purpose | First milestone |
|---|---|---|
| **SSTORE2-style immutable chunks** | Store and read actual binary content in contract runtime bytecode | deployed testnet chunks, byte-for-byte readback |
| **ERC-721** | Give an original cartridge a transferable token identity | token ID points to canonical manifest/root hash |
| **ERC-6551** | Optionally allow the cartridge token to control an account and own other asset tokens | demonstrate account ownership and asset transfer in a later test |
| **ERC-1155** | Optional tokenization of editions or component assets | only after licensing, versioning and composition tests |

These are *not* alternatives: SSTORE2 addresses storage, ERC-6551 addresses ownership of an account. Bytecode limits require chunking and a manifest; avoid assuming every full NES ROM fits one contract. Evaluate deployment gas, chain fee volatility, calldata, storage availability and long-term L2 assumptions with measured costs. Do not use temporary transaction blobs as permanent storage.

## Offline cartridge build vs blockchain read

Forge should always support a local project/ROM workflow independent of wallet or chain. The on-chain importer is an **optional source adapter** to the same resource manifest. The browser can read bytes from an RPC, validate chunk order/hash, decode and assemble a local ROM/project; the **original NES hardware cannot query Ethereum**. Physical-hardware targets need assets compiled into the ROM or separate external hardware. Ethereum does not natively run 6502 code; any execution happens in Forge/another emulator unless a separate EVM 6502 interpreter is deliberately built.

**Minting assistant:** an AI model may suggest metadata or packing, but contracts and bytes must be deterministically validated and only a human wallet signs deployments/mints. No automated spending. A token holder's control does not itself establish copyright, licensing authority or third-party permission. Do not mint/release commercial NES content without rights.

## Proposed acceptance checks

1. Define and test a canonical byte-level asset format using an original sprite; include versioned byte order and hash.
2. Store the entire payload in testnet runtime bytecode; demonstrate raw node/RPC retrieval with no external asset URI.
3. Decode in Forge, show animation, and compare original/recovered SHA-256 and rendered output.
4. Measure gas for multiple asset sizes and chunk configurations; document immutable version upgrades.
5. Add ERC-721 and ERC-6551 only after direct-byte readback works; transfer semantics and licensing require dedicated tests.
6. Add optional wallet integration without breaking single-HTML offline usage or turning native ROM import into a crypto requirement.

## Primary references

- [SSTORE2 / 0xSequence](https://github.com/0xsequence/sstore2)
- [Solady SSTORE2](https://github.com/Vectorized/solady/blob/main/src/utils/SSTORE2.sol)
- [ERC-721](https://eips.ethereum.org/EIPS/eip-721), [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155), [ERC-6551](https://eips.ethereum.org/EIPS/eip-6551)

This proposal replaces neither the source-ROM compliance rules nor the existing `ProjectStore`/Resources architecture.
