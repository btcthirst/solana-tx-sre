#!/usr/bin/env bash
#
# solana-tx-sre — interactive installer
#
# Lets you choose the target config dir and which components to install.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="solana-tx-sre"

prompt() { local q="$1" d="$2" a; read -r -p "$q [$d]: " a; echo "${a:-$d}"; }
yesno()  { local q="$1" a; read -r -p "$q [Y/n]: " a; [[ -z "$a" || "$a" =~ ^[Yy] ]]; }

echo "== solana-tx-sre interactive installer =="
echo

CLAUDE_DIR="$(prompt "Target config dir" "$HOME/.claude")"
CLAUDE_DIR="${CLAUDE_DIR/#\~/$HOME}"

INSTALL_SKILL=true;    yesno "Install skill (SKILL.md + skill/ + playbooks/)?" || INSTALL_SKILL=false
INSTALL_COMMANDS=true; yesno "Install commands (/reliability-audit, /diagnose-tx, /optimize-fees)?" || INSTALL_COMMANDS=false
INSTALL_AGENT=true;    yesno "Install agent (tx-sre-engineer)?" || INSTALL_AGENT=false

echo
echo "Installing to: $CLAUDE_DIR"

if $INSTALL_SKILL; then
  DEST="$CLAUDE_DIR/skills/$SKILL_NAME"
  mkdir -p "$DEST"
  cp "$SCRIPT_DIR/SKILL.md" "$DEST/"
  cp -R "$SCRIPT_DIR/skill" "$DEST/"
  cp -R "$SCRIPT_DIR/playbooks" "$DEST/"
  echo "  ✓ skill      → $DEST"
fi

if $INSTALL_COMMANDS; then
  DEST="$CLAUDE_DIR/commands"
  mkdir -p "$DEST"
  cp "$SCRIPT_DIR"/commands/*.md "$DEST/"
  echo "  ✓ commands   → $DEST"
fi

if $INSTALL_AGENT; then
  DEST="$CLAUDE_DIR/agents"
  mkdir -p "$DEST"
  cp "$SCRIPT_DIR"/agents/*.md "$DEST/"
  echo "  ✓ agent      → $DEST"
fi

echo
echo "Done. Try:  /diagnose-tx \"success rate 72%, lots of BlockhashNotFound\""
