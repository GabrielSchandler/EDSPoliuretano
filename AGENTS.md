# AGENTS.md — EDS Poliuretano · Gestão de pedidos (prévia)

Instruções para qualquer agente de IA (Codex, Claude Code, outros) que for alterar este repositório.

## Antes de mexer

1. Leia o [README.md](README.md), depois [docs/REGRAS-DE-NEGOCIO.md](docs/REGRAS-DE-NEGOCIO.md),
   [docs/ARQUITETURA.md](docs/ARQUITETURA.md) e [docs/CONTEXTO-PARA-IA.md](docs/CONTEXTO-PARA-IA.md).
2. **Tudo em português (pt-BR)**: código, nomes de variáveis e funções, comentários, mensagens de commit, textos da tela e
   documentação. O dono do projeto não fala inglês.

## O que é e o que não é

- É uma **prévia sem banco**: dados no `localStorage` (chave `eds-gestao-previa-v2`), exemplos fictícios em
  `dados-exemplo.js`. Não introduza servidor, banco ou login sem pedido explícito.
- JavaScript puro com Vite. Não adicione framework (React, Vue etc.) nem biblioteca de interface.
- O repositório é **público**: nada de dado real de cliente, preço real, chave, senha ou endereço de servidor.

## Regras que não podem quebrar

- Regra de negócio fica em `domain.js`, como função pura e com teste em `tests/domain.test.js`. A tela chama a função;
  não reimplementa a regra.
- Status: `orcamento` → `producao` → `finalizado`. Cancelamento é o campo `cancelado`, não um status.
- A **esteira é do cliente** (`dados.etapas`). Não fixe nomes ou quantidade de etapas no código da tela; a única lista
  fixa é `esteiraPadrao`, usada como ponto de partida e no "Voltar ao padrão".
- Etapa é identificada por `id`, nunca pelo nome. O histórico grava o nome do momento; não reescreva histórico.
- Finalizar só na **última** etapa da esteira (`podeFinalizar`). `proximaEtapa` nunca leva a "finalizado".
- Remover etapa com pedido exige destino (`validarEsteira` + `aplicarEsteira`). `aplicarEsteira` não altera os
  objetos recebidos.
- Todo texto vindo do usuário passa por `esc()` antes de entrar no HTML.
- Mudou o formato salvo de forma incompatível? Troque o sufixo da chave do `localStorage`.

## Visual

- Variáveis de cor no topo de `styles.css`: laranja `#F58634` (botão com **texto escuro**), `--laranja-texto` para texto
  laranja sobre branco, grafite `#2B2B2D`. Fontes Montserrat e Open Sans.
- Toda tela precisa funcionar em 390 px de largura sem rolagem lateral: o menu vira barra inferior, as tabelas viram
  cartões e as janelas abrem de baixo.
- Avisos (toast) não podem cobrir botões: com janela aberta eles sobem para o topo e não recebem clique.

## Como verificar antes de entregar

```bash
npm test                 # regras
npm run build            # empacotamento
npm run test:navegador   # 16 cenários no Chrome, inclusive celular; capturas em capturas/
# ou tudo de uma vez:
npm run verificar
```

Mudou um fluxo? Atualize o cenário em `scripts/testar-navegador.mjs` e olhe as capturas geradas, no computador e no
celular. Mudou uma regra? Atualize o teste e o `docs/REGRAS-DE-NEGOCIO.md`.

## Publicação

Site estático (Vercel: preset Vite, saída `dist`). Só publique ou faça push quando o dono do projeto pedir.
