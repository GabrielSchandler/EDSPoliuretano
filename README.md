# EDS Poliuretano · Gestão de pedidos (prévia)

Prévia navegável do sistema de pedidos da **EDS Soluções em Poliuretano** (Mauá/SP), fabricante de rodas para
empilhadeira, cilindros e roletes, anéis, peças técnicas e revestimentos em poliuretano.

> **Prévia sem banco de dados.** Tudo o que se cadastra fica salvo só no navegador de quem abre. Os clientes, produtos,
> preços e pedidos que vêm de exemplo são **fictícios**.

## O que dá para fazer

| Tela | O que faz |
| --- | --- |
| **Painel** | Orçamentos em aberto (e o valor), pedidos em produção, atrasados, valor entregue no mês, quantos pedidos há em cada etapa da esteira e os próximos prazos |
| **Acompanhamento** | Quadro com a coluna **Orçamento** e uma coluna por etapa da esteira. Em cada cartão: **Aprovar**, **Avançar** ou **Finalizar** |
| **Pedidos** | Lista com busca e filtro por status, por etapa, atrasados e cancelados. Criar, editar, aprovar, avançar, voltar, finalizar e cancelar |
| **Clientes** | Cadastro (CNPJ/CPF, contato, telefone, e-mail, cidade), busca e ficha com o histórico de pedidos |
| **Produtos** | Cadastro com código, categoria, dureza (Shore A), medidas, unidade e preço de referência |
| **Esteira de produção** | O próprio cliente define as etapas: incluir, renomear, mudar a ordem e remover |

### Status do pedido

```
Orçamento  ──aprovar──▶  Em produção  ──finalizar──▶  Finalizado
                        (percorre a esteira)
```

- **Orçamento**: aguardando a aprovação do comprador. Ainda não está na esteira.
- **Em produção**: entra na primeira etapa da esteira e avança uma etapa por vez.
- **Finalizado**: só é possível na **última** etapa da esteira; registra data de entrega, nota fiscal e quem recebeu.
- Orçamento e pedido em produção podem ser **cancelados** (com motivo). O registro continua guardado.

### Esteira editável

Pelo botão **Editar esteira** (no Acompanhamento e no Painel), a esteira inicial é:

1. Preparação do núcleo
2. Moldagem do poliuretano
3. Cura e usinagem
4. Inspeção de qualidade
5. Pronto para entrega

O cliente pode trocar tudo. Ao remover uma etapa que ainda tem pedidos, o sistema pergunta **para qual etapa esses
pedidos vão**, e o histórico de cada um registra a mudança. Regras completas em
[docs/REGRAS-DE-NEGOCIO.md](docs/REGRAS-DE-NEGOCIO.md).

## Rodar no computador

Precisa de [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev        # abre em http://127.0.0.1:5173
```

O botão **Restaurar exemplo**, no rodapé do menu, apaga o que foi cadastrado e volta aos dados de exemplo.

## Testes

| Comando | O que confere |
| --- | --- |
| `npm test` | Regras de negócio (`domain.js`): status, esteira, finalização, totais, prazos, numeração, busca |
| `npm run build` | Gera o site estático em `dist/` |
| `npm run test:navegador` | Abre o Chrome instalado e percorre os fluxos como um usuário (16 cenários, incluindo celular). As capturas ficam em `capturas/` |
| `npm run verificar` | Os três acima, em sequência |

Para o teste de navegador usar outro Chrome: `CHROME_PATH=/caminho/do/chrome npm run test:navegador`.

## Publicar

É um site estático. Na Vercel: importar o repositório, **Framework Preset = Vite**, comando `npm run build`, pasta de
saída `dist`. Não há variável de ambiente.

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Página única, fontes e ícone |
| `app.js` | Telas, formulários, eventos e armazenamento no navegador |
| `domain.js` | Regras puras: status, esteira, totais, prazos, numeração, busca |
| `dados-exemplo.js` | Dados fictícios da prévia |
| `styles.css` | Visual nas cores da EDS |
| `public/logo-eds.png` | Logo da EDS |
| `tests/` | Testes das regras |
| `scripts/testar-navegador.mjs` | Teste de ponta a ponta no Chrome |
| `docs/` | Regras de negócio, arquitetura e contexto para quem for continuar |

## Documentação

- [docs/REGRAS-DE-NEGOCIO.md](docs/REGRAS-DE-NEGOCIO.md): status, esteira, finalização, cancelamento, prazos e validações
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md): como o código está organizado, o modelo de dados e como evoluir para banco
- [docs/CONTEXTO-PARA-IA.md](docs/CONTEXTO-PARA-IA.md): decisões tomadas, pendências com o cliente e próximos passos
- [AGENTS.md](AGENTS.md): instruções para agentes de IA (Codex, Claude Code etc.)
