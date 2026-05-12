# Transport country real-source rollout execution plan

1. Clean baseline and preserve the rollback state for the invalid country packs.
2. Cache real source files in `.runtime/source-cache/transport/<pack_id>/` and keep raw files out of git.
3. Build each country pack from its declared real sources, writing `source_recipe.manual.json`, `build_audit.json`, manifest, preview outputs, and full outputs.
4. Refresh catalog/Pages artifacts and run the contract gates.
5. Run a final bug review and document remaining risks.

Status: steps 1-4 completed. Step 5 in progress.
