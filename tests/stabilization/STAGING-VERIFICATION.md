# Umbra Studio — isolated staging verification and production gate

## Scope and completion

The original 85-section plan remains the scope. The connected code implementation and staging-testable acceptance work are complete. Full release acceptance is **not complete**: audible speech quality inside packaged Tauri, Windows installer/updater execution, and production-specific rollout checks cannot be certified by remote staging. No production deployment or desktop publication is authorized or performed. The future Umbra Connect migration and a full Music/public website subsystem remain intentionally outside this brief.

## Isolated resources

- Worker: `umbra-studio-stabilization-staging`
- URL: `https://umbra-studio-stabilization-staging.bryannaparker2521-d60.workers.dev`
- D1: `umbra-studio-stabilization-staging`, ID `97ac25ac-1e1f-45a2-bd5f-deac0282c872`
- R2: `umbra-studio-stabilization-staging-media`
- Existing binding names are preserved, but staging maps them exclusively to these isolated resources. Dedicated configuration: `umbra-studio-cloud/wrangler.staging.jsonc`. Synthetic sessions use random temporary tokens and expire after eight hours. No credentials are committed.

Staging was initialized from the validated pre-0014 schema (157 DDL statements), not copied production records. Migration 0014 executed successfully as 40 statements. Synthetic admin/editor accounts and Ezra support regression tests. The staging foreign-key check returned no violations. A read-only production column inspection confirms migration 0014 remains pending; no production write was made.

## Completed changes and failures fixed

- Canonical navigation, clear creative World vs Database vs independent Media, global Archive, shared management selection, direct opening, recent/review hierarchy, search and Back.
- Explicit structured boundaries, imperfect lore import, full source and unknown fields, native destination provenance, clear CREATE/UPDATE/REVIEW outcomes, safe slugs and actual IDs.
- Consistent archive filters, permanent deletion, reference cleanup, safe orphan maintenance and non-resurrecting revisions.
- Deletion now stops and reports an error when dependency lookup fails. Native World/Story/media references and parent-child cascades are included in dependency counts.
- Raw import name matching now filters actual record type IDs; ambiguous same-name/type records require review instead of choosing an arbitrary target. The earlier concern about stale local aliases was corrected: those aliases already referenced the fresh snapshot.
- Legacy Explorer archive/restore uses shared lifecycle refresh. Review comments and continuity issues have identifiable management labels.
- Media and Journey can be real pending-relationship targets. Reader adds paragraph/section pauses while preserving cancellation and one active session.
- Test harness fixes: compressed response headers, transient read-only connection reset retries, waits for confirmed mutation refresh, and repeatable synthetic fixtures. Mutating requests are never automatically retried.

## Final acceptance results

- API regression: 37 passed.
- Structured/lifecycle API: 42 passed.
- Navigation/import/lifecycle browser: 59 passed.
- Expanded manuscript/Back/appearance browser: 16 passed.
- Dependencies/auxiliary/canon/media API: 27 passed.
- Management workspace browser: 18 passed.
- Negative mutation/import browser: 2 passed.
- Reader content/control browser: 6 passed.
- My Profile/Training/messaging/storage API: 10 passed.
- Continuity/stat cards/Backup browser: 9 passed.
- Direct staging-mode frontend connection: 1 passed.

**Total: 227 checks passed against isolated remote staging.** Frontend production build, Worker TypeScript check and dedicated staging deployment dry run pass. The existing roughly 663 kB frontend bundle-size warning remains.

## Exact production database migration

Only `umbra-studio-cloud/0014_stabilization_lifecycle.sql` is pending for this update. No new migration 0015 was needed for the staging fixes. Apply once after the existing 0013 schema; do not replay non-repeatable column additions. The exact SQL is included as a separate artifact. It adds archived_at to nine existing native tables, updated_at to Journey, import_metadata to Locations/Timeline and five Story tables, archive indexes, the pending relationships table, and twelve canonical deletion-cleanup triggers. It does not seed canon, resurrect records, or delete production content during schema application.

## Worker and desktop changes ready

Worker: existing `index.ts` and `navigation.ts`, new `lifecycle.ts`, shared slug helper, and migration 0014. Production readiness includes live ID verification, archived filters, per-user review/search, safe favorites, lifecycle/bulk/managed deletion, dependency reporting, integrity cleanup and pending relationship resolution. Staging and production configurations are separate; the production configuration is unchanged.

Desktop/frontend: `App.tsx`, `App.css`, `Reader.tsx`, `RecordManager.tsx`, `structuredImport.ts`, and the optional `VITE_UMBRA_CLOUD_URL` setting in `umbraCloud.ts`, with existing slug/navigation systems reused. A direct staging-mode UI smoke test confirmed all Worker requests target staging without interception. The app version remains 1.3.0, Tauri updater public key and existing signing identity remain unchanged, and no installer/release/tag/main merge was created. Release numbering and native signing/build require a later explicit release approval.

## Remaining validation and recommended next action

Listen to narration inside packaged Tauri using the actual exposed system voices (David/Mark/Zira on this machine). Functional selection and preference behavior were tested with instrumented voices; no claim of natural audible quality is made. Test Windows installation/update in an appropriate test installation without overwriting the existing published release. Production deployment must still capture a fresh backup/recovery point, recheck migration columns, apply 0014 once, deploy the exact approved Worker, and smoke-test the production binding/authentication. Staging cannot prove production permissions, existing production content behavior under the new migration, Windows policy/installer restart behavior, or subjective voice/creative UX quality.

Recommended next action: review this staging report and authorize the production **database migration and Worker deployment** separately from the signed desktop release, keeping a fresh database recovery point and the previous Worker version. Nothing crosses that gate until explicitly approved.

## Original 85-section traceability

Section 0 working rules: repository/branch inspected, safe checkpoint preserved, no main edits/release/production write. Every original numbered section remains below. “Architecture audited” denotes requirements the brief explicitly frames as preparation, not a newly built external subsystem.

| Step | Original requirement | Evidence / status |
|---|---|---|
| 1 | THE SMART INGEST TEST PROVED THE PARSER IS BROKEN | Structured and raw-import browser/API checks; fresh canonical matching and ambiguity tests |
| 2 | SMART INGEST MUST HAVE TWO PARSING MODES | Structured and raw-import browser/API checks; fresh canonical matching and ambiguity tests |
| 3 | STRUCTURED PARSER CONTRACT | Structured and raw-import browser/API checks; fresh canonical matching and ambiguity tests |
| 4 | CHATGPT SHOULD NOT NEED PERFECT FORMATTING TO USE SMART INGEST | Structured and raw-import browser/API checks; fresh canonical matching and ambiguity tests |
| 5 | UNSTRUCTURED IMPORT MODE | Structured and raw-import browser/API checks; fresh canonical matching and ambiguity tests |
| 6 | IMPORT PREVIEW MUST EXPLAIN WHAT THE SYSTEM THINKS | Structured and raw-import browser/API checks; fresh canonical matching and ambiguity tests |
| 7 | IMPORT_ACTION: AUTO | Structured and raw-import browser/API checks; fresh canonical matching and ambiguity tests |
| 8 | RECORD EXISTENCE MUST COME FROM D1 — NOT FRONTEND MEMORY | Structured and raw-import browser/API checks; fresh canonical matching and ambiguity tests |
| 9 | DO NOT AUTOMATICALLY RESURRECT DELETED RECORDS | Structured and raw-import browser/API checks; fresh canonical matching and ambiguity tests |
| 10 | ARCHIVE MUST ACTUALLY WORK | Twelve canonical lifecycle types, eighteen management destinations, native dependency counts and safe deletion failure tests |
| 11 | ARCHIVED GETS ITS OWN LEFT-SIDEBAR DESTINATION | Twelve canonical lifecycle types, eighteen management destinations, native dependency counts and safe deletion failure tests |
| 12 | DELETE MUST EXIST EVERYWHERE IT MAKES SENSE | Twelve canonical lifecycle types, eighteen management destinations, native dependency counts and safe deletion failure tests |
| 13 | SINGLE DELETE + MULTI-SELECT DELETE | Twelve canonical lifecycle types, eighteen management destinations, native dependency counts and safe deletion failure tests |
| 14 | DELETE CONFIRMATION | Twelve canonical lifecycle types, eighteen management destinations, native dependency counts and safe deletion failure tests |
| 15 | CASCADE / REFERENCE CLEANUP | Twelve canonical lifecycle types, eighteen management destinations, native dependency counts and safe deletion failure tests |
| 16 | FIX THE WORLD DATABASE PAGE — IT IS TOO BUSY | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 17 | SEPARATE "WORLD" FROM "DATABASE MANAGEMENT" | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 18 | WORLD SHOULD BE ABOUT THE WORLD — NOT DATABASE ADMINISTRATION | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 19 | DATABASE SHOULD BE ITS OWN WORKSPACE | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 20 | PUBLIC ENCYCLOPEDIA / PUBLISHING | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 21 | MEDIA MUST BE A REAL INDEPENDENT WORKSPACE | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 22 | MEDIA IMPORT | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 23 | MEDIA RELATIONSHIPS | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 24 | CLEAN PAGE-LEVEL UI | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 25 | WORLD DATABASE STAT CARDS | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 26 | GLOBAL ARCHIVE VS DATABASE ARCHIVE | Sidebar destination browser checks, independent Media upload, stat cards, global Archive and Continuity tests |
| 27 | SMART INGEST SHOULD CREATE REAL RECORDS, NOT TEXT DUMPS | Full source/custom fields, real canonical IDs, typed relationships, slug collisions and attributed canon revision tests |
| 28 | PRESERVE SOURCE MATERIAL | Full source/custom fields, real canonical IDs, typed relationships, slug collisions and attributed canon revision tests |
| 29 | RELATIONSHIP RESOLUTION | Full source/custom fields, real canonical IDs, typed relationships, slug collisions and attributed canon revision tests |
| 30 | IMPORT ORDER SHOULD NOT MATTER AS MUCH | Full source/custom fields, real canonical IDs, typed relationships, slug collisions and attributed canon revision tests |
| 31 | DUPLICATE PROTECTION | Full source/custom fields, real canonical IDs, typed relationships, slug collisions and attributed canon revision tests |
| 32 | RECORD TYPES MUST SUPPORT UMBRAL GENESIS LONG TERM | Full source/custom fields, real canonical IDs, typed relationships, slug collisions and attributed canon revision tests |
| 33 | RELATIONSHIPS ARE FIRST-CLASS DATA | Full source/custom fields, real canonical IDs, typed relationships, slug collisions and attributed canon revision tests |
| 34 | CANON NEEDS STATE, NOT JUST TEXT | Full source/custom fields, real canonical IDs, typed relationships, slug collisions and attributed canon revision tests |
| 35 | CANON HISTORY / REVISIONS | Full source/custom fields, real canonical IDs, typed relationships, slug collisions and attributed canon revision tests |
| 36 | CONTINUITY | Continuity, per-user review, live search, Back, appearances, native child cascades and dependency tests |
| 37 | FAVORITES | Continuity, per-user review, live search, Back, appearances, native child cascades and dependency tests |
| 38 | RECENTLY OPENED | Continuity, per-user review, live search, Back, appearances, native child cascades and dependency tests |
| 39 | RECENTLY IMPORTED | Continuity, per-user review, live search, Back, appearances, native child cascades and dependency tests |
| 40 | GLOBAL SEARCH | Continuity, per-user review, live search, Back, appearances, native child cascades and dependency tests |
| 41 | STORY MODEL — PREPARE FOR ACTUAL UMBRAL GENESIS PRODUCTION | Continuity, per-user review, live search, Back, appearances, native child cascades and dependency tests |
| 42 | CHARACTER STORY APPEARANCES | Continuity, per-user review, live search, Back, appearances, native child cascades and dependency tests |
| 43 | "USED IN" / DEPENDENCY VIEW | Continuity, per-user review, live search, Back, appearances, native child cascades and dependency tests |
| 44 | DELETE DEPENDENCY SAFETY | Continuity, per-user review, live search, Back, appearances, native child cascades and dependency tests |
| 45 | WORLD EXPLORATION SHOULD FEEL CREATIVE | Dashboard and creative World/Database/Media separation inspected in browser screenshots |
| 46 | DASHBOARD | Dashboard and creative World/Database/Media separation inspected in browser screenshots |
| 47 | READ ALOUD — MORE HUMAN VOICES | Shared reader control/content tests; actual installed voices enumerated; audible Tauri quality still manual |
| 48 | READER CONTENT | Shared reader control/content tests; actual installed voices enumerated; audible Tauri quality still manual |
| 49 | READER TEXT CLEANING | Shared reader control/content tests; actual installed voices enumerated; audible Tauri quality still manual |
| 50 | SIDEBAR CLEANUP | Navigation, backend permissions, active/archive filters, actual mutation results, error-path and lifecycle tests |
| 51 | REMOVE REDUNDANT INTERNAL TAB BARS | Navigation, backend permissions, active/archive filters, actual mutation results, error-path and lifecycle tests |
| 52 | BREADCRUMBS + BACK | Navigation, backend permissions, active/archive filters, actual mutation results, error-path and lifecycle tests |
| 53 | PERMISSIONS | Navigation, backend permissions, active/archive filters, actual mutation results, error-path and lifecycle tests |
| 54 | ERROR HANDLING | Navigation, backend permissions, active/archive filters, actual mutation results, error-path and lifecycle tests |
| 55 | API CONTRACT CONSISTENCY | Navigation, backend permissions, active/archive filters, actual mutation results, error-path and lifecycle tests |
| 56 | COUNTS MUST COME FROM REAL DATA | Navigation, backend permissions, active/archive filters, actual mutation results, error-path and lifecycle tests |
| 57 | ARCHIVED RECORDS MUST NOT LEAK INTO ACTIVE RECORD LISTS | Navigation, backend permissions, active/archive filters, actual mutation results, error-path and lifecycle tests |
| 58 | DO NOT USE ARCHIVE AS FAKE DELETE | Navigation, backend permissions, active/archive filters, actual mutation results, error-path and lifecycle tests |
| 59 | CLEAN UP EXISTING STALE DATA | Staging schema bootstrap, migration 0014, integrity check, synthetic backup and orphan cleanup tests |
| 60 | DATABASE HEALTH SHOULD BE USEFUL | Staging schema bootstrap, migration 0014, integrity check, synthetic backup and orphan cleanup tests |
| 61 | BACKUP BEFORE DESTRUCTIVE CLEANUP | Staging schema bootstrap, migration 0014, integrity check, synthetic backup and orphan cleanup tests |
| 62 | DATABASE MIGRATIONS | Staging schema bootstrap, migration 0014, integrity check, synthetic backup and orphan cleanup tests |
| 63 | FUTURE UMBRA CONNECT ARCHITECTURE | Architecture audited: existing D1 authentication, stable IDs/slugs, typed JSON, visibility/canon/history; full Umbra Connect migration intentionally excluded |
| 64 | PUBLICATION-READY DATA | Architecture audited: existing D1 authentication, stable IDs/slugs, typed JSON, visibility/canon/history; full Umbra Connect migration intentionally excluded |
| 65 | UMBRA CONNECT MIGRATION CONTEXT | Architecture audited: existing D1 authentication, stable IDs/slugs, typed JSON, visibility/canon/history; full Umbra Connect migration intentionally excluded |
| 66 | FUTURE "PUBLISH TO UMBRA CONNECT" | Architecture audited: existing D1 authentication, stable IDs/slugs, typed JSON, visibility/canon/history; full Umbra Connect migration intentionally excluded |
| 67 | UMBRAL GENESIS DATA THAT MUST NOT BE LOST IN UI SIMPLIFICATION | Architecture audited: existing D1 authentication, stable IDs/slugs, typed JSON, visibility/canon/history; full Umbra Connect migration intentionally excluded |
| 68 | HIERARCHICAL LOCATIONS | Hierarchical location/Story schema, timeline sort/display fields, shared audio/media links and import metadata audited and exercised |
| 69 | TIMELINE | Hierarchical location/Story schema, timeline sort/display fields, shared audio/media links and import metadata audited and exercised |
| 70 | VISUAL CANON | Hierarchical location/Story schema, timeline sort/display fields, shared audio/media links and import metadata audited and exercised |
| 71 | MUSIC | Hierarchical location/Story schema, timeline sort/display fields, shared audio/media links and import metadata audited and exercised |
| 72 | SOURCE PROVENANCE | Hierarchical location/Story schema, timeline sort/display fields, shared audio/media links and import metadata audited and exercised |
| 73 | IMPORT REVIEW DOTS | Persistent per-user review history, canonical import result IDs and direct Open Record checks |
| 74 | IMPORT RESULTS | Persistent per-user review history, canonical import result IDs and direct Open Record checks |
| 75 | TEST THE STRUCTURED IMPORT THAT PREVIOUSLY FAILED | Exactly three explicit Umbra/Lumina/Seventh World candidates and saved records |
| 76 | TEST RAW/IMPERFECT CHATGPT IMPORT TOO | Raw ChatGPT export yields two entities with package/field headings retained as content |
| 77 | TEST DELETE / ARCHIVE THOROUGHLY | Create/archive/restore/delete, bulk mutation, Favorites/search/history cleanup and reload tests |
| 78 | TEST EVERY MANAGEMENT WORKSPACE | Native creation/opening and lifecycle API coverage, eighteen UI bulk management destinations, Continuity management |
| 79 | TEST NAVIGATION | Top-level and child navigation, five stat cards, Back, breadcrumbs, global search and Backup & Transfer |
| 80 | TEST READER | Character/lore/source/location/history/chapter/scene/graph content and all reader controls; audible native quality pending |
| 81 | REGRESSION TEST EXISTING WORK | Story single/bulk deletion, manuscripts, appearances, My Profile, Training permissions, real messaging attachments and unchanged updater identity |
| 82 | FINAL UX REVIEW | 1024/1280/1440 browser layouts inspected; final UX screenshot retained |
| 83 | DO NOT PAPER OVER FAILURES | Failed lookup blocks deletion; ambiguity blocks updates; source/backend state preserved; failures and harness fixes documented |
| 84 | IMPLEMENTATION STRATEGY | Audit/checkpoint, connected phases, builds/types, isolated remote staging and consolidated acceptance runs |
| 85 | FINAL REPORT | This consolidated production-gate report and exact migration artifact |
