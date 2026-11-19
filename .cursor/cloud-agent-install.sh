#!/usr/bin/env bash
# Idempotent Cloud Agent install: mise tools + shims on PATH + pnpm deps.
# Installs only node / pnpm / lefthook (no Rust, JDK, or Android SDK).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

export PATH="${HOME}/.local/bin:${PATH}"

if ! command -v mise >/dev/null 2>&1; then
  curl -fsSL https://mise.jdx.dev/install.sh | sh
  export PATH="${HOME}/.local/bin:${PATH}"
fi

# Frontend tooling only — Android build tools are out of scope for Cloud Agent.
# Cursor sets core.hooksPath; bare `lefthook install` (mise postinstall) fails there.
# Treat that case like CI so the hook is skipped and the install stays clean.
if git config --get core.hooksPath >/dev/null 2>&1; then
  CI=1 mise install node npm:pnpm lefthook
else
  mise install node npm:pnpm lefthook
fi

SHIMS_DIR="${HOME}/.local/share/mise/shims"
MARKER="# timetable-cloud-agent: mise shims"

append_mise_shims_path() {
  local file="$1"
  touch "$file"
  if grep -qF "$MARKER" "$file" 2>/dev/null; then
    return 0
  fi
  {
    printf '\n%s\n' "$MARKER"
    printf 'export PATH="%s:$PATH"\n' "$SHIMS_DIR"
  } >> "$file"
}

append_mise_shims_path "${HOME}/.bashrc"
append_mise_shims_path "${HOME}/.profile"

# Cloud Agent tool shells often skip rc files. ~/.local/bin is already on PATH.
mkdir -p "${HOME}/.local/bin"
for shim in "${SHIMS_DIR}"/*; do
  [[ -e "$shim" ]] || continue
  ln -sfn "$shim" "${HOME}/.local/bin/$(basename "$shim")"
done

# This install process still needs the shims before the next shell starts.
export PATH="${SHIMS_DIR}:${PATH}"

if [[ -f pnpm-lock.yaml ]]; then
  pnpm install --frozen-lockfile
else
  pnpm install
fi
