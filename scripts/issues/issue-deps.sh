#!/usr/bin/env bash

set -euo pipefail

# issue-deps.sh — Manage GitHub Issue "blocked by" dependencies via gh api
#
# Requirements:
# - GitHub CLI `gh` (authenticated: `gh auth login` or GH_TOKEN/GITHUB_TOKEN)
# - Repo context resolvable (cwd inside repo, or pass --owner/--repo)
#
# Supported operations:
# - add-blocked-by | add      : Mark <target> issue as blocked by <blocking> issue
# - remove-blocked-by | rm    : Remove the "blocked by" link
# - list-blocked-by | list    : List issues that block <target>
# - list-blocking             : List issues that <target> is blocking
#
# Cross-repo is supported. The blocking issue may live in a different repo.
#
# API docs:
# - List blocked_by:  GET  /repos/{o}/{r}/issues/{n}/dependencies/blocked_by
# - Add blocked_by:   POST /repos/{o}/{r}/issues/{n}/dependencies/blocked_by  { issue_id }
# - Remove blocked_by:DELETE /repos/{o}/{r}/issues/{n}/dependencies/blocked_by/{issue_id}
# - List blocking:    GET  /repos/{o}/{r}/issues/{n}/dependencies/blocking
#   (X-GitHub-Api-Version: 2022-11-28)

API_VERSION_HEADER=("-H" "X-GitHub-Api-Version: 2022-11-28")
ACCEPT_HEADER=("-H" "Accept: application/vnd.github+json")

usage() {
  cat <<'USAGE'
Usage:
  issue-deps.sh add-blocked-by   -t <target#> -b <blocking#> [--owner O --repo R] [--blocking-owner O2 --blocking-repo R2] [--dry-run] [--json]
  issue-deps.sh remove-blocked-by -t <target#> -b <blocking#> [--owner O --repo R] [--blocking-owner O2 --blocking-repo R2] [--dry-run]
  issue-deps.sh list-blocked-by  -t <target#> [--owner O --repo R] [--json]
  issue-deps.sh list-blocking    -t <target#> [--owner O --repo R] [--json]

Aliases:
  add-blocked-by => add
  remove-blocked-by => rm
  list-blocked-by => list

Examples:
  # Mark #123 as blocked by #45 (same repo)
  issue-deps.sh add -t 123 -b 45

  # Cross-repo: target is ownerA/repoA#10, blocking is ownerB/repoB#7
  issue-deps.sh add -t 10 --owner ownerA --repo repoA -b 7 --blocking-owner ownerB --blocking-repo repoB

  # Show issues blocking #123
  issue-deps.sh list -t 123

Notes:
  - Requires gh CLI with issues:write for add/remove (issues:read for list)
  - Honors GH_HOST for GHES; authenticate with `gh auth login`.
USAGE
}

log() { echo "[issue-deps] $*" >&2; }
err() { echo "[issue-deps][error] $*" >&2; exit 1; }

need_cmd() { command -v "$1" >/dev/null 2>&1 || err "Missing required command: $1"; }

resolve_owner_repo_from_env() {
  if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
    OWNER="${GITHUB_REPOSITORY%%/*}"
    REPO="${GITHUB_REPOSITORY##*/}"
    return 0
  fi
  return 1
}

resolve_owner_repo_from_gh() {
  if gh repo view --json owner,name >/dev/null 2>&1; then
    OWNER=$(gh repo view --json owner -q '.owner.login')
    REPO=$(gh repo view --json name  -q '.name')
    [[ -n "$OWNER" && -n "$REPO" ]] || return 1
    return 0
  fi
  return 1
}

resolve_owner_repo_from_git() {
  if url=$(git remote get-url origin 2>/dev/null); then
    # Handle git@host:owner/repo.git and https://host/owner/repo(.git)
    path=${url#*:}; path=${path#*//}; path=${path#*/}
    path=${path%.git}
    OWNER=${path%%/*}
    REPO=${path##*/}
    [[ -n "$OWNER" && -n "$REPO" ]] || return 1
    return 0
  fi
  return 1
}

ensure_repo_context() {
  : "${OWNER:=}"
  : "${REPO:=}"
  if [[ -n "$OWNER" && -n "$REPO" ]]; then
    return 0
  fi
  if resolve_owner_repo_from_env; then return 0; fi
  if resolve_owner_repo_from_gh; then return 0; fi
  if resolve_owner_repo_from_git; then return 0; fi
  err "Could not determine owner/repo. Pass --owner and --repo."
}

get_issue_id() {
  local owner="$1" repo="$2" num="$3"
  gh api "repos/${owner}/${repo}/issues/${num}" "${ACCEPT_HEADER[@]}" "${API_VERSION_HEADER[@]}" --jq '.id'
}

DRY_RUN=""
OUTPUT_JSON=""
VERBOSE=""

SUBCMD="${1:-}" || true
case "$SUBCMD" in
  -h|--help|help|"") usage; exit 0;;
  add-blocked-by|add|remove-blocked-by|rm|list-blocked-by|list|list-blocking) shift;;
  *) err "Unknown subcommand: $SUBCMD";;
esac

# Defaults
OWNER=""; REPO=""
BLOCKING_OWNER=""; BLOCKING_REPO=""
TARGET_NUM=""; BLOCKING_NUM=""

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--owner) OWNER="$2"; shift 2;;
    -r|--repo) REPO="$2"; shift 2;;
    -t|--target) TARGET_NUM="$2"; shift 2;;
    -b|--blocking) BLOCKING_NUM="$2"; shift 2;;
    --blocking-owner) BLOCKING_OWNER="$2"; shift 2;;
    --blocking-repo) BLOCKING_REPO="$2"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    --json) OUTPUT_JSON=1; shift;;
    -v|--verbose) VERBOSE=1; shift;;
    --) shift; break;;
    -h|--help) usage; exit 0;;
    # positional convenience: e.g., `add 123 45`
    *)
      if [[ -z "$TARGET_NUM" ]]; then TARGET_NUM="$1"; shift; continue; fi
      if [[ -z "$BLOCKING_NUM" ]]; then BLOCKING_NUM="$1"; shift; continue; fi
      err "Unexpected argument: $1";;
  esac
done

need_cmd gh

case "$SUBCMD" in
  add-blocked-by|add)
    [[ -n "$TARGET_NUM" && -n "$BLOCKING_NUM" ]] || err "add requires --target and --blocking (issue numbers)"
    ensure_repo_context
    : "${BLOCKING_OWNER:=$OWNER}"
    : "${BLOCKING_REPO:=$REPO}"

    [[ -n "${VERBOSE}" ]] && log "Resolving blocking issue id for ${BLOCKING_OWNER}/${BLOCKING_REPO}#${BLOCKING_NUM}"
    BLOCKING_ID=$(get_issue_id "$BLOCKING_OWNER" "$BLOCKING_REPO" "$BLOCKING_NUM") || err "Failed to resolve blocking issue id"

    if [[ -n "$DRY_RUN" ]]; then
      log "DRY-RUN: would POST /repos/${OWNER}/${REPO}/issues/${TARGET_NUM}/dependencies/blocked_by {issue_id:${BLOCKING_ID}}"
      exit 0
    fi

    payload=$(printf '{"issue_id": %s}' "${BLOCKING_ID}")
    gh api -X POST "repos/${OWNER}/${REPO}/issues/${TARGET_NUM}/dependencies/blocked_by" \
      "${ACCEPT_HEADER[@]}" "${API_VERSION_HEADER[@]}" -H "Content-Type: application/json" \
      --input - <<<"${payload}" >/dev/null

    log "Added: ${OWNER}/${REPO}#${TARGET_NUM} is blocked by ${BLOCKING_OWNER}/${BLOCKING_REPO}#${BLOCKING_NUM} (id:${BLOCKING_ID})"
    ;;

  remove-blocked-by|rm)
    [[ -n "$TARGET_NUM" && -n "$BLOCKING_NUM" ]] || err "remove requires --target and --blocking (issue numbers)"
    ensure_repo_context
    : "${BLOCKING_OWNER:=$OWNER}"
    : "${BLOCKING_REPO:=$REPO}"

    [[ -n "${VERBOSE}" ]] && log "Resolving blocking issue id for ${BLOCKING_OWNER}/${BLOCKING_REPO}#${BLOCKING_NUM}"
    BLOCKING_ID=$(get_issue_id "$BLOCKING_OWNER" "$BLOCKING_REPO" "$BLOCKING_NUM") || err "Failed to resolve blocking issue id"

    if [[ -n "$DRY_RUN" ]]; then
      log "DRY-RUN: would DELETE /repos/${OWNER}/${REPO}/issues/${TARGET_NUM}/dependencies/blocked_by/${BLOCKING_ID}"
      exit 0
    fi

    gh api -X DELETE "repos/${OWNER}/${REPO}/issues/${TARGET_NUM}/dependencies/blocked_by/${BLOCKING_ID}" \
      "${ACCEPT_HEADER[@]}" "${API_VERSION_HEADER[@]}" >/dev/null

    log "Removed: ${OWNER}/${REPO}#${TARGET_NUM} no longer blocked by ${BLOCKING_OWNER}/${BLOCKING_REPO}#${BLOCKING_NUM} (id:${BLOCKING_ID})"
    ;;

  list-blocked-by|list)
    [[ -n "$TARGET_NUM" ]] || err "list requires --target (issue number)"
    ensure_repo_context
    URL="repos/${OWNER}/${REPO}/issues/${TARGET_NUM}/dependencies/blocked_by?per_page=100"
    if [[ -n "$DRY_RUN" ]]; then
      log "DRY-RUN: would GET /$URL"
      exit 0
    fi
    if [[ -n "${OUTPUT_JSON:-}" ]]; then
      gh api "$URL" "${ACCEPT_HEADER[@]}" "${API_VERSION_HEADER[@]}"
    else
      gh api "$URL" "${ACCEPT_HEADER[@]}" "${API_VERSION_HEADER[@]}" \
        --jq '.[] | [ (.repository_url | split("/")[-2] + "/" + (.repository_url | split("/")[-1]) ), ("#" + (.number|tostring)), .title ] | @tsv' \
        | awk -F"\t" '{ printf "%-36s %-8s %s\n", $1, $2, $3 }'
    fi
    ;;

  list-blocking)
    [[ -n "$TARGET_NUM" ]] || err "list-blocking requires --target (issue number)"
    ensure_repo_context
    URL="repos/${OWNER}/${REPO}/issues/${TARGET_NUM}/dependencies/blocking?per_page=100"
    if [[ -n "$DRY_RUN" ]]; then
      log "DRY-RUN: would GET /$URL"
      exit 0
    fi
    if [[ -n "${OUTPUT_JSON:-}" ]]; then
      gh api "$URL" "${ACCEPT_HEADER[@]}" "${API_VERSION_HEADER[@]}"
    else
      gh api "$URL" "${ACCEPT_HEADER[@]}" "${API_VERSION_HEADER[@]}" \
        --jq '.[] | [ (.repository_url | split("/")[-2] + "/" + (.repository_url | split("/")[-1]) ), ("#" + (.number|tostring)), .title ] | @tsv' \
        | awk -F"\t" '{ printf "%-36s %-8s %s\n", $1, $2, $3 }'
    fi
    ;;
esac
