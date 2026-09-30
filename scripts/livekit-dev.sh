#!/usr/bin/env bash
# Baixa o livekit-server oficial para tools/ (se faltar) e roda em modo --dev (chaves devkey/secret, ws://localhost:7880).
set -euo pipefail

VERSAO="1.13.7"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="$RAIZ/tools/livekit-server"

if [ ! -x "$BIN" ]; then
  case "$(uname -s)-$(uname -m)" in
    Linux-x86_64) ALVO="linux_amd64" ;;
    Linux-aarch64 | Linux-arm64) ALVO="linux_arm64" ;;
    Darwin-x86_64) ALVO="darwin_amd64" ;;
    Darwin-arm64) ALVO="darwin_arm64" ;;
    *) echo "Plataforma não suportada: $(uname -s)-$(uname -m)" >&2; exit 1 ;;
  esac
  URL="https://github.com/livekit/livekit/releases/download/v${VERSAO}/livekit_${VERSAO}_${ALVO}.tar.gz"
  echo "Baixando livekit-server ${VERSAO} (${ALVO})..."
  mkdir -p "$RAIZ/tools"
  curl -fsSL "$URL" | tar -xz -C "$RAIZ/tools" livekit-server
  chmod +x "$BIN"
fi

exec "$BIN" --dev --bind 127.0.0.1
