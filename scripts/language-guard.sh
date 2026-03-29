#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FORBIDDEN_REGEX='\b(understand|intelligent|smart|learn|AI-powered|assistant)\b'

ALLOWED_PATHS=(
  "frontend/src/app/pages/"
  "frontend/src/app/seo/"
  "policies/"
  "docs/public/"
)

is_allowed_file() {
  local file="$1"

  for path_prefix in "${ALLOWED_PATHS[@]}"; do
    if [[ "$file" == "$path_prefix"* ]]; then
      return 0
    fi
  done

  return 1
}

declare -a TARGETS=()
declare -A SEEN_TARGETS=()

add_target() {
  local file="$1"

  if ! is_allowed_file "$file"; then
    return 0
  fi

  if [ -n "${SEEN_TARGETS[$file]:-}" ]; then
    return 0
  fi

  SEEN_TARGETS["$file"]=1
  TARGETS+=("$file")
}

while IFS= read -r file; do
  [ -n "$file" ] || continue
  add_target "$file"
done < <(git diff --cached --name-only --diff-filter=ACM || true)

while IFS=$'\t' read -r status old_path new_path; do
  [ -n "$status" ] || continue

  if [[ "$status" == R* ]]; then
    add_target "$old_path"
    add_target "$new_path"
  fi
done < <(git diff --cached --name-status --diff-filter=R || true)

if [ "${#TARGETS[@]}" -eq 0 ]; then
  exit 0
fi

MATCHES=()
SCOPE_WARNINGS=()

for file in "${TARGETS[@]}"; do
  if [ ! -f "$file" ]; then
    continue
  fi

  while IFS= read -r match; do
    MATCHES+=("$match")
  done < <(grep -Ein "$FORBIDDEN_REGEX" "$file" || true)

  if [[ "$file" == docs/public/* ]]; then
    if ! grep -Eq '^Scope:\s*public$' "$file"; then
      SCOPE_WARNINGS+=("$file")
    fi
  fi
done

if [ "${#MATCHES[@]}" -gt 0 ]; then
  echo "⚠️ Language contract warning:"
  printf '%s\n' "${MATCHES[@]}"
  echo
  echo "Hint: map claim -> implementation (resolve/execute/match/refuse)."
fi

if [ "${#SCOPE_WARNINGS[@]}" -gt 0 ]; then
  echo "⚠️ Public docs scope warning:"
  printf '%s\n' "${SCOPE_WARNINGS[@]}"
  echo
  echo "Hint: add an exact 'Scope: public' header to public docs."
fi

if [ "${#MATCHES[@]}" -gt 0 ] || [ "${#SCOPE_WARNINGS[@]}" -gt 0 ]; then
  echo
  echo "Advisory only. Rewrite public-facing wording before merge."
fi

exit 0
