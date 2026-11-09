#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): run Prettier and ESLint on the touched file.
# Project-scoped: only active for Arcade Vault via .claude/settings.json.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

file=$(node -e '
let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{
  try{const j=JSON.parse(d);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch(e){}
})')

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0
case "$file" in "$PROJECT_DIR"/*) ;; *) exit 0 ;; esac

cd "$PROJECT_DIR" || exit 0

npx --no-install prettier --write --ignore-unknown "$file" >/dev/null 2>&1

case "$file" in
  *.js|*.jsx|*.ts|*.tsx|*.mjs|*.cjs)
    out=$(npx --no-install eslint --fix "$file" 2>&1)
    if [ $? -ne 0 ]; then
      echo "ESLint encontró errores en $file:" >&2
      echo "$out" >&2
      exit 2
    fi
    ;;
esac
exit 0
