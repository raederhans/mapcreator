from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIN_LOCK_PATH = ROOT / "requirements-ci-min.lock.txt"

# deploy-minimal currently builds Pages dist and runs one unittest module using stdlib only.
ALLOWED_PACKAGES: set[str] = set()


def parse_requirement_name(raw_line: str) -> str:
    package_spec = raw_line.split(";", 1)[0].strip()
    for separator in ("==", ">=", "<=", "~=", "!=", "<", ">"):
        if separator in package_spec:
            return package_spec.split(separator, 1)[0].strip().lower()
    return package_spec.lower()


def iter_requirements(lock_path: Path) -> list[str]:
    requirements: list[str] = []
    for line in lock_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        requirements.append(stripped)
    return requirements


def main() -> None:
    if not MIN_LOCK_PATH.is_file():
        raise FileNotFoundError(f"Missing minimal lockfile: {MIN_LOCK_PATH}")

    violations: list[str] = []
    requirements = iter_requirements(MIN_LOCK_PATH)

    for requirement in requirements:
        package_name = parse_requirement_name(requirement)
        if package_name not in ALLOWED_PACKAGES:
            violations.append(
                f"Unexpected package in {MIN_LOCK_PATH.name}: {requirement} (package '{package_name}' is outside allowlist)."
            )

    if violations:
        violation_text = "\n".join(f"- {item}" for item in violations)
        raise SystemExit(f"Minimal CI dependency lockfile check failed:\n{violation_text}")

    print(
        f"[check_min_ci_requirements] ok: {MIN_LOCK_PATH.name} has {len(requirements)} package(s); "
        f"allowlist size={len(ALLOWED_PACKAGES)}"
    )


if __name__ == "__main__":
    main()
