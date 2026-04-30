# Transport world scope audit task

Current target: fixed.

Live tests owner: main thread only.
Child agents: static review only.

Verification commands completed:
- `python -m py_compile tools/build_global_transport_points.py`
- `node --check js/core/data_loader.js js/ui/transport_workbench_family_preview.js js/ui/transport_workbench_airport_preview.js js/ui/transport_workbench_port_preview.js js/ui/transport_workbench_point_preview_shared.js js/ui/toolbar/transport_workbench_controller.js`
- `python tools/check_transport_workbench_manifests.py --root data/transport_layers`
- `python -m unittest tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_airport_port_runtime_loader_uses_global_point_packs tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_global_airport_port_point_packs_have_world_scope_contract -q`
- `npm run build:global-transport-airports`
- `npm run build:global-transport-ports`
- `python -m unittest tests.test_global_transport_builder_contracts tests.test_transport_manifest_contracts -q`
- `python tools/build_pages_dist.py`
- `python -m unittest tests.test_pages_dist_startup_shell -q`
- `python -m unittest tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_builders_emit_checked_in_manifest_contract tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_airport_port_runtime_loader_uses_global_point_packs tests.test_global_transport_builder_contracts.GlobalTransportBuilderContractsTest.test_global_airport_port_point_packs_have_world_scope_contract -q`
