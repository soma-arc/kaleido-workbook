#!/usr/bin/env bash
# Add existing issues to a GitHub Project (Projects v2)
# Usage:
#   OWNER=your-org PROJECT_NUMBER=1 REPOS="org/repo1 org/repo2" QUERY='is:issue state:open label:"type:task"' ./batch_add_to_project.sh
#   # or: OWNER=your-org PROJECT_NUMBER=1 REPOS_FILE=./repos.txt QUERY='state:open' ./batch_add_to_project.sh
set -euo pipefail

: "${OWNER:?set OWNER (org or user)}"
: "${PROJECT_NUMBER:?set PROJECT_NUMBER (Projects v2 number)}"
QUERY="${QUERY:-state:open}"
REPOS="${REPOS:-}"
REPOS_FILE="${REPOS_FILE:-}"

if [[ -z "$REPOS" && -n "$REPOS_FILE" ]]; then
  REPOS=$(tr '\n' ' ' < "$REPOS_FILE")
fi
[[ -z "$REPOS" ]] && { echo "Set REPOS='owner/repo ...' or REPOS_FILE=path"; exit 1; }

# auth check
gh auth status >/dev/null

# project id (not strictly needed for item-add, but validates inputs)
PROJECT_ID=$(gh project view "$PROJECT_NUMBER" --owner "$OWNER" --format json | jq -r '.id')
[[ -z "$PROJECT_ID" || "$PROJECT_ID" == "null" ]] && { echo "Project not found"; exit 1; }

echo "Adding issues matching [$QUERY] to project $OWNER/$PROJECT_NUMBER"
for repo in $REPOS; do
  echo "Repo: $repo"
  gh issue list -R "$repo" -S "$QUERY" --limit 1000 --json url,number | jq -r '.[].url' | while read -r url; do
    [[ -z "$url" ]] && continue
    if gh project item-add "$PROJECT_NUMBER" --owner "$OWNER" --url "$url" >/dev/null 2>&1; then
      echo "  + added: $url"
    else
      echo "  - skipped (maybe already in project): $url"
    fi
  done
done

echo "Done."
