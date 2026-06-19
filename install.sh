#!/usr/bin/env bash
#
# solana-tx-sre — non-interactive installer (all defaults)
#
# Installs the skill, commands, and agent into a Claude Code config dir.
# Override the target dir with:  CLAUDE_DIR=/path/to/config ./install.sh
# (Codex support comes via the kit submodule, not this script — see README.)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="solana-tx-sre"
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"

SKILLS_DIR="$CLAUDE_DIR/skills/$SKILL_NAME"
COMMANDS_DIR="$CLAUDE_DIR/commands"
AGENTS_DIR="$CLAUDE_DIR/agents"

echo "Installing $SKILL_NAME → $CLAUDE_DIR"

# 1. Skill: SKILL.md + skill/ + playbooks/ + rules/ + examples/
rm -rf "$SKILLS_DIR"   # clean reinstall — renamed/removed files don't linger
mkdir -p "$SKILLS_DIR"
cp "$SCRIPT_DIR/SKILL.md" "$SKILLS_DIR/"
cp -R "$SCRIPT_DIR/skill" "$SKILLS_DIR/"
cp -R "$SCRIPT_DIR/playbooks" "$SKILLS_DIR/"
cp -R "$SCRIPT_DIR/rules" "$SKILLS_DIR/"
cp -R "$SCRIPT_DIR/examples" "$SKILLS_DIR/"   # SKILL.md routes to these worked samples
echo "  ✓ skill      → $SKILLS_DIR"

# 2. Commands
mkdir -p "$COMMANDS_DIR"
cp "$SCRIPT_DIR"/commands/*.md "$COMMANDS_DIR/"
echo "  ✓ commands   → $COMMANDS_DIR  (/reliability-audit, /diagnose-tx, /optimize-fees)"

# 3. Agent
mkdir -p "$AGENTS_DIR"
cp "$SCRIPT_DIR"/agents/*.md "$AGENTS_DIR/"
echo "  ✓ agent      → $AGENTS_DIR  (tx-sre-engineer)"

echo
echo "Done. Try:  /diagnose-tx \"success rate 72%, lots of BlockhashNotFound\""
echo "Tip: pairs with the Helius & solana-dev MCP servers for live data."
