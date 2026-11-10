import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aplicarEsteira,
  combina,
  esteiraPadrao,
  etapaAnterior,
  formatarDocumento,
  pedidosNaEtapa,
  podeAprovar,
  podeFinalizar,
  proximaEtapa,
  proximoNumero,
  situacaoPrazo,
  totalPedido,
  validarEsteira,
} from "../domain.js";
import { gerarExemplo } from "../dados-exemplo.js";

const esteira = esteiraPadrao;
const emProducao = (etapaId, extra = {}) => ({ status: "producao", etapaId, historico: [], ...extra });
const linhas = (etapas) => etapas.map((etapa) => ({ ...etapa, removida: false, destino: "" }));

test("orçamento só é aprovado enquanto é orçamento e não foi cancelado", () => {
  assert.equal(podeAprovar({ status: "orcamento" }), true);
  assert.equal(podeAprovar({ status: "producao" }), false);
  assert.equal(podeAprovar({ status: "orcamento", cancelado: { em: "x" } }), false);
});

test("orçamento não anda na esteira", () => {
  assert.equal(proximaEtapa({ status: "orcamento", etapaId: null }, esteira), null);
  assert.equal(etapaAnterior({ status: "orcamento", etapaId: null }, esteira), null);
});

test("avança e volta pela esteira, sem sair das pontas", () => {
  assert.equal(proximaEtapa(emProducao("e1"), esteira), "e2");
  assert.equal(proximaEtapa(emProducao("e5"), esteira), null);
  assert.equal(etapaAnterior(emProducao("e2"), esteira), "e1");
  assert.equal(etapaAnterior(emProducao("e1"), esteira), null);
});

test("finaliza só na última etapa da esteira, qualquer que seja ela", () => {
  assert.equal(podeFinalizar(emProducao("e5"), esteira), true);
  assert.equal(podeFinalizar(emProducao("e4"), esteira), false);
  assert.equal(podeFinalizar(emProducao("e5", { cancelado: { em: "x" } }), esteira), false);
  assert.equal(podeFinalizar({ status: "finalizado", etapaId: "e5" }, esteira), false);
  const curta = [{ id: "a", nome: "Produção" }];
  assert.equal(podeFinalizar(emProducao("a"), curta), true);
});

test("total soma itens, desconta e não fica negativo", () => {
  const pedido = { itens: [{ quantidade: 4, precoUnitario: 780 }, { quantidade: 3.2, precoUnitario: 640 }], desconto: 120 };
  assert.equal(totalPedido(pedido), 5048);
  assert.equal(totalPedido({ itens: [{ quantidade: 1, precoUnitario: 10 }], desconto: 50 }), 0);
});

test("situação do prazo", () => {
  const base = { status: "producao" };
  assert.equal(situacaoPrazo({ ...base, prazo: "2026-11-09" }, "2026-11-10"), "atrasado");
  assert.equal(situacaoPrazo({ ...base, prazo: "2026-11-13" }, "2026-11-10"), "proximo");
  assert.equal(situacaoPrazo({ ...base, prazo: "2026-11-20" }, "2026-11-10"), "no-prazo");
  assert.equal(situacaoPrazo({ status: "orcamento", prazo: "" }, "2026-11-10"), "sem-prazo");
  assert.equal(situacaoPrazo({ status: "finalizado", prazo: "2026-01-01" }, "2026-11-10"), "entregue");
  assert.equal(situacaoPrazo({ ...base, prazo: "2026-01-01", cancelado: { em: "x" } }, "2026-11-10"), "cancelado");
});

test("esteira: valida nome vazio, repetido e esteira vazia", () => {
  assert.equal(validarEsteira(linhas(esteira), []), null);
  assert.match(validarEsteira([{ id: "a", nome: " " }], []), /nome/);
  assert.match(validarEsteira([{ id: "a", nome: "Corte" }, { id: "b", nome: "córte " }], []), /duas etapas/);
  assert.match(validarEsteira([{ id: "a", nome: "Corte", removida: true }], []), /pelo menos uma/);
});

test("esteira: etapa removida com pedido exige destino válido", () => {
  const pedidos = [emProducao("e3")];
  const rascunho = linhas(esteira).map((l) => (l.id === "e3" ? { ...l, removida: true, destino: "" } : l));
  assert.match(validarEsteira(rascunho, pedidos), /para onde vão/);
  rascunho.find((l) => l.id === "e3").destino = "e3";
  assert.match(validarEsteira(rascunho, pedidos), /para onde vão/, "destino não pode ser a própria etapa removida");
  rascunho.find((l) => l.id === "e3").destino = "e2";
  assert.equal(validarEsteira(rascunho, pedidos), null);
});

test("esteira: aplicar renomeia, reordena, inclui e move pedidos da etapa removida", () => {
  const pedidos = [emProducao("e3"), emProducao("e1"), { status: "orcamento", etapaId: null, historico: [] }, { status: "finalizado", etapaId: "e3", historico: [] }];
  const rascunho = [
    { id: "e2", nome: "Moldagem", removida: false },
    { id: "e1", nome: "Preparação", removida: false },
    { id: "nova", nome: "Embalagem", removida: false },
    { id: "e3", nome: "Cura e usinagem", removida: true, destino: "nova" },
  ];
  const original = structuredClone(pedidos);
  const { etapas, pedidos: ajustados } = aplicarEsteira(pedidos, rascunho, "2026-11-10T10:00:00");
  assert.deepEqual(etapas.map((e) => e.id), ["e2", "e1", "nova"]);
  assert.equal(etapas[0].nome, "Moldagem");
  assert.equal(ajustados[0].etapaId, "nova");
  assert.equal(ajustados[0].historico.at(-1).nome, "Embalagem");
  assert.match(ajustados[0].historico.at(-1).nota, /removida/);
  assert.equal(ajustados[1], pedidos[1], "pedido fora da etapa removida fica igual");
  assert.equal(ajustados[3].etapaId, "e3", "pedido finalizado guarda a etapa em que terminou");
  assert.deepEqual(pedidos, original, "não altera os pedidos originais");
});

test("pedidos na etapa contam só os em produção e não cancelados", () => {
  const pedidos = [emProducao("e1"), emProducao("e1", { cancelado: { em: "x" } }), { status: "finalizado", etapaId: "e1" }];
  assert.equal(pedidosNaEtapa(pedidos, "e1").length, 1);
});

test("numeração sequencial por ano", () => {
  const pedidos = [{ numero: "PED-2026-0007" }, { numero: "PED-2025-0040" }];
  assert.equal(proximoNumero(pedidos, 2026), "PED-2026-0008");
  assert.equal(proximoNumero(pedidos, 2027), "PED-2027-0001");
});

test("busca ignora acento e maiúsculas", () => {
  assert.equal(combina(["Gráfica Horizonte", "Santo André"], "grafica andre"), true);
  assert.equal(combina(["Gráfica Horizonte"], "roda"), false);
  assert.equal(formatarDocumento("00111222000101"), "00.111.222/0001-01");
});

test("dados de exemplo são consistentes", () => {
  const { etapas, clientes, produtos, pedidos } = gerarExemplo(new Date(2026, 10, 10));
  assert.deepEqual(etapas, esteiraPadrao);
  assert.notEqual(etapas, esteiraPadrao, "a esteira do exemplo é uma cópia, não a constante");
  for (const pedido of pedidos) {
    assert.ok(clientes.some((c) => c.id === pedido.clienteId), pedido.numero);
    for (const item of pedido.itens) assert.ok(produtos.some((p) => p.id === item.produtoId), pedido.numero);
    if (pedido.status === "orcamento") assert.equal(pedido.etapaId, null, pedido.numero);
    else assert.ok(etapas.some((e) => e.id === pedido.etapaId), pedido.numero);
    const ultimo = pedido.historico.at(-1);
    if (pedido.status === "producao") assert.equal(ultimo.etapaId, pedido.etapaId, pedido.numero);
    else assert.equal(ultimo.status, pedido.status, pedido.numero);
  }
});
