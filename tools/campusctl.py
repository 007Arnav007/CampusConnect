#!/usr/bin/env python3
"""campusctl - one entry point for setup, tests and experiments.   python tools/campusctl.py <command>"""
import argparse, pathlib, secrets, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]


def run(cmd, cwd=ROOT):
    resolved_cmd = list(cmd)
    exe = shutil.which(resolved_cmd[0])
    if exe:
        resolved_cmd[0] = exe
    print("$", " ".join(cmd), f"(in {cwd.relative_to(ROOT) if cwd != ROOT else '.'})", flush=True)
    return subprocess.call(resolved_cmd, cwd=cwd)


def env_init(_):
    dst = ROOT / ".env"
    if dst.exists(): print(".env exists; not overwriting"); return 0
    txt = (ROOT / ".env.example").read_text()
    for key in ("PROTOCOL_HMAC_SECRET", "INTERNAL_SERVICE_TOKEN", "JWT_SECRET"):
        txt = "\n".join(f"{key}={secrets.token_hex(32)}" if l.startswith(key + "=") else l for l in txt.splitlines()) + "\n"
    pg_password = secrets.token_urlsafe(18)
    txt = "\n".join(f"POSTGRES_PASSWORD={pg_password}" if l.startswith("POSTGRES_PASSWORD=") else l for l in txt.splitlines()) + "\n"
    for key in ("BOOTSTRAP_ADMIN_PASSWORD",):
        txt = "\n".join(f"{key}={secrets.token_urlsafe(18)}" if l.startswith(key + "=") else l for l in txt.splitlines()) + "\n"
    # The Spring backend authenticates with DATABASE_PASSWORD: keep it in sync with POSTGRES_PASSWORD.
    txt = "\n".join(f"DATABASE_PASSWORD={pg_password}" if l.startswith("DATABASE_PASSWORD=") else l for l in txt.splitlines()) + "\n"
    dst.write_text(txt); dst.chmod(0o600); print("wrote .env with fresh random secrets (never commit it)"); return 0


def test(_):
    rc = 0
    rc |= run([sys.executable, "-m", "pytest", "tests", "-q"], ROOT / "ml-service")
    for d in ("protocol", "emergency-receiver", "gateway", "frontend", "network-simulator"):
        if not (ROOT / d / "node_modules").exists(): run(["npm", "install", "--silent"], ROOT / d)
        if d == "protocol": run(["npm", "run", "build", "--silent"], ROOT / d)
        rc |= run(["npm", "test", "--silent"], ROOT / d)
    return rc


def exp(a):
    names = {"e3": ["e3_localizer.py"], "e5": ["e5_timers.py"], "e6": ["e6_policy.py"], "all": ["e3_localizer.py", "e5_timers.py", "e6_policy.py"]}[a.which]
    rc = 0
    for n in names: rc |= run([sys.executable, n] + (["--quick"] if a.quick and n.startswith("e3") else []), ROOT / "experiments")
    rc |= run([sys.executable, "promote_localizer.py"], ROOT / "experiments") if "e3_localizer.py" in names and not a.quick else 0
    rc |= run([sys.executable, "make_report.py"], ROOT / "experiments"); return rc


def doctor(_):
    """Report tool versions actually runnable on this machine, not just PATH presence."""
    def probe(cmd):
        exe = shutil.which(cmd[0])
        if not exe: return "MISSING"
        try:
            r = subprocess.run([exe, *cmd[1:]], capture_output=True, text=True, timeout=30)
            line = (r.stdout or r.stderr).strip().splitlines()
            return line[0].strip() if line else f"exit {r.returncode}"
        except Exception as e:
            return f"ERROR ({e.__class__.__name__})"
    print(f"{'python':8s} {sys.version.split()[0]} ({sys.executable})")
    for tool, args in (("node", ["-v"]), ("npm", ["-v"]), ("java", ["-version"]), ("mvn", ["-v"]), ("docker", ["--version"])):
        print(f"{tool:8s} {probe([tool, *args])}")
    print("note: backend tests need Maven + JDK 21; Docker is needed only for `docker compose up`.")


def main():
    ap = argparse.ArgumentParser(prog="campusctl"); sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("env-init").set_defaults(fn=env_init); sp.add_parser("test").set_defaults(fn=test); sp.add_parser("doctor").set_defaults(fn=doctor)
    e = sp.add_parser("exp"); e.add_argument("which", choices=["e3", "e5", "e6", "all"]); e.add_argument("--quick", action="store_true"); e.set_defaults(fn=exp)
    a = ap.parse_args(); sys.exit(a.fn(a))

if __name__ == "__main__": main()
