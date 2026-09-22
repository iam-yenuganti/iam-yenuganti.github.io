#!/bin/bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

repository="iam-yenuganti/iam-yenuganti.github.io"
ollama_host="${OLLAMA_HOST:-http://127.0.0.1:11434}"
ollama_model="${OLLAMA_MODEL:-qwen3.6:27b}"
state_root="${HOME}/Library/Caches/yenuganti-blog-agent"
lock_dir="${state_root}/run.lock"
work_root=""

mkdir -p "$state_root"
if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "Another blog draft run is already active; skipping."
  exit 0
fi

cleanup() {
  if [ -n "$work_root" ] && [ -d "$work_root" ]; then
    rm -rf -- "$work_root"
  fi
  rmdir "$lock_dir"
}
trap cleanup EXIT

for command_name in git gh node ollama curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is unavailable: $command_name" >&2
    exit 1
  fi
done

case "$ollama_host" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *)
    echo "OLLAMA_HOST must point to this laptop's loopback interface." >&2
    exit 1
    ;;
esac

curl --fail --silent --show-error --max-time 10 "$ollama_host/api/tags" >/dev/null
ollama show "$ollama_model" >/dev/null
gh auth status >/dev/null

open_count="$(gh pr list \
  --repo "$repository" \
  --state open \
  --label "ai-draft" \
  --json number \
  --jq "length")"
if [ "$open_count" -ne 0 ]; then
  echo "An AI draft is already waiting for review; skipping today's run."
  exit 0
fi

work_root="$(mktemp -d "${TMPDIR:-/tmp}/yenuganti-blog-agent.XXXXXX")"
repo_root="$work_root/repository"
metadata_path="$work_root/draft-metadata.json"

gh repo clone "$repository" "$repo_root" -- --depth=1
cd "$repo_root"

publication_date="${PUBLICATION_DATE:-$(date +%F)}"
existing_article=""
for candidate in post-*.html; do
  if [ -f "$candidate" ] &&
    grep -Fq "article:published_time\" content=\"$publication_date\"" "$candidate"; then
    existing_article="$candidate"
    break
  fi
done
if [ -n "$existing_article" ]; then
  echo "An article is already published for $publication_date ($existing_article); skipping today's run."
  exit 0
fi

OLLAMA_HOST="$ollama_host" \
OLLAMA_MODEL="$ollama_model" \
TOPIC_ID="${TOPIC_ID:-}" \
PUBLICATION_DATE="$publication_date" \
DRAFT_METADATA_PATH="$metadata_path" \
node automation/generate-article.mjs

node --test automation/generate-article.test.mjs

title="$(node -e "const x=JSON.parse(require('fs').readFileSync(process.argv[1])); process.stdout.write(x.title)" "$metadata_path")"
slug="$(node -e "const x=JSON.parse(require('fs').readFileSync(process.argv[1])); process.stdout.write(x.slug)" "$metadata_path")"
topic_id="$(node -e "const x=JSON.parse(require('fs').readFileSync(process.argv[1])); process.stdout.write(x.topicId)" "$metadata_path")"
post_file="$(node -e "const x=JSON.parse(require('fs').readFileSync(process.argv[1])); process.stdout.write(x.postFile)" "$metadata_path")"
branch="ai-blog/${publication_date}-${slug}-$(date +%s)"

git config user.name "local-blog-agent"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git switch -c "$branch"
git add "$post_file" blog.html sitemap.xml
git commit -m "Draft blog: $title"
git push --set-upstream origin "$branch"

gh label create "ai-draft" \
  --repo "$repository" \
  --color "1D76DB" \
  --description "AI-generated article awaiting editorial review" \
  --force
gh pr create \
  --repo "$repository" \
  --base main \
  --head "$branch" \
  --draft \
  --title "Draft blog: $title" \
  --label "ai-draft" \
  --body "## AI-generated draft

Topic queue id: \`$topic_id\`
Local model: \`$ollama_model\`

Review technical accuracy, source interpretation, tone, originality, links, and every claim before merging. Merging publishes the article through the existing GitHub Pages workflow.

This pull request was generated locally with Ollama; it was not published directly."

echo "Draft pull request created for: $title"
