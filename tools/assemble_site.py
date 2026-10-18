"""Compatibility entry point. The maintained site builder is tools/build.cjs."""

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.exit(subprocess.call(["node", str(ROOT / "tools" / "build.cjs")], cwd=ROOT))
