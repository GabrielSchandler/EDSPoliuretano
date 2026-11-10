# Contexto para continuidade

## O que é

Prévia visual e navegável do sistema de pedidos da EDS Poliuretano, feita para o cliente aprovar o fluxo antes de existir
banco de dados. Funciona inteira no navegador, com dados fictícios.

## Decisões já tomadas (novembro de 2026)

- Escopo da prévia: cadastro e consulta de **clientes**, **produtos** e **pedidos**; acompanhamento por **etapas**;
  finalização do pedido.
- Status do pedido: **Orçamento → Em produção → Finalizado**, com cancelamento à parte.
- A **esteira de produção é editável pelo próprio cliente** (incluir, renomear, reordenar, remover). A esteira inicial
  é só uma sugestão.
- Finalizar só na última etapa da esteira; ao finalizar, registram-se data de entrega, nota fiscal e quem recebeu.
- Visual seguindo o site da EDS (laranja, cinza e grafite; Montserrat e Open Sans) e o logo dela.
- Sistema simples, rápido e fácil de usar, inclusive no celular.

## Estado atual

- Todas as telas e fluxos acima funcionando, com 13 testes de regra (`npm test`) e 16 cenários de navegador
  (`npm run test:navegador`), todos passando.
- Sem login, sem permissões e sem banco: qualquer pessoa que abre faz tudo, e o dado fica só naquele navegador.

## Pendências com o cliente

1. Confirmar a esteira real (nomes e ordem das etapas).
2. Orçamento: precisa de validade? Orçamento recusado vira status próprio ou "cancelado"?
3. Permissões: quem aprova, finaliza, cancela e edita a esteira.
4. Entrega parcial: um pedido pode sair em mais de uma entrega?
5. Produto: campos e categorias definitivos; tabela de preço por cliente?
6. Dados atuais: se a empresa já tem cadastro de clientes, produtos ou pedidos em outro sistema, avaliar a importação
   na versão com banco.

## Próximos passos (se a prévia for aprovada)

Ver "Como evoluir para a versão com banco" em [ARQUITETURA.md](ARQUITETURA.md).

## Cuidados

- Este repositório é **público**: nunca coloque aqui dados reais da EDS ou dos clientes dela (nomes, CNPJs, preços,
  pedidos), nem chaves, senhas ou endereços de servidor.
- Os dados de exemplo usam CNPJs `00.111.222/…`, telefones `(11) 90000-01xx` e e-mails `.exemplo` justamente para
  ficar claro que são fictícios.
