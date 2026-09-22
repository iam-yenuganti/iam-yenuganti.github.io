#!/bin/bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

script_dir="$(cd "$(dirname "$0")" && pwd)"
label="com.yenuganti.blog-draft"
agents_dir="$HOME/Library/LaunchAgents"
support_dir="$HOME/Library/Application Support/YenugantiBlogAgent"
logs_dir="$HOME/Library/Logs"
plist_path="$agents_dir/$label.plist"
runner_path="$support_dir/run-local-draft.sh"
domain="gui/$(id -u)"

if [ "${1:-}" = "--uninstall" ]; then
  if launchctl print "$domain/$label" >/dev/null 2>&1; then
    launchctl bootout "$domain/$label"
  fi
  if [ -f "$plist_path" ]; then
    rm -- "$plist_path"
  fi
  if [ -f "$runner_path" ]; then
    rm -- "$runner_path"
  fi
  if [ -d "$support_dir" ]; then
    rmdir "$support_dir" 2>/dev/null || true
  fi
  echo "Removed the local blog draft schedule."
  exit 0
fi

for command_name in git gh node ollama curl; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Required command is unavailable: $command_name" >&2
    exit 1
  fi
done

ollama show "qwen3.6:27b" >/dev/null
gh auth status >/dev/null
mkdir -p "$agents_dir" "$support_dir" "$logs_dir"
install -m 700 "$script_dir/run-local-draft.sh" "$runner_path"

cat > "$plist_path" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$runner_path</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>7</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OLLAMA_HOST</key>
    <string>http://127.0.0.1:11434</string>
    <key>OLLAMA_MODEL</key>
    <string>qwen3.6:27b</string>
  </dict>
  <key>StandardOutPath</key>
  <string>$logs_dir/yenuganti-blog-agent.log</string>
  <key>StandardErrorPath</key>
  <string>$logs_dir/yenuganti-blog-agent-error.log</string>
</dict>
</plist>
PLIST

plutil -lint "$plist_path"
if launchctl print "$domain/$label" >/dev/null 2>&1; then
  launchctl bootout "$domain/$label"
fi
launchctl bootstrap "$domain" "$plist_path"

echo "Installed the daily 07:00 local blog draft schedule."
echo "Logs: $logs_dir/yenuganti-blog-agent.log"
