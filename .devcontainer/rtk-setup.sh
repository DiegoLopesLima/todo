#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
mkdir -p "$CONFIG_DIR"

# RTK deve estar instalado durante o build da imagem
if ! command -v rtk >/dev/null 2>&1; then
    echo "ERROR: RTK não encontrado."
    echo "Verifique a instalação no Dockerfile."
    exit 1
fi

# Ativa o hook global (idempotente)
rtk init --global

# Copia a documentação
install -m 0644 /usr/local/share/rtk/RTK.md "$CONFIG_DIR/RTK.md"

# Garante importação no CLAUDE.md
touch "$CONFIG_DIR/CLAUDE.md"
grep -qxF '@RTK.md' "$CONFIG_DIR/CLAUDE.md" || echo '@RTK.md' >> "$CONFIG_DIR/CLAUDE.md"

echo "RTK ready: $(rtk --version)"
