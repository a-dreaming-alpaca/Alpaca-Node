"""Build a clean ALPACA release ZIP from an explicit file list."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "README.md", "Start-Alpaca.cmd", "Launch-Alpaca.ps1",
    "Stop-Alpaca.cmd", "Stop-Alpaca.ps1", "collector.ps1",
    "telemetry-extra.ps1", "telemetry-gpu.ps1", "gpu-adapters.cs", "campus-status.py",
    "wallpaper/index.html", "wallpaper/style.css", "wallpaper/app.js",
    "wallpaper/reports.js", "wallpaper/memory.js", "wallpaper/project.json",
    "output/dsa-quotes/quotes.json", "output/dsa-quotes/quotes.md",
    "output/dsa-quotes/quotes.csv", "output/dsa-quotes/review.json",
    "tools/sync_dsa_quotes.py", "tools/test-gpu.ps1",
]


def build(version: int) -> Path:
    prefix = f"Alpaca-Node-v{version}"
    target = ROOT / f"{prefix}.zip"
    if target.exists():
        raise SystemExit(f"Release already exists: {target}; choose a new version.")
    payload = {name: (ROOT / name).read_bytes() for name in FILES}
    manifest = {
        "release": prefix,
        "files": {name: {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()} for name, data in payload.items()},
    }
    with ZipFile(target, "x", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in payload.items():
            archive.writestr(f"{prefix}/{name}", data)
        archive.writestr(f"{prefix}/release-manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2)+"\n")
    with ZipFile(target) as archive:
        assert archive.testzip() is None, "ZIP CRC verification failed"
        assert len(archive.namelist()) == len(FILES)+1, "Unexpected archive content"
        for name, details in manifest["files"].items():
            data = archive.read(f"{prefix}/{name}")
            assert hashlib.sha256(data).hexdigest() == details["sha256"], name
        html = archive.read(f"{prefix}/wallpaper/index.html").decode("utf-8")
        for asset in ("style.css", "reports.js", "memory.js", "app.js"):
            assert asset in html and f"{prefix}/wallpaper/{asset}" in archive.namelist(), asset
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    target.with_suffix(".zip.sha256").write_text(f"{digest}  {target.name}\n", encoding="ascii")
    print(json.dumps({"archive": str(target), "bytes": target.stat().st_size, "files": len(FILES)+1, "sha256": digest, "verified": True}, indent=2))
    return target


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", type=int, required=True)
    args = parser.parse_args()
    if args.version < 1:
        parser.error("version must be positive")
    build(args.version)
