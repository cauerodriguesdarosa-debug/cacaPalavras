#!/usr/bin/env bash
set -e
cd "$(dirname "$(readlink -f "$0")")"

if ! command -v npm >/dev/null 2>&1; then
  echo "Erro: Node.js e npm não foram encontrados. Instale o Node.js e tente novamente."
  read -r -p "Pressione Enter para sair..."
  exit 1
fi

if [ ! -d node_modules/react ] || [ ! -d node_modules/vite ]; then
  echo "Instalando as dependências do jogo (é necessária conexão com a internet na primeira vez)..."
  npm install
fi

echo "Iniciando cacaPalavras... Não feche esta janela enquanto estiver jogando."
npm run dev -- --open
