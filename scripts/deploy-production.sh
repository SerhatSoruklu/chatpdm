#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="/srv/chatpdm"
REPO_DIR="$APP_ROOT/repo"
RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
BACKEND_ENV_FILE="$APP_ROOT/shared/backend.env.production"
FRONTEND_ENV_FILE="$APP_ROOT/shared/frontend.env.production"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

BRANCH="${1:-main}"
RELEASE_NAME="$(date +%Y%m%d-%H%M%S)-$$"
RELEASE_DIR="$RELEASES_DIR/$RELEASE_NAME"
PREVIOUS_TARGET=""
ROLLBACK_ENABLED=0

log() {
  printf '[chatpdm deploy] %s\n' "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  }
}

require_env_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    printf '[chatpdm deploy] Missing required env file: %s\n' "$file" >&2
    exit 1
  fi
}

run_pm2_with_env() {
  local env_file="$1"
  shift 1

  (
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    pm2 "$@"
  )
}

recreate_pm2_app() {
  local env_file="$1"
  local app_name="$2"
  local pm2_config="$CURRENT_LINK/deploy/pm2/ecosystem.config.cjs"

  if pm2 describe "$app_name" >/dev/null 2>&1; then
    pm2 delete "$app_name"
  fi

  run_pm2_with_env "$env_file" start "$pm2_config" --only "$app_name" --update-env
}

reload_pm2_apps() {
  local pm2_config="$CURRENT_LINK/deploy/pm2/ecosystem.config.cjs"

  if [[ ! -f "$pm2_config" ]]; then
    printf '[chatpdm deploy] Missing PM2 config: %s\n' "$pm2_config" >&2
    exit 1
  fi

  recreate_pm2_app "$BACKEND_ENV_FILE" "chatpdm-api"
  recreate_pm2_app "$FRONTEND_ENV_FILE" "chatpdm-web"
}

wait_for_health() {
  local url="$1"
  local attempts="${2:-20}"
  local delay="${3:-1}"
  local i

  for ((i = 1; i <= attempts; i += 1)); do
    if curl --fail --silent "$url" >/dev/null; then
      log "Health check passed: $url"
      return 0
    fi

    if (( i < attempts )); then
      sleep "$delay"
    fi
  done

  printf '[chatpdm deploy] Health check failed after %s attempts: %s\n' "$attempts" "$url" >&2
  return 1
}

prune_old_releases() {
  local keep="$1"
  local current_target
  local releases=()
  local release
  local removable=()
  local remove_count
  local i

  current_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

  while IFS= read -r release; do
    releases+=("$release")
  done < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

  if (( ${#releases[@]} <= keep )); then
    return
  fi

  for release in "${releases[@]}"; do
    if [[ "$release" == "$current_target" || "$release" == "$PREVIOUS_TARGET" ]]; then
      continue
    fi
    removable+=("$release")
  done

  remove_count=$(( ${#releases[@]} - keep ))
  for ((i = 0; i < remove_count && i < ${#removable[@]}; i += 1)); do
    rm -rf "${removable[$i]}"
  done
}

rollback_deploy() {
  local exit_code="$1"

  if (( ROLLBACK_ENABLED )) && [[ -n "$PREVIOUS_TARGET" && -d "$PREVIOUS_TARGET" ]]; then
    log "Deploy failed, rolling back to $PREVIOUS_TARGET"
    ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"
    reload_pm2_apps || true
    pm2 save || true
  fi

  if [[ -d "$RELEASE_DIR" && "$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)" != "$RELEASE_DIR" ]]; then
    rm -rf "$RELEASE_DIR"
  fi

  exit "$exit_code"
}

on_error() {
  local exit_code="$?"
  rollback_deploy "$exit_code"
}

require_cmd git
require_cmd npm
require_cmd pm2
require_cmd curl
require_cmd rsync
require_cmd find
require_cmd readlink
require_cmd date

require_env_file "$BACKEND_ENV_FILE"
require_env_file "$FRONTEND_ENV_FILE"

trap on_error ERR

log "Deploying branch $BRANCH"

mkdir -p "$RELEASES_DIR" "$APP_ROOT/shared"
PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

log "Updating repository mirror"
git -C "$REPO_DIR" fetch origin
git -C "$REPO_DIR" checkout "$BRANCH"
git -C "$REPO_DIR" reset --hard "origin/$BRANCH"
git -C "$REPO_DIR" clean -fd

log "Preparing release directory $RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
rsync -a --delete \
  --exclude='.git' \
  --exclude='frontend/node_modules' \
  --exclude='frontend/dist' \
  --exclude='backend/node_modules' \
  "$REPO_DIR"/ "$RELEASE_DIR"/

log "Installing backend dependencies"
npm --prefix "$RELEASE_DIR/backend" ci --omit=dev

log "Installing frontend dependencies"
npm --prefix "$RELEASE_DIR/frontend" ci

log "Building frontend"
npm --prefix "$RELEASE_DIR/frontend" run build

log "Validating release artifacts"
test -f "$RELEASE_DIR/frontend/dist/frontend/browser/index.csr.html"
test -f "$RELEASE_DIR/frontend/dist/frontend/server/index.server.html"
test -f "$RELEASE_DIR/frontend/dist/frontend/server/server.mjs"
test -f "$RELEASE_DIR/backend/src/server.js"

log "Switching current release"
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"
ROLLBACK_ENABLED=1

log "Reloading PM2"
reload_pm2_apps

log "Saving PM2 state"
pm2 save

log "Running backend health check"
wait_for_health "http://127.0.0.1:4301/health" 30 1

log "Running frontend SSR health check"
wait_for_health "http://127.0.0.1:4101/" 30 1

ROLLBACK_ENABLED=0
prune_old_releases "$KEEP_RELEASES"

log "Deploy completed successfully"
