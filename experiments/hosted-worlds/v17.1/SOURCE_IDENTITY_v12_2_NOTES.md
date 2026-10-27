# NES Forge v0.12.2 — Source Identity Diagnostics (Experimental)

This is a **diagnostic patch, not a claim of restored town graphics**. It works with the v0.12/v0.12.1 localhost host protocol 12 and does not require replacing the server or its database.

## What the screenshot established

The previous **Restore original town graphics (2,6)** action rejected the source before uploading the image because either:

- the selected local World resource ID differed from the already hosted World resource ID, or
- the exact 64-character SHA-256 hash of the imported original ROM differed from the ROM used to initialize that hosted World.

The old single error message did not say which identity differed. This version displays both identifiers and hashes separately in **WORLD Live**. A mismatch must **not** be overridden blindly; different ROM revisions might supply different original graphics or room data.

## Use (optional)

1. Keep the existing v0.12.1 server and its database running; **do not republish/reset the World**.
2. Open `NES_Forge_3x_Source_Identity_v12_2_Diagnostic.html` locally, import the Zelda II source that you believe was used for the hosted world, and open **WORLD Live**.
3. Enter the existing admin token and select **Refresh Live**. Read **Hosted** vs **Forge** under source identity.
4. If only the World ID differs and the matching World is actually present in Forge, the interface offers **Select hosted World in Forge**. This changes the local selection, not the saved World or server.
5. If the original ROM SHA-256 hashes differ, reopen the specific ROM used to initialize the hosted world. The pilot server does not store the original ROM and cannot safely regenerate that source's art without it. **Do not delete the DB**.
6. If both match, use **Restore original town graphics**; still verify the player viewport yourself.

## What was tested

11 local checks passed using the supplied test ROM and a disposable localhost database: matching identity, 1024x240 art publication, separate diagnostics for differing World ID and ROM digest, rejection without writes, world and room preservation, and no JS page errors.

**Not yet accepted:** whether the source selected on the user's Windows machine matches their existing hosted world, and whether recovered town art is visible in both of their actual browsers. Until both are confirmed, treat the town graphic workflow as unresolved.

No native ROM writer changes, Git changes, wallet changes, server protocol changes, or public deployment.
