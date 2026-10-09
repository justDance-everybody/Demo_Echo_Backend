# Repository work boundaries

- Main agent handles planning, analysis, dispatch, and acceptance.
- Simple execution may use `gpt-6-luna`; choose effort based on task complexity.
- Frontend and backend changes stay in this repository and the same branch.
- During consolidation, do not mutate a database, execute real tools, deploy, or start services.
- Never bypass the configured privacy gate or change its configuration to make a scan pass.
- Keep database compatibility work aligned with `docs/database-contract.json`; do not infer that the current ORM covers every existing field.
