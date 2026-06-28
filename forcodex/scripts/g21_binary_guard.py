from pathlib import Path
import subprocess
import sys

BASE = "2281807"
MEDIA_EXT = {".webm", ".png", ".jpg", ".jpeg", ".gif", ".zip", ".mp4", ".mov", ".pdf", ".webp", ".gz"}
GENERATED_DIRS = [Path("forcodex/videos"), Path("forcodex/screenshots"), Path("browser_outputs"), Path("screenshots"), Path("verification")]
SECRET_PATTERNS = ["gh" + "p_"]


def run(cmd):
    return subprocess.run(cmd, text=True, capture_output=True, check=False).stdout.strip()


def fail(msg, failures):
    failures.append(msg)
    print(f"FAIL: {msg}")


def main():
    failures = []
    diff_numstat = run(["git", "diff", "--numstat", f"{BASE}..HEAD"])
    for line in diff_numstat.splitlines():
        parts = line.split("\t")
        if len(parts) >= 3 and (parts[0] == "-" or parts[1] == "-"):
            fail(f"Git binary diff detected: {line}", failures)

    diff_names = run(["git", "diff", "--name-only", f"{BASE}..HEAD"]).splitlines()
    for name in diff_names:
        if Path(name).suffix.lower() in MEDIA_EXT:
            fail(f"Media/binary path in branch diff: {name}", failures)

    for folder in GENERATED_DIRS:
        if not folder.exists():
            continue
        for path in folder.rglob("*"):
            if path.is_file() and path.name != ".gitkeep" and path.suffix.lower() in MEDIA_EXT:
                fail(f"Generated media exists in workspace: {path}", failures)

    tracked = run(["git", "ls-files"]).splitlines()
    for name in tracked:
        path = Path(name)
        if not path.exists() or path.suffix.lower() not in {".py", ".sh", ".md", ".txt", ".json", ".liquid", ".css", ".js", ".log"}:
            continue
        data = path.read_bytes()
        if b"\x00" in data:
            fail(f"Null byte in tracked text file: {name}", failures)
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            fail(f"Non UTF-8 tracked text file: {name}", failures)
            continue
        for pattern in SECRET_PATTERNS:
            if pattern in text and name not in {"forcodex/reports/ikili-dosya-10-cozum.md"}:
                fail(f"Secret-like token pattern in tracked file: {name}", failures)

    check_ignore_targets = ["kurulum.sh", ".codex-auth/git-askpass.sh", "forcodex/videos/test.webm", "forcodex/screenshots/test.png"]
    ignored = run(["git", "check-ignore", *check_ignore_targets]).splitlines()
    for target in check_ignore_targets:
        if target not in ignored:
            fail(f"Expected ignored path is not ignored: {target}", failures)

    if failures:
        print(f"Binary guard failed: {len(failures)} issue(s)")
        return 1
    print("Binary guard passed: no binary diff, no generated media, ignored paths OK.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
