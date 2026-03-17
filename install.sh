#!/bin/bash
# install.sh — Agentis Claude Code Plugin installer
# Run from your project root: bash install.sh

set -e

PLUGIN_VERSION="1.0.0"
PLUGIN_URL="https://raw.githubusercontent.com/YOUR_USERNAME/agentis-claude-code-plugin/main"

echo ""
echo "Agentis Claude Code Plugin v${PLUGIN_VERSION}"
echo "Installing into: $(pwd)"
echo ""

# Check we're in a project root (has package.json or similar)
if [ ! -f "package.json" ] && [ ! -f "Cargo.toml" ] && [ ! -f "requirements.txt" ] && [ ! -f "go.mod" ]; then
  echo "⚠️  Warning: No package.json found. Make sure you're in your project root."
  read -p "Continue anyway? (y/N) " confirm
  [[ $confirm == [yY] ]] || exit 1
fi

# Check Claude Code is installed
if ! command -v claude &> /dev/null; then
  echo "❌ Claude Code not found."
  echo ""
  echo "Install it first:"
  echo "  npm install -g @anthropic-ai/claude-code"
  echo ""
  exit 1
fi

# Create .agentis dir
mkdir -p .agentis

# If CLAUDE.md already exists, back it up and merge
if [ -f "CLAUDE.md" ]; then
  echo "📄 CLAUDE.md already exists — merging Agentis section..."
  cp CLAUDE.md CLAUDE.md.backup
  echo "" >> CLAUDE.md
  echo "---" >> CLAUDE.md
  echo "" >> CLAUDE.md
  cat project-CLAUDE.md >> CLAUDE.md 2>/dev/null || \
    curl -s "${PLUGIN_URL}/project-CLAUDE.md" >> CLAUDE.md
  echo "✅ Merged into existing CLAUDE.md (backup at CLAUDE.md.backup)"
else
  echo "📄 Creating CLAUDE.md..."
  curl -s "${PLUGIN_URL}/project-CLAUDE.md" > CLAUDE.md 2>/dev/null || \
    cp project-CLAUDE.md CLAUDE.md
  echo "✅ CLAUDE.md created"
fi

# Add agentis-job/ to .gitignore
if [ -f ".gitignore" ]; then
  if ! grep -q "agentis-job/" .gitignore; then
    echo "" >> .gitignore
    echo "# Agentis job exports (temporary)" >> .gitignore
    echo "agentis-job/" >> .gitignore
    echo "*.backup" >> .gitignore
    echo "✅ Added agentis-job/ to .gitignore"
  else
    echo "✅ .gitignore already has agentis-job/"
  fi
fi

echo ""
echo "✅ Agentis Claude Code Plugin installed successfully."
echo ""
echo "Next steps:"
echo "  1. Edit CLAUDE.md to add your project's test command and conventions"
echo "  2. Go to Agentis, complete a task, and click 'Export to Claude Code'"
echo "  3. Unzip the download into this folder"
echo "  4. Run: bash agentis-job/execute.sh"
echo ""
