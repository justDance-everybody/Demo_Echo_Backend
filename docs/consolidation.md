# Consolidation record

## Baseline

- Repository: `justDance-everybody/Demo_Echo_Backend`.
- Working branch: `consolidate/voice-demo`, based on `debug/intent-selection-baseline-backend_test023`.
- Backend source commit: `d6d6f4d56569de021ddfca74ff4cb98a4728d19f`.
- Source path: `devboxes/backend/extracted/project/Backend`.
- Frontend source path: `devboxes/backend/extracted/project/Frontend/frontend`.
- The database dump remained outside Git. Its SHA-256 is recorded in `docs/database-contract.json`.
- This branch is based on the remote debug branch's d6 commit (`d6d6f4d56569de021ddfca74ff4cb98a4728d19f`). The reviewed remote `main` source was `f1b8e5d1220cb9ada24eae3c64e3c16f167fe343`.
- Main's 13 unique commits were reviewed and contain two CI/PR automation workflows and `test-ci-clean.md`, with no separate business implementation. The workflows are preserved as ordinary files in `docs/legacy-ci/` and are not activated; the test note was omitted. The approved history integration retains both histories while keeping the selected d6 plus React tree.

## Uncommitted source changes retained or excluded

- Backend `backend/app/services/execute_service.py` had an uncommitted 45-line EVM address checksum preprocessing addition. It is retained in the consolidated backend. It is not an Echo-only change.
- Backend `BSC_WALLET_QUERY_DIAGNOSIS.md` was a one-byte untracked diagnostic placeholder and is excluded.
- React `frontend/src/services/apiClient.js` had an uncommitted change and is retained from the extracted frontend source.
- The extracted React root-level `src/` is a smaller older copy. Its `utils/mockWebSpeechAPI.js` differs from the nested app version; the nested `frontend/` project also contains additional components, contexts, pages, TTS, address book, and microphone permission code. The nested complete app is the sole retained frontend.
- The frontend source `README.md` change is replaced by this repository README; it is not part of runtime code.
- Trailing whitespace was trimmed only from the retained EVM address preprocessing addition; its AST and behavior are unchanged.

## Older Echo-only changes awaiting review

`docs/legacy-mcp-fixes.patch` records selected uncommitted changes from the older Echo working tree for review only. The patch is not applied to this baseline. Its selected changes cover MCP environment-placeholder substitution, relative command path resolution, connection reuse health probing/recovery, and database engine/session initialization. These behaviors were absent from the current source baseline at the compared symbols. The checksum preprocessing is already retained above and is therefore not duplicated in this patch.

The Echo working tree also contains a larger `execute_service.py` diff relative to its older local commit. Symbol comparison found no `_preprocess_evm_addresses` there. The 45-line EVM checksum addition comes only from the selected d6 raw Backend working tree and is retained once. Other Echo execute-service differences are from broader source-version divergence and are not copied as an unreviewed replacement.

The earlier product and API documents describe the old voice confirmation flow, developer integrations, and developer portal. These are represented by the retained source and its API routes; review found no additional product goal needed for this consolidation. The old docs are not copied wholesale. The React root-level `src/` mock difference is noted above; the actual nested app is retained.

`MCP_server/web3-mcp/` is vendored as ordinary files, not retained as a submodule pointer. Its source repository was clean at commit `1b9e5ce23c855503ff2c9f5fc63a737edbd81216` (tree `1eeca4f9a119293ac507cac3b13c7aa81263174c`); the upstream `LICENSE.md` is included. The archive's populated, sanitized directory contains 49 files, including package/build inputs and the existing build output. Its `.git` metadata is excluded.

Older Alembic revisions and schema helper scripts are kept under `docs/legacy-migrations/` for reference only, including the older contacts/wallets revision. They are not run instructions. The old app startup path calls `init_db()` and `Base.metadata.create_all`; do not point that startup path at the preserved database.

## Database contract

All existing database data is useful and must remain intact. Future versions must support every existing business-table column in both schemas. This is a requirement for future compatibility, not a statement that the current ORM already supports the full schema. The parsed contract contains 15 table definitions and 124 column definitions across the independent `ai_assistant` and `echo_db` schemas. Same-named tables can have different structures; the contract preserves both definitions without automated unification. `ai_assistant` has `users.contacts` and `users.wallets`, `tools.creator_id`, `tools.source`, `tools.is_active`, and `tools.test_field`, and `apps.id`; `echo_db` does not. `app_tools.tool_id` is an integer in `ai_assistant` and `varchar(64)` in `echo_db`. The `apps.app_id` length and `status` enum definitions also differ. `migration_history` appears only in `ai_assistant`; `alembic_version` appears in both schemas. Neither table has a current application ORM model. No row data was read, and no database or schema was changed.

## Exclusions

This working copy contains one backend and one React frontend. It excludes the separate Next/Web3 application, `.env` files, logs, virtual environments, package caches, generated test reports, and empty diagnostic placeholders. The database dump and raw Sealos archives remain outside the Git working tree.
