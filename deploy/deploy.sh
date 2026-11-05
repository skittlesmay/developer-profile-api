#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

ROOT=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT"
STATE="$ROOT/.deploy"
DOMAIN=platon.safeq.studio
ACTION=${1:-help}

fail() { printf '%s\n' "$*" >&2; exit 1; }
usage() {
  printf '%s\n' 'Usage: bash deploy/deploy.sh check|deploy|certificate EMAIL|renew|renew-test|rollback --accept-current-database|status|stop'
}
case "$ACTION" in
  check|deploy|certificate|renew|renew-test|rollback|status|stop) ;;
  help) usage; exit 0 ;;
  *) usage; exit 1 ;;
esac
for tool in docker flock curl awk df stat; do
  command -v "$tool" >/dev/null || fail "Required command is missing: $tool"
done
[[ -f .env ]] || fail 'Create the private .env first; see deploy/README.md.'
[[ $(stat -c '%a' .env) == 600 ]] || fail 'Set .env permissions to 600.'
mkdir -p "$STATE/nginx" "$STATE/backups"
exec 9>"$STATE/deploy.lock"
flock -n 9 || fail 'Another deployment or certificate operation is running.'

read_release() {
  local value
  value=$(cat "$1")
  [[ $value =~ ^[0-9]{8}T[0-9]{6}Z-[0-9]+$ ]] || fail 'Invalid saved release ID.'
  printf '%s' "$value"
}
RELEASE=bootstrap
if [[ -f "$STATE/current" ]]; then RELEASE=$(read_release "$STATE/current"); fi
export RELEASE
COMPOSE=(docker compose --project-directory "$ROOT" --env-file "$ROOT/.env" -p platon-profile -f "$ROOT/compose.prod.yaml")
dc() { "${COMPOSE[@]}" "$@"; }
dc config --quiet

diagnose() {
  local result=$?
  trap - ERR
  printf 'Operation failed (exit %s). Database and volumes have been retained.\n' "$result" >&2
  dc ps --all >&2 || true
  printf '%s\n' 'Inspect logs with: bash deploy/deploy.sh status' >&2
  exit "$result"
}
trap diagnose ERR

preflight() {
  docker info >/dev/null
  local available swap free_kb
  available=$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)
  swap=$(awk '/SwapTotal:/ {print $2}' /proc/meminfo)
  free_kb=$(df -Pk "$ROOT" | awk 'END {print $4}')
  (( free_kb >= 5 * 1024 * 1024 )) || fail 'At least 5 GiB free disk space is required.'
  (( available >= 768 * 1024 )) || fail 'Less than 768 MiB RAM available. Do not build now.'
  if (( available < 3 * 1024 * 1024 && swap < 2047 * 1024 )); then
    fail 'On a small host, configure at least 2 GiB swap before building.'
  fi
  printf 'Available RAM: %s KiB; swap: %s KiB; free disk: %s KiB\n' "$available" "$swap" "$free_kb"
  docker stats --no-stream
}
backup() {
  local destination
  destination="$STATE/backups/$(date -u +%Y%m%dT%H%M%SZ)-$$.dump"
  dc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$destination.tmp"
  [[ -s "$destination.tmp" ]] || fail 'Database backup is empty.'
  dc exec -T db pg_restore --list <"$destination.tmp" >/dev/null
  mv "$destination.tmp" "$destination"
  printf 'Database backup saved: %s\n' "$destination"
}
api_health() {
  dc exec -T api node -e 'fetch("http://127.0.0.1:3000/health").then(async r=>{if(!r.ok || (await r.json()).status!=="ok")process.exit(1)}).catch(()=>process.exit(1))'
}
proxy_health() {
  dc exec -T nginx wget -qO- --header="Host: $DOMAIN" http://127.0.0.1/health >/dev/null
}
activate_proxy() {
  if [[ ! -f "$STATE/nginx/default.conf" ]]; then
    cp deploy/nginx/http.conf "$STATE/nginx/default.conf"
  fi
  dc run --rm --no-deps --entrypoint sh nginx -c 'test -r /etc/nginx/conf.d/default.conf && nginx -t'
  dc up -d --no-deps --no-build nginx
  local ready=0
  for ((attempt = 0; attempt < 30; attempt++)); do
    if dc exec -T nginx test -s /var/run/nginx.pid; then ready=1; break; fi
    sleep 1
  done
  (( ready == 1 )) || fail 'Nginx did not start within 30 seconds.'
  dc exec -T nginx nginx -t
  dc exec -T nginx nginx -s reload
  if cmp -s deploy/nginx/http.conf "$STATE/nginx/default.conf"; then
    local healthy=0
    for ((attempt = 0; attempt < 30; attempt++)); do
      if proxy_health; then healthy=1; break; fi
      sleep 1
    done
    (( healthy == 1 )) || fail 'Nginx upstream healthcheck failed.'
  else
    curl --noproxy "$DOMAIN" --fail --silent --show-error --retry 5 --retry-connrefused --retry-delay 1 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/health" >/dev/null
  fi
}
write_release() {
  printf '%s\n' "$2" >"$STATE/$1.tmp"
  mv "$STATE/$1.tmp" "$STATE/$1"
}
cleanup_old() {
  local current previous tag repository
  current=$(read_release "$STATE/current")
  previous=''
  if [[ -f "$STATE/previous" ]]; then previous=$(read_release "$STATE/previous"); fi
  for repository in platon-profile-api platon-profile-init; do
    while IFS= read -r tag; do
      if [[ $tag =~ ^[0-9]{8}T[0-9]{6}Z-[0-9]+$ && $tag != "$current" && $tag != "$previous" ]]; then
        docker image rm "$repository:$tag" || printf 'Image retained because it is still referenced: %s:%s\n' "$repository" "$tag"
      fi
    done < <(docker image ls "$repository" --format '{{.Tag}}')
  done
  local backups=()
  mapfile -t backups < <(find "$STATE/backups" -maxdepth 1 -type f -name '*.dump' -printf '%f\n' | sort -r)
  if (( ${#backups[@]} > 2 )); then
    for tag in "${backups[@]:2}"; do rm -- "$STATE/backups/$tag"; done
  fi
}

case "$ACTION" in
  check)
    preflight
    dc ps --all
    ;;
  deploy)
    preflight
    [[ ! -f "$STATE/pending" ]] || fail 'A previous deployment is pending. Inspect status and recover before another deploy.'
    old_release=''
    if [[ -f "$STATE/current" ]]; then old_release=$(read_release "$STATE/current"); fi
    RELEASE="$(date -u +%Y%m%dT%H%M%SZ)-$$"
    export RELEASE
    dc build init
    dc build api
    dc up -d --no-deps --wait --wait-timeout 120 db
    backup
    write_release pending "$RELEASE"
    dc stop nginx api
    dc run --rm --no-deps init
    dc up -d --no-deps --no-build --wait --wait-timeout 120 api
    api_health
    activate_proxy
    if [[ -n $old_release ]]; then write_release previous "$old_release"; fi
    write_release current "$RELEASE"
    rm -- "$STATE/pending"
    cleanup_old
    printf 'Release %s is healthy.\n' "$RELEASE"
    ;;
  certificate)
    [[ $# == 2 && $2 == *@* && $2 != -* ]] || fail 'Supply the private ACME account email as the second argument.'
    [[ -f "$STATE/current" ]] || fail 'Deploy the application before requesting a certificate.'
    dc run --rm --no-deps certbot certonly --webroot -w /var/www/certbot --cert-name "$DOMAIN" -d "$DOMAIN" --email "$2" --agree-tos --non-interactive --keep-until-expiring
    cp "$STATE/nginx/default.conf" "$STATE/nginx/previous.conf.saved"
    cp deploy/nginx/https.conf "$STATE/nginx/default.conf"
    if ! dc exec -T nginx nginx -t; then
      mv "$STATE/nginx/previous.conf.saved" "$STATE/nginx/default.conf"
      fail 'HTTPS config failed validation; previous configuration restored.'
    fi
    dc exec -T nginx nginx -s reload
    curl --noproxy "$DOMAIN" --fail --silent --show-error --retry 5 --retry-connrefused --retry-delay 1 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/health"
    ;;
  renew|renew-test)
    cmp -s deploy/nginx/https.conf "$STATE/nginx/default.conf" || fail 'Enable HTTPS first.'
    if [[ $ACTION == renew-test ]]; then
      dc run --rm --no-deps certbot renew --cert-name "$DOMAIN" --dry-run
    else
      dc run --rm --no-deps certbot renew --cert-name "$DOMAIN"
      dc exec -T nginx nginx -t
      dc exec -T nginx nginx -s reload
    fi
    ;;
  rollback)
    [[ ${2:-} == --accept-current-database && $# == 2 ]] || fail 'Rollback requires --accept-current-database after checking schema compatibility.'
    [[ -f "$STATE/current" ]] || fail 'No successful release exists. Fix the initial deployment; retain the database.'
    current=$(read_release "$STATE/current")
    if [[ -f "$STATE/pending" ]]; then
      target=$current
    else
      [[ -f "$STATE/previous" ]] || fail 'No previous release exists.'
      target=$(read_release "$STATE/previous")
    fi
    for service in api init; do docker image inspect "platon-profile-$service:$target" >/dev/null; done
    dc up -d --no-deps --wait --wait-timeout 120 db
    backup
    RELEASE=$target
    export RELEASE
    dc up -d --no-deps --no-build --wait --wait-timeout 120 api
    api_health
    activate_proxy
    if [[ $target != "$current" ]]; then write_release previous "$current"; fi
    write_release current "$target"
    if [[ -f "$STATE/pending" ]]; then rm -- "$STATE/pending"; fi
    cleanup_old
    printf 'Application restored to %s. Database was not rolled back.\n' "$target"
    ;;
  status)
    dc ps --all
    dc logs --tail=60 api nginx db
    if [[ -f "$STATE/pending" ]]; then printf 'Pending release: %s\n' "$(read_release "$STATE/pending")"; fi
    ;;
  stop)
    dc stop nginx api db
    ;;
esac
