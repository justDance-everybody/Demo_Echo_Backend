# Legacy migration material

These files are retained for schema history and future compatibility analysis only. They are not deployment instructions and must not be run against the preserved database during source consolidation.

The selected backend's Alembic files are under `alembic/`; older Echo revisions and helper scripts are under `echo/`. Review schema effects against `docs/database-contract.json` before any future migration work.
