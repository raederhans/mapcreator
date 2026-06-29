from __future__ import annotations

TNO_COVERAGE_DERIVED_DIRNAME = "derived"
TNO_ATLANTROPA_DONOR_LEDGER_FILENAME = "atlantropa_donor_ledger.json"
TNO_GEOMETRY_DROP_AUDIT_FILENAME = "geometry_drop_audit.json"
TNO_COVERAGE_LEDGER_FILENAMES = (
    f"{TNO_COVERAGE_DERIVED_DIRNAME}/{TNO_ATLANTROPA_DONOR_LEDGER_FILENAME}",
    f"{TNO_COVERAGE_DERIVED_DIRNAME}/{TNO_GEOMETRY_DROP_AUDIT_FILENAME}",
)
TNO_COVERAGE_REPORT_PATHS = {
    "strict": ".runtime/reports/generated/tno_1962.strict_contract_report.json",
    "coverage_ledger": ".runtime/reports/generated/tno_1962.coverage_ledger_report.json",
    "atlantropa": ".runtime/reports/generated/tno_1962.atlantropa_coverage_report.json",
    "polar": ".runtime/reports/generated/tno_1962.polar_coverage_report.json",
}
