# Arquitetura

## Visão geral

Aplicação de página única, **sem framework e sem servidor**: Vite serve e empacota três módulos JavaScript e um CSS. O
resultado do `npm run build` é um site estático (`dist/`).

```
index.html
└── app.js ─────────── telas, eventos, armazenamento
    ├── domain.js ──── regras puras (sem DOM, sem armazenamento)
    ├── dados-exemplo.js ── dados fictícios iniciais
    └── styles.css
```

## Estado e renderização

- Um objeto `estado` guarda tudo: seção aberta, modal aberto, rascunhos de formulário, busca, filtros e os `dados`.
- Cada tela é uma função que devolve uma string de HTML (`secaoPainel`, `listaPedidos`, `modalVerPedido`…). Todo texto
  vindo do usuário passa por `esc()` antes de entrar no HTML.
- `render()` redesenha a página inteira. `renderModal()` redesenha só a janela aberta, mantém a rolagem e não repete a
  animação de entrada quando é a mesma janela.
- A busca redesenha só a lista (`#lista`), para não perder o foco do campo.
- A seção vem do endereço (`#painel`, `#acompanhamento`, `#pedidos`, `#clientes`, `#produtos`), então o botão "voltar" do
  navegador funciona.

## Eventos

Um único ouvinte por tipo de evento, no `#app` (delegação):

| Evento | Uso |
| --- | --- |
| `click` | `data-acao="..."` chama `acoes[...]`; `data-ir="secao"` navega (e `data-filtro` aplica um filtro de pedidos) |
| `submit` | `formularios[id do form]`; devolve uma mensagem de erro ou conclui |
| `input` | busca, nomes da esteira, recálculo do total do pedido |
| `change` | filtros, destino das etapas removidas, status inicial, escolha de produto (preenche o preço) |
| `focusin` / `mouseup` | campos numéricos do pedido selecionam o valor ao entrar, para digitar substituindo |

`Esc` fecha a janela aberta.

## Armazenamento

`localStorage`, chave **`eds-gestao-previa-v2`**. Se a chave não existe, está corrompida ou não tem `etapas`, o app
carrega `gerarExemplo()`. Abas abertas ao mesmo tempo se sincronizam pelo evento `storage`.

> Mudou o formato dos dados de forma incompatível? Troque o sufixo da chave (`-v3`), para ninguém abrir a prévia com um
> dado antigo quebrado.

## Modelo de dados

```js
{
  etapas: [{ id: "e1", nome: "Preparação do núcleo" }],           // a ordem é a ordem da esteira
  clientes: [{ id, nome, documento /* só dígitos */, contato, telefone /* só dígitos */, email, cidade, uf, observacoes, criadoEm }],
  produtos: [{ id, codigo, nome, categoria, dureza, medidas, unidade, preco, descricao }],
  pedidos: [{
    id, numero /* PED-AAAA-0001 */, clienteId, criadoEm, prazo /* AAAA-MM-DD ou "" */,
    status /* orcamento | producao | finalizado */,
    etapaId /* null em orçamento */,
    itens: [{ produtoId, descricao, quantidade, precoUnitario, observacao }],
    desconto, observacoes,
    historico: [
      { tipo: "status", status, nome, em, nota },
      { tipo: "etapa", etapaId, nome /* nome da etapa no momento */, em, nota },
    ],
    entrega?:   { data, notaFiscal, recebidoPor, observacao },   // ao finalizar
    cancelado?: { em, motivo },
  }],
}
```

Datas com hora são texto local `AAAA-MM-DDTHH:MM:SS`; datas sem hora, `AAAA-MM-DD`.

## Visual

- Cores da EDS (tirados do logo e do site): laranja `#F58634`, cinza do logo, grafite `#2B2B2D`. Ficam como variáveis no
  topo de `styles.css`.
- Botão laranja usa **texto escuro** (texto branco sobre esse laranja não tem contraste suficiente). Para texto laranja
  sobre branco, use `--laranja-texto`.
- Fontes: Montserrat (títulos) e Open Sans (texto), as mesmas do site da EDS.
- Abaixo de 860 px: o menu lateral vira barra inferior, as tabelas viram cartões e as janelas abrem de baixo para cima.
- Respeita `prefers-reduced-motion`.

## Como evoluir para a versão com banco

O caminho previsto é **Supabase** (Postgres + Auth):

1. Tabelas espelhando o modelo acima (`etapas` com coluna `ordem`; `historico` como tabela própria).
2. Trocar `carregar()`/`salvar()` por consultas. As regras de `domain.js` continuam valendo e servem de especificação.
3. Mudanças de status, de etapa e da esteira em **funções no banco** (transação única), principalmente
   `aplicarEsteira`, que move pedidos de etapas removidas.
4. Login e permissões (quem aprova, finaliza, cancela, edita a esteira).
5. Remover `dados-exemplo.js` e o botão "Restaurar exemplo" da versão de produção.
