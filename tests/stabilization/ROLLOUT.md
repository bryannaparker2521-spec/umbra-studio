# Stabilization rollout plan — instructions only

Development implementation: `0eb8189`, branch `feature/v1.3.0-development`. Nothing in this document has been deployed. Apply the migration before deploying the corresponding Worker; publish a desktop update only after a separately authorized release.

## Verified prerequisites

Frontend build and Worker TypeScript checks pass. The regression suites cover import matching, live canonical IDs, deletion, archives, permissions, search, full source, relationship resolution, and navigation. Tests use synthetic accounts and an isolated local Cloudflare runtime, with no production writes.

## Authorized deployment procedure

1. Confirm the intended development commit and production account/database. Database ID: `69ef2ac8-202d-494d-a342-5f44f39f5fb9`. Existing Worker and R2 bindings remain unchanged.
2. Temporarily stop editing/importing records during rollout. Record the current Worker version and D1 recovery point. Export a backup outside the repository using an authenticated Cloudflare connection. Never include database backups or credentials in a Git commit.
3. Inspect the production schema and existing migration tracking. Migration 0014 contains non-repeatable `ADD COLUMN` statements. Check every added column and trigger before applying it, and do not blindly replay the file if any portion was previously applied. The repository stores numbered SQL files at the Worker root; do not assume Wrangler's default migrations directory includes them.
4. Apply `umbra-studio-cloud/0014_stabilization_lifecycle.sql` once to the verified database, using the existing authenticated migration process. Record successful application in the existing migration tracking process. Confirm archive and import metadata columns, the pending relationship table, indexes, and deletion triggers.
5. Recheck active and archived record counts and `PRAGMA foreign_key_check`. The migration adds schema; it must not create lore placeholders, repopulate deleted records, or delete unknown production records.
6. Run the Worker TypeScript check and Wrangler deployment dry run, then deploy the matching Worker only after authorization. Verify authentication, active list filters, Favorites, Archive, canonical opening, and a controlled create/update/archive/restore/delete sequence in an appropriate staging environment.
7. Build and publish the desktop artifact through the existing updater signing identity only after the release is authorized. No replacement key, public-key change, version bump, tag, main merge, or updater publication is included in this pass.

## Commands to adapt after authorization

Run from `umbra-studio-cloud`, using its installed Wrangler. These are documented commands, not an instruction to execute them immediately:

```
npx wrangler d1 export umbra-studio-production --remote --output <private-backup-path>
npx wrangler d1 execute umbra-studio-production --remote --file 0014_stabilization_lifecycle.sql
npx tsc --noEmit
npx wrangler deploy --dry-run
npx wrangler deploy
```

Inspect migration status and schema before the execution step. Keep backup paths outside the repository. Current command syntax was checked against [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/wrangler-commands/) and [Wrangler deployment documentation](https://developers.cloudflare.com/workers/wrangler/commands/).

## Recovery and remaining desktop checks

If Worker smoke checks fail, return to the recorded previous Worker version. Do not casually drop new columns or restore a whole database over newer user edits; use the recorded recovery point and an assessed recovery plan. Migration 0014 is additive, so an older Worker can usually ignore the new schema, but verify that against the selected rollback version.

Installed speech voices currently exposed by the browser are David, Mark, and Zira. Audible quality and playback in packaged Tauri require a desktop check. Windows installer/updater behavior must also be verified before publishing another signed release.
