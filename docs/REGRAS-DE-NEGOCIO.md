# Regras de negócio

As regras ficam em `domain.js` (funções puras, testadas em `tests/domain.test.js`). A tela (`app.js`) só chama essas
funções; não deve repetir a regra por conta própria.

## 1. Status do pedido

| Status | Código | Significado |
| --- | --- | --- |
| Orçamento | `orcamento` | Proposta enviada ao comprador, aguardando aprovação. `etapaId` é `null` |
| Em produção | `producao` | Aprovado. Está em uma etapa da esteira (`etapaId`) |
| Finalizado | `finalizado` | Entregue. Guarda `entrega` e o `etapaId` em que terminou |

Cancelamento não é um status: é o campo `cancelado: { em, motivo }`, que pode aparecer sobre um orçamento ou um pedido em
produção. Pedido cancelado sai do quadro e das contagens, mas continua na lista (filtro "Cancelados").

### Transições

| De | Para | Ação na tela | Regra (`domain.js`) |
| --- | --- | --- | --- |
| Orçamento | Em produção (1ª etapa) | Aprovar | `podeAprovar` |
| Em produção | Etapa seguinte | Avançar | `proximaEtapa` |
| Em produção | Etapa anterior | Voltar | `etapaAnterior` |
| Em produção (1ª etapa) | Orçamento | Voltar para orçamento | só quando `etapaAnterior` é `null` |
| Em produção (**última** etapa) | Finalizado | Finalizar | `podeFinalizar` |
| Orçamento ou Em produção | Cancelado | Cancelar pedido | sempre, com motivo opcional |

- Não há como pular etapas nem finalizar antes da última.
- Pedido finalizado ou cancelado não é mais editável nem muda de etapa.
- Um pedido novo pode nascer como **Orçamento** (padrão) ou **Em produção** ("já aprovado"). Neste caso o histórico
  registra as duas passagens: orçamento e aprovação.

## 2. Esteira de produção

A esteira é a lista ordenada de etapas por onde passa um pedido em produção. Ela é **editada pelo cliente** na tela
"Esteira de produção" e salva junto com os dados (`dados.etapas`). A esteira inicial está em `esteiraPadrao`.

O que se pode fazer:

- **Renomear** uma etapa. Os pedidos continuam nela, porque a etapa é identificada pelo `id`, não pelo nome.
- **Incluir** uma etapa em qualquer posição (adiciona no fim e sobe com ↑).
- **Reordenar** com ↑ e ↓.
- **Remover**:
  - etapa **sem** pedido some na hora;
  - etapa **com** pedido em produção fica marcada como removida e pede o **destino** desses pedidos (por padrão, a etapa
    anterior). Ao salvar, os pedidos são movidos e cada histórico ganha a nota `Etapa "X" removida da esteira`.
- **Voltar ao padrão**: recoloca as cinco etapas iniciais. Etapas criadas pelo cliente que ainda têm pedidos aparecem
  como removidas, esperando destino.

Validação ao salvar (`validarEsteira`):

1. Pelo menos uma etapa.
2. Toda etapa com nome.
3. Sem nomes repetidos (sem diferenciar maiúsculas e acentos).
4. Toda etapa removida que tem pedido precisa de destino entre as etapas que ficam.

Efeitos:

- A **última** etapa da esteira é sempre a que libera **Finalizar**. Se o cliente puser uma etapa nova no fim, é ela que
  passa a liberar.
- Pedido **finalizado** guarda o `etapaId` em que terminou, mesmo que essa etapa seja removida depois. Ele não é movido.
- O histórico grava o **nome** da etapa no momento do evento, então renomear ou remover etapas não reescreve o passado.

## 3. Valores

- Total do item = quantidade × preço unitário.
- Total do pedido = soma dos itens − desconto, nunca negativo. Arredondado em centavos.
- O preço unitário vem do **preço de referência** do produto ao escolhê-lo, e pode ser alterado no pedido.
- Quantidade aceita decimais (para produto vendido por metro ou kg).
- "Entregue no mês" (Painel) soma os pedidos **finalizados** com data de entrega no mês corrente.
- "Total aprovado" (ficha do cliente) soma os pedidos em produção e finalizados, sem orçamentos e sem cancelados.

## 4. Prazo

`situacaoPrazo(pedido, hoje)` compara datas no formato `AAAA-MM-DD`:

| Situação | Quando |
| --- | --- |
| Atrasado | prazo antes de hoje |
| Vence em breve | faltam até 3 dias |
| No prazo | faltam mais de 3 dias |
| Sem prazo | prazo em branco |
| Entregue | finalizado (o prazo deixa de importar) |
| Cancelado | cancelado |

Orçamento também tem prazo e entra em "Atrasados" se o prazo passar.

## 5. Numeração

`PED-AAAA-0001`, sequencial **por ano** (`proximoNumero`). Orçamento e pedido usam a mesma sequência: o número não
muda quando o orçamento é aprovado.

## 6. Cadastros

- **Cliente**: nome obrigatório. CNPJ/CPF é opcional, mas não pode repetir. É salvo só com dígitos e exibido formatado.
  Só pode ser excluído se não tiver nenhum pedido.
- **Produto**: código e nome obrigatórios. O código é salvo em maiúsculas e não pode repetir. Só pode ser excluído se não
  aparecer em nenhum pedido.
- **Busca**: ignora acentos e maiúsculas, e todas as palavras digitadas precisam aparecer.

## 7. Pendências com o cliente

Estas regras foram **sugeridas**, não confirmadas pela EDS:

- nomes e ordem da esteira inicial;
- se orçamento precisa de validade (data limite) e se o orçamento recusado deve ter status próprio, em vez de "cancelado";
- quem pode aprovar, finalizar, cancelar e editar a esteira (hoje qualquer pessoa pode);
- se o pedido pode ser entregue em partes (hoje a finalização é única);
- campos do produto (dureza, medidas) e categorias.
