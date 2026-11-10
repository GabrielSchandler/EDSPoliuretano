// Regras do pedido, sem dependência de tela nem de armazenamento.

// Status do pedido. As etapas da esteira só valem enquanto ele está "producao".
export const statusPedido = {
  orcamento: "Orçamento",
  producao: "Em produção",
  finalizado: "Finalizado",
};

// Esteira inicial. O cliente edita pela tela (incluir, renomear, reordenar, remover).
export const esteiraPadrao = [
  { id: "e1", nome: "Preparação do núcleo" },
  { id: "e2", nome: "Moldagem do poliuretano" },
  { id: "e3", nome: "Cura e usinagem" },
  { id: "e4", nome: "Inspeção de qualidade" },
  { id: "e5", nome: "Pronto para entrega" },
];

export const categorias = [
  "Rodas para empilhadeira",
  "Cilindros e roletes",
  "Anéis",
  "Peças técnicas",
  "Revestimento",
];

export const unidades = ["peça", "jogo", "metro", "kg"];

export function indiceEtapa(etapas, id) {
  return etapas.findIndex((etapa) => etapa.id === id);
}

export function nomeEtapa(etapas, id) {
  return etapas.find((etapa) => etapa.id === id)?.nome ?? "—";
}

const emProducao = (pedido) => pedido.status === "producao" && !pedido.cancelado;

export function podeAprovar(pedido) {
  return pedido.status === "orcamento" && !pedido.cancelado;
}

export function proximaEtapa(pedido, etapas) {
  if (!emProducao(pedido)) return null;
  return etapas[indiceEtapa(etapas, pedido.etapaId) + 1]?.id ?? null;
}

export function etapaAnterior(pedido, etapas) {
  if (!emProducao(pedido)) return null;
  const indice = indiceEtapa(etapas, pedido.etapaId);
  return indice > 0 ? etapas[indice - 1].id : null;
}

// Só finaliza quem chegou à última etapa da esteira.
export function podeFinalizar(pedido, etapas) {
  return emProducao(pedido) && etapas.length > 0 && pedido.etapaId === etapas.at(-1).id;
}

export function totalItem(item) {
  return arredondar(Number(item.quantidade || 0) * Number(item.precoUnitario || 0));
}

export function totalPedido(pedido) {
  const bruto = (pedido.itens || []).reduce((soma, item) => soma + totalItem(item), 0);
  return arredondar(Math.max(0, bruto - Number(pedido.desconto || 0)));
}

// Situação do prazo comparando datas no formato AAAA-MM-DD.
export function situacaoPrazo(pedido, hoje) {
  if (pedido.cancelado) return "cancelado";
  if (pedido.status === "finalizado") return "entregue";
  if (!pedido.prazo) return "sem-prazo";
  const dias = diferencaDias(hoje, pedido.prazo);
  if (dias < 0) return "atrasado";
  if (dias <= 3) return "proximo";
  return "no-prazo";
}

export function diferencaDias(de, ate) {
  const inicio = Date.UTC(...partesData(de));
  const fim = Date.UTC(...partesData(ate));
  return Math.round((fim - inicio) / 86400000);
}

function partesData(texto) {
  const [ano, mes, dia] = String(texto).slice(0, 10).split("-").map(Number);
  return [ano, mes - 1, dia];
}

// ---------- edição da esteira ----------

// `linhas` é o rascunho da tela: [{ id, nome, removida, destino }], na ordem nova.
// Etapa removida que ainda tem pedido precisa de destino entre as que ficam.
export function validarEsteira(linhas, pedidos) {
  const ficam = linhas.filter((linha) => !linha.removida);
  if (!ficam.length) return "A esteira precisa de pelo menos uma etapa.";
  if (ficam.some((linha) => !linha.nome.trim())) return "Dê um nome a todas as etapas.";
  const nomes = ficam.map((linha) => normalizar(linha.nome.trim()));
  const repetido = ficam.find((_, i) => nomes.indexOf(nomes[i]) !== i);
  if (repetido) return `Há duas etapas chamadas "${repetido.nome.trim()}".`;
  for (const linha of linhas.filter((l) => l.removida)) {
    const qtd = pedidosNaEtapa(pedidos, linha.id).length;
    if (qtd && !ficam.some((l) => l.id === linha.destino))
      return `Escolha para onde vão os ${qtd} pedido(s) de "${linha.nome.trim()}".`;
  }
  return null;
}

// Devolve a esteira nova e os pedidos ajustados, sem alterar os originais.
export function aplicarEsteira(pedidos, linhas, momento) {
  const etapas = linhas.filter((linha) => !linha.removida).map((linha) => ({ id: linha.id, nome: linha.nome.trim() }));
  const destinos = new Map(linhas.filter((linha) => linha.removida).map((linha) => [linha.id, linha]));
  const ajustados = pedidos.map((pedido) => {
    const removida = emProducao(pedido) && destinos.get(pedido.etapaId);
    if (!removida) return pedido;
    const destino = removida.destino;
    return {
      ...pedido,
      etapaId: destino,
      historico: [
        ...pedido.historico,
        { tipo: "etapa", etapaId: destino, nome: nomeEtapa(etapas, destino), em: momento, nota: `Etapa "${removida.nome.trim()}" removida da esteira` },
      ],
    };
  });
  return { etapas, pedidos: ajustados };
}

export function pedidosNaEtapa(pedidos, etapaId) {
  return pedidos.filter((pedido) => emProducao(pedido) && pedido.etapaId === etapaId);
}

// ---------- formatação e busca ----------

// Número sequencial no formato PED-AAAA-0001, contado por ano.
export function proximoNumero(pedidos, ano) {
  const prefixo = `PED-${ano}-`;
  const maior = pedidos
    .map((pedido) => pedido.numero)
    .filter((numero) => numero?.startsWith(prefixo))
    .map((numero) => Number(numero.slice(prefixo.length)))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefixo}${String(maior + 1).padStart(4, "0")}`;
}

export function somenteDigitos(texto) {
  return String(texto ?? "").replace(/\D/g, "");
}

export function formatarDocumento(texto) {
  const d = somenteDigitos(texto);
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return String(texto ?? "");
}

export function formatarTelefone(texto) {
  const d = somenteDigitos(texto);
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return String(texto ?? "");
}

// Busca sem acento e sem diferença de maiúsculas; todas as palavras precisam aparecer.
export function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function combina(textos, busca) {
  const alvo = normalizar(textos.join(" "));
  return normalizar(busca)
    .split(/\s+/)
    .filter(Boolean)
    .every((palavra) => alvo.includes(palavra));
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}
