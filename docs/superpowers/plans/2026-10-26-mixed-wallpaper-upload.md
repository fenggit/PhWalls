# Mixed Wallpaper Upload and Catalog Cleanup Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent backend, interface and catalog tasks. Track completion below and in `tmp/mixed-wallpaper-2026-10-26/progress.md`.

**Goal:** Implement the approved mixed-media upload design, normalize local and production wallpaper data, and remove the `huawei matepad` collection.

**Architecture:** One device owns one future upload prefix. Assets retain explicit media types and exact object keys. Publishing uses selected asset IDs and optimistic snapshots; catalog cleanup uses backed-up manifests and content hashes.

**Tech Stack:** Next.js 15, TypeScript, React, Cloudflare D1/R2, existing Node tests and Python operational tools.

**Spec:** `docs/superpowers/specs/2026-10-26-mixed-wallpaper-upload-design.md` and the user's 2026-10-26 instructions to implement, normalize names/deduplicate, synchronize `/Users/fenghe/web-project/source/phonewalls` with remote data, and remove `huawei matepad`.

## Global Constraints

- Dynamic originals and new video previews accept MP4 only. Legacy WebM playback remains compatible.
- Preserve pre-existing brand sorting changes and social artifacts in the current workspace.
- Work in the existing `dev` checkout: preserving its uncommitted changes and user-specified local paths takes precedence over optional isolation workflows.
- User already authorized implementation and local/remote data changes; do not introduce another plan approval gate. Production application deployment still requires user confirmation under AGENTS.md.
- Do not echo credentials. Record source/target manifests and backups before rename, merge or removal.
- Preserve stable public slugs; add explicit redirects if duplicate-device merging removes a public identity.
- Static and dynamic content, primary images and five-language text remain scoped by media type.
- No new testing framework or blocking development-server process. Use existing running server or a production/Pages preview for rendered checks.
- Next release is v2.0.5 after the newly published v2.0.4 tag; preserve v2.0.4 historical content.

## Review Focus

- Ambiguous filename pairing must never overwrite an original or count a cover as a static wallpaper.
- Publishing a new static batch must not release old drafts or dynamic assets.
- Restoring device visibility must disclose already-published assets of the other media type.
- Catalog merges must preserve unique assets, translations, public URLs and referenced files.
- R2/local renames and deletions must have recoverable copies and verified replacement references.

## Task 1: Backend storage, upload and scoped collection actions

**Files:** `src/lib/admin-upload-path.ts`, `admin-upload-storage.ts`, `r2-upload.ts`, `admin-data.ts`, `wallpaper-db.ts`; new collection service and migration; `src/app/api/admin/upload/route.ts`, `device-check/route.ts`, new collection actions; existing and new backend tests.

**Interfaces:**
- `DeviceRow.upload_prefix?: string | null`; migration adds nullable unique normalized prefix.
- Upload GET keeps `{ data: {prefix,directories,source,...} }`, reports a device-wide target and optional historical/configuration metadata. Media no longer chooses storage.
- authorize accepts per-asset `media_type`, `group_id`; complete returns an exact WallpaperRow and is replay-safe. Binding includes device, group, media, role and prefix.
- GET `device-check?id=<device>&ids=<JSON string array>` returns existing totals plus `snapshot`, `wallpaper_ids`, grouped primary/validation issues and other-media visibility effects. Optional `media` and `operation=unpublish` select a collection's published IDs.
- POST `collections/publish`: `{device_id,wallpaper_ids,snapshot,primary_ids?:string[],make_device_visible?:boolean,acknowledge_other_media_visibility?:boolean}`. Publish only selected IDs, transactionally recheck snapshot and deletion locks.
- POST `collections/unpublish`: `{device_id,media_type,snapshot}`; changes only published assets of that media type.

- [x] Add failing cases for a shared directory, MP4-only upload, token pairing/replay, explicit publication range, per-media primaries and stale snapshots.
- [x] Run tests and observe relevant failures.
- [x] Implement nullable prefix, unified resolution, content validation, grouped grants/idempotency and collection actions, preserving legacy playback/deletion protections.
- [x] Run backend tests and type checks, report exact interfaces and any deviations to UI implementer.

## Task 2: Backend workspace UI and public presentation

**Files:** `src/app/manager/AdminConsole.tsx`, extracted focused upload/collection helpers and components as useful, `src/lib/i18n.ts` and all five language resources, relevant UI/public tests.

**Consumes:** Task 1 interfaces above. Coordinate interface changes directly with backend implementer; avoid editing backend-owned files.

- [x] Add failing UI/helper tests for mixed originals, duplicate stems, orphan covers and selected-ID publishing.
- [x] Implement per-original queue pairing and read-only media detection, one device upload directory, role inputs and clear MP4 restrictions.
- [x] One device row with expandable static/dynamic actions; no mandatory create-collection step.
- [x] Show batch success/failure, retry failed items, offer publication of current successful IDs only; use scoped collection checks and actions.
- [x] Integrate device prefix editing, media-specific primary/multilingual/delete/unpublish actions and preserve brand sorting.
- [x] Cover new UI messages in en/zh/ja/vi/zh-hant; verify public loaders, counts and previews use media types rather than directories.
- [x] Run focused tests and rendered desktop/mobile interaction checks when available.

## Task 3: Catalog normalization and local/remote synchronization

**Files:** New operational audit/apply script(s), regression tests for normalization and merge plans, manifests under ignored `tmp/mixed-wallpaper-2026-10-26/`; local source tree and authorized D1/R2 data.

**Interfaces:** JSON manifest records old/new device identity, local path and object key, hashes, duplicate winner, D1 edits, multilingual edits and redirect aliases. Exact source root is `/Users/fenghe/web-project/source/phonewalls`.

- [x] Export remote D1 and inventory local brands/models/roles; read R2 configuration without exposing values.
- [x] Test normalization: `Huawei Mate 80 (Pro)` → `Huawei Mate 80 Pro`; merge `Huawei Mate 70 Pro(+)` into `Huawei Mate 70 Pro`; retain unique assets and detect same-content originals.
- [x] Audit all brands for safe spelling/case/separator/extension corrections. Never infer different real models are identical solely from similar names.
- [x] Build a dry-run manifest with content hashes and rollback paths. Explicitly include all local and remote records for `huawei matepad`.
- [x] Normalize paired local files and R2 keys via copy/verify/reference-update/cleanup; quarantine removed local duplicates and MatePad outside the served source tree.
- [x] Preserve or merge five-language text and primary/published state; add stable old-URL aliases for merged identities.
- [x] Execute authorized remote changes after internal verification and read back full affected rows/files. Check unreferenced original paths before cleanup.

## Task 4: Integration, documentation and final verification

**Files:** Database and operations docs, affected README/API notes, Release Note and final evidence.

- [x] Review each independent task's changes; fix concrete integration failures and run relevant Node tests.
- [x] Document upload_prefix type/default/constraints, scoped publication, MP4 rules, directory compatibility, catalog migration and rollback.
- [x] Update Release Note with one v2.0.5 entry; move pre-existing unpublished brand sorting item out of now-tagged v2.0.4 without rewriting that tag's real changes.
- [x] Run `npm run lint`, `npm run build`, and relevant upload/publication/deletion/public-data/preview/download tests.
- [x] Fresh code review, fix material findings, and verify local/production catalog consistency after writes.
- [x] Deliver implementation and data-change evidence. Application production deployment is a separate final approval step if not explicitly authorized later.

## Execution evidence

All implementation tasks completed. Production/local migrations 0018–0020 and catalog normalization applied with exact readback; 16,336 R2 preparations verified and 16,233 retired keys conditionally removed with backups. Final evidence is in `tmp/mixed-wallpaper-2026-10-26/`. User changes and unindexed inputs were preserved. Application deployment remains the separate confirmation step required by AGENTS.md.
