import {
  aplicarEsteira,
  categorias,
  combina,
  esteiraPadrao,
  etapaAnterior,
  formatarDocumento,
  formatarTelefone,
  indiceEtapa,
  nomeEtapa,
  pedidosNaEtapa,
  podeAprovar,
  podeFinalizar,
  proximaEtapa,
  proximoNumero,
  situacaoPrazo,
  somenteDigitos,
  statusPedido,
  totalItem,
  totalPedido,
  unidades,
  validarEsteira,
} from "./domain.js";
import { gerarExemplo } from "./dados-exemplo.js";
import "./styles.css";

// Prévia sem banco: os dados ficam só no navegador de quem abre.
const CHAVE = "eds-gestao-previa-v2";
const app = document.querySelector("#app");
const secoes = {
  painel: "Painel",
  acompanhamento: "Acompanhamento",
  pedidos: "Pedidos",
  clientes: "Clientes",
  produtos: "Produtos",
};
const icones = {
  painel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  acompanhamento: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  pedidos: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  clientes: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1"/><path d="M16 4.5a3.2 3.2 0 0 1 0 6.2M18 14.2a5.5 5.5 0 0 1 3 4.8v1"/>',
  produtos: '<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
  esteira: '<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h3M14 12h3"/>',
};

const estado = {
  secao: secaoDoEndereco(),
  modal: null,
  rascunho: null,
  rascunhoEsteira: null,
  retornoPedido: null,
  busca: "",
  filtroPedidos: "ativos",
  filtroCategoria: "todas",
  aviso: "",
  dados: carregar(),
};

// ---------- armazenamento ----------

function carregar() {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE));
    if (dados?.etapas?.length) return dados;
  } catch {
    // navegador sem armazenamento ou dado corrompido: segue com o exemplo
  }
  return gerarExemplo();
}
function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado.dados));
  } catch {
    // sem armazenamento, a alteração vale só até recarregar a página
  }
}
function secaoDoEndereco() {
  const id = location.hash.replace("#", "");
  return secoes[id] ? id : "painel";
}

// ---------- utilitários ----------

const esc = (valor) =>
  String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const moeda = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numero = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const valor2 = (valor) =>
  Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lerNumero = (valor) => Number(String(valor ?? "").replace(/\./g, "").replace(",", ".")) || 0;
const hoje = () => new Date().toLocaleDateString("sv-SE");
const agora = () => {
  const d = new Date();
  return `${d.toLocaleDateString("sv-SE")}T${d.toTimeString().slice(0, 8)}`;
};
const dataBR = (texto) => (texto ? String(texto).slice(0, 10).split("-").reverse().join("/") : "—");
const dataHoraBR = (texto) => (texto ? `${dataBR(texto)} às ${String(texto).slice(11, 16)}` : "—");
const novoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const etapas = () => estado.dados.etapas;
const cliente = (id) => estado.dados.clientes.find((item) => item.id === id);
const produto = (id) => estado.dados.produtos.find((item) => item.id === id);
const pedido = (id) => estado.dados.pedidos.find((item) => item.id === id);
const ativo = (item) => !item.cancelado && item.status !== "finalizado";
const doStatus = (status) => estado.dados.pedidos.filter((item) => !item.cancelado && item.status === status);
const plural = (qtd, um, varios) => `${qtd} ${qtd === 1 ? um : varios}`;
const svg = (caminhos) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminhos}</svg>`;
const porPrazo = (a, b) => String(a.prazo || "9").localeCompare(String(b.prazo || "9"));

const rotulosPrazo = {
  atrasado: "Atrasado",
  proximo: "Vence em breve",
  "no-prazo": "No prazo",
  "sem-prazo": "Sem prazo",
  entregue: "Entregue",
  cancelado: "Cancelado",
};
function seloPrazo(item) {
  const situacao = situacaoPrazo(item, hoje());
  return `<span class="selo prazo-${situacao}">${rotulosPrazo[situacao]}</span>`;
}
function seloStatus(item) {
  if (item.cancelado) return '<span class="selo cancelado">Cancelado</span>';
  return `<span class="selo status-${item.status}">${statusPedido[item.status]}</span>`;
}
// Status + etapa da esteira, quando houver.
function situacaoPedido(item) {
  const etapa = !item.cancelado && item.status === "producao" ? `<small>${esc(nomeEtapa(etapas(), item.etapaId))}</small>` : "";
  return `${seloStatus(item)}${etapa}`;
}
function vazio(titulo, detalhe = "") {
  return `<div class="vazio"><strong>${titulo}</strong>${detalhe ? `<p>${detalhe}</p>` : ""}</div>`;
}
function avisar(mensagem) {
  estado.aviso = mensagem;
  const caixa = document.querySelector("#aviso");
  if (caixa) caixa.innerHTML = `<div class="toast" role="status">${esc(mensagem)}</div>`;
  setTimeout(() => {
    if (estado.aviso !== mensagem) return;
    estado.aviso = "";
    const atual = document.querySelector("#aviso");
    if (atual) atual.innerHTML = "";
  }, 3500);
}

// ---------- estrutura ----------

function render() {
  const rolagemModal = document.querySelector("#modal .modal-corpo")?.scrollTop ?? 0;
  const titulo = secoes[estado.secao];
  // No celular, "Acompanhamento" não cabe na barra inferior.
  const nav = (curto) =>
    Object.entries(secoes)
      .map(
        ([id, rotulo]) =>
          `<a class="nav-item ${estado.secao === id ? "ativo" : ""}" href="#${id}" ${estado.secao === id ? 'aria-current="page"' : ""}>${svg(icones[id])}<span>${curto && id === "acompanhamento" ? "Produção" : rotulo}</span></a>`,
      )
      .join("");
  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="marca"><img src="/logo-eds.png" alt="EDS Soluções em Poliuretano" width="56" height="48"><div><strong>EDS</strong><small>Gestão de pedidos</small></div></div>
      <nav aria-label="Menu principal">${nav(false)}</nav>
      <div class="sidebar-rodape"><p>Prévia com dados de exemplo, salvos só neste navegador.</p><button class="link" data-acao="restaurar">Restaurar exemplo</button></div>
    </aside>
    <div class="principal">
      <header class="topo">
        <img class="topo-logo" src="/logo-eds.png" alt="EDS" width="38" height="33">
        <h1>${titulo}</h1>
        <div class="topo-acoes">${acaoDoTopo()}</div>
      </header>
      <main class="conteudo">${conteudo()}</main>
    </div>
    <nav class="barra-inferior" aria-label="Menu">${nav(true)}</nav>
  </div>
  <div id="aviso">${estado.aviso ? `<div class="toast" role="status">${esc(estado.aviso)}</div>` : ""}</div>
  <div id="modal"></div>`;
  renderModal(rolagemModal);
}

function acaoDoTopo() {
  if (estado.secao === "clientes")
    return '<button class="botao primario" data-acao="novo-cliente">+ Novo cliente</button>';
  if (estado.secao === "produtos")
    return '<button class="botao primario" data-acao="novo-produto">+ Novo produto</button>';
  return '<button class="botao primario" data-acao="novo-pedido">+ Novo pedido</button>';
}

function conteudo() {
  if (estado.secao === "acompanhamento") return secaoAcompanhamento();
  if (estado.secao === "pedidos") return secaoPedidos();
  if (estado.secao === "clientes") return secaoClientes();
  if (estado.secao === "produtos") return secaoProdutos();
  return secaoPainel();
}

// Listas que se redesenham sozinhas enquanto a pessoa digita na busca.
const listas = {
  pedidos: listaPedidos,
  clientes: listaClientes,
  produtos: listaProdutos,
};
function campoBusca(placeholder) {
  return `<label class="busca">${svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>')}<input id="busca" type="search" placeholder="${placeholder}" value="${esc(estado.busca)}" aria-label="Buscar" autocomplete="off"></label>`;
}

// ---------- painel ----------

function secaoPainel() {
  const orcamentos = doStatus("orcamento");
  const producao = doStatus("producao");
  const atrasados = estado.dados.pedidos.filter((item) => ativo(item) && situacaoPrazo(item, hoje()) === "atrasado");
  const mes = hoje().slice(0, 7);
  const doMes = doStatus("finalizado").filter((item) => item.entrega?.data?.startsWith(mes));
  const contagem = etapas().map((etapa) => pedidosNaEtapa(estado.dados.pedidos, etapa.id).length);
  const maior = Math.max(1, ...contagem);
  const proximos = estado.dados.pedidos.filter(ativo).sort(porPrazo).slice(0, 6);

  return `<div class="metricas">
      <button class="metrica" data-ir="pedidos" data-filtro="orcamento"><span>Orçamentos em aberto</span><strong>${orcamentos.length}</strong><small>${moeda(orcamentos.reduce((soma, item) => soma + totalPedido(item), 0))} aguardando aprovação</small></button>
      <button class="metrica" data-ir="acompanhamento"><span>Em produção</span><strong>${producao.length}</strong><small>${plural(etapas().length, "etapa", "etapas")} na esteira</small></button>
      <button class="metrica ${atrasados.length ? "alerta" : ""}" data-ir="pedidos" data-filtro="atrasados"><span>Atrasados</span><strong>${atrasados.length}</strong><small>prazo vencido</small></button>
      <button class="metrica" data-ir="pedidos" data-filtro="finalizado"><span>Entregue no mês</span><strong>${moeda(doMes.reduce((soma, item) => soma + totalPedido(item), 0))}</strong><small>${plural(doMes.length, "pedido finalizado", "pedidos finalizados")}</small></button>
    </div>
    <div class="duas-colunas">
      <section class="painel-bloco">
        <div class="bloco-topo"><h2>Esteira de produção</h2><button class="link" data-acao="editar-esteira">Editar esteira</button></div>
        <div class="etapas-barras">${etapas()
          .map(
            (etapa, i) =>
              `<button class="etapa-barra" data-ir="pedidos" data-filtro="etapa:${etapa.id}"><span>${esc(etapa.nome)}</span><span class="trilho"><span style="width:${(contagem[i] / maior) * 100}%"></span></span><strong>${contagem[i]}</strong></button>`,
          )
          .join("")}</div>
      </section>
      <section class="painel-bloco">
        <div class="bloco-topo"><h2>Próximos prazos</h2><button class="link" data-ir="pedidos" data-filtro="ativos">Ver pedidos →</button></div>
        ${proximos.length ? `<div class="lista-simples">${proximos.map((item) => `<button class="linha-simples" data-acao="ver-pedido" data-id="${item.id}"><span><strong>${esc(item.numero)}</strong><small>${esc(cliente(item.clienteId)?.nome || "Cliente removido")} · ${statusPedido[item.status]}</small></span><span class="alinha-direita"><small>${dataBR(item.prazo)}</small>${seloPrazo(item)}</span></button>`).join("")}</div>` : vazio("Nenhum orçamento ou pedido em produção.")}
      </section>
    </div>
    <div class="atalhos">
      <button class="atalho" data-acao="novo-pedido">${svg(icones.pedidos)}<span><strong>Novo pedido</strong><small>Orçamento ou produção</small></span></button>
      <button class="atalho" data-acao="novo-cliente">${svg(icones.clientes)}<span><strong>Novo cliente</strong><small>Empresa ou pessoa</small></span></button>
      <button class="atalho" data-acao="novo-produto">${svg(icones.produtos)}<span><strong>Novo produto</strong><small>Código, dureza e preço</small></span></button>
      <button class="atalho" data-acao="editar-esteira">${svg(icones.esteira)}<span><strong>Editar esteira</strong><small>Etapas da produção</small></span></button>
    </div>`;
}

// ---------- acompanhamento ----------

function secaoAcompanhamento() {
  const orcamentos = doStatus("orcamento").sort(porPrazo);
  const colunaOrcamento = `<section class="coluna coluna-orcamento" aria-label="Orçamentos">
      <header><h2>Orçamento</h2><span class="contador">${orcamentos.length}</span></header>
      <div class="coluna-cartoes">${orcamentos.length ? orcamentos.map(cartaoPedido).join("") : '<p class="coluna-vazia">Nenhum orçamento em aberto.</p>'}</div>
    </section>`;
  const colunas = etapas()
    .map((etapa) => {
      const itens = pedidosNaEtapa(estado.dados.pedidos, etapa.id).sort(porPrazo);
      return `<section class="coluna" aria-label="${esc(etapa.nome)}">
        <header><h2>${esc(etapa.nome)}</h2><span class="contador">${itens.length}</span></header>
        <div class="coluna-cartoes">${itens.length ? itens.map(cartaoPedido).join("") : '<p class="coluna-vazia">Nenhum pedido nesta etapa.</p>'}</div>
      </section>`;
    })
    .join("");
  return `<div class="faixa-intro"><p class="introducao">O orçamento aprovado entra na primeira etapa da esteira. Use <strong>Avançar</strong> a cada etapa concluída; na última, <strong>Finalizar</strong>.</p><button class="botao" data-acao="editar-esteira">${svg(icones.esteira)} Editar esteira</button></div><div class="quadro">${colunaOrcamento}${colunas}</div>`;
}

function cartaoPedido(item) {
  const proxima = proximaEtapa(item, etapas());
  let acao = "";
  if (podeAprovar(item))
    acao = `<button class="botao pequeno primario" data-acao="aprovar" data-id="${item.id}" aria-label="Aprovar ${esc(item.numero)} e enviar para produção">Aprovar</button>`;
  else if (podeFinalizar(item, etapas()))
    acao = `<button class="botao pequeno primario" data-acao="finalizar" data-id="${item.id}">Finalizar</button>`;
  else if (proxima)
    acao = `<button class="botao pequeno" data-acao="avancar" data-id="${item.id}" aria-label="Avançar ${esc(item.numero)} para ${esc(nomeEtapa(etapas(), proxima))}">Avançar →</button>`;
  return `<article class="cartao">
    <button class="cartao-abrir" data-acao="ver-pedido" data-id="${item.id}">
      <span class="cartao-numero">${esc(item.numero)}${item.status === "orcamento" ? ` · ${moeda(totalPedido(item))}` : ""}</span>
      <strong>${esc(cliente(item.clienteId)?.nome || "Cliente removido")}</strong>
      <small>${resumoItens(item)}</small>
    </button>
    <footer><span class="cartao-prazo">${dataBR(item.prazo)} ${seloPrazo(item)}</span>${acao}</footer>
  </article>`;
}

function resumoItens(item) {
  const nomes = item.itens.map((linha) => `${numero(linha.quantidade)}× ${linha.descricao}`);
  return esc(nomes.length > 2 ? `${nomes.slice(0, 2).join(" · ")} +${nomes.length - 2}` : nomes.join(" · "));
}

// ---------- pedidos ----------

function secaoPedidos() {
  const opcao = (valor, rotulo) =>
    `<option value="${esc(valor)}" ${estado.filtroPedidos === valor ? "selected" : ""}>${esc(rotulo)}</option>`;
  return `<div class="barra-ferramentas">${campoBusca("Buscar número, cliente ou produto…")}
    <select id="filtro-pedidos" aria-label="Filtrar pedidos">
      ${opcao("ativos", "Orçamento e produção")}${opcao("orcamento", "Orçamento")}${opcao("producao", "Em produção")}
      <optgroup label="Etapa da esteira">${etapas().map((etapa) => opcao(`etapa:${etapa.id}`, etapa.nome)).join("")}</optgroup>
      ${opcao("atrasados", "Atrasados")}${opcao("finalizado", "Finalizados")}${opcao("cancelados", "Cancelados")}${opcao("todos", "Todos")}
    </select></div>
    <div id="lista">${listaPedidos()}</div>`;
}

function filtraPedido(item) {
  const filtro = estado.filtroPedidos;
  if (filtro === "todos") return true;
  if (filtro === "cancelados") return Boolean(item.cancelado);
  if (item.cancelado) return false;
  if (filtro === "ativos") return item.status !== "finalizado";
  if (filtro === "atrasados") return ativo(item) && situacaoPrazo(item, hoje()) === "atrasado";
  if (filtro.startsWith("etapa:")) return item.status === "producao" && item.etapaId === filtro.slice(6);
  return item.status === filtro;
}

function listaPedidos() {
  const itens = estado.dados.pedidos
    .filter(filtraPedido)
    .filter((item) =>
      combina(
        [item.numero, cliente(item.clienteId)?.nome, item.observacoes, ...item.itens.map((linha) => `${linha.descricao} ${produto(linha.produtoId)?.codigo || ""}`)],
        estado.busca,
      ),
    )
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  if (!itens.length) return vazio("Nenhum pedido encontrado.", "Mude a busca ou o filtro.");
  return `<div class="tabela" role="table" aria-label="Pedidos">
    <div class="tabela-cabecalho" role="row"><span role="columnheader">Pedido</span><span role="columnheader">Cliente</span><span role="columnheader">Status</span><span role="columnheader">Prazo</span><span role="columnheader" class="alinha-direita">Total</span></div>
    ${itens
      .map(
        (item) => `<button class="tabela-linha" role="row" data-acao="ver-pedido" data-id="${item.id}">
        <span role="cell" class="destaque">${esc(item.numero)}<small>${dataBR(item.criadoEm)}</small></span>
        <span role="cell">${esc(cliente(item.clienteId)?.nome || "Cliente removido")}<small>${resumoItens(item)}</small></span>
        <span role="cell" class="situacao">${situacaoPedido(item)}</span>
        <span role="cell">${dataBR(item.prazo)}${ativo(item) ? `<small>${rotulosPrazo[situacaoPrazo(item, hoje())]}</small>` : ""}</span>
        <span role="cell" class="alinha-direita destaque">${moeda(totalPedido(item))}</span>
      </button>`,
      )
      .join("")}
  </div>`;
}

// ---------- clientes ----------

function secaoClientes() {
  return `<div class="barra-ferramentas">${campoBusca("Buscar nome, CNPJ/CPF, contato ou cidade…")}</div><div id="lista">${listaClientes()}</div>`;
}

function listaClientes() {
  const itens = estado.dados.clientes
    .filter((item) =>
      combina([item.nome, item.documento, formatarDocumento(item.documento), item.contato, item.cidade, item.email, item.telefone], estado.busca),
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  if (!itens.length) return vazio("Nenhum cliente encontrado.", "Cadastre um cliente ou mude a busca.");
  return `<div class="tabela colunas-clientes" role="table" aria-label="Clientes">
    <div class="tabela-cabecalho" role="row"><span role="columnheader">Cliente</span><span role="columnheader">Contato</span><span role="columnheader">Cidade</span><span role="columnheader" class="alinha-direita">Pedidos</span></div>
    ${itens
      .map((item) => {
        const qtd = estado.dados.pedidos.filter((p) => p.clienteId === item.id).length;
        return `<button class="tabela-linha" role="row" data-acao="ver-cliente" data-id="${item.id}">
          <span role="cell" class="destaque">${esc(item.nome)}<small>${esc(formatarDocumento(item.documento) || "Sem documento")}</small></span>
          <span role="cell">${esc(item.contato || "—")}<small>${esc(formatarTelefone(item.telefone))}</small></span>
          <span role="cell">${esc([item.cidade, item.uf].filter(Boolean).join(" / ") || "—")}</span>
          <span role="cell" class="alinha-direita">${qtd}</span>
        </button>`;
      })
      .join("")}
  </div>`;
}

// ---------- produtos ----------

function secaoProdutos() {
  return `<div class="barra-ferramentas">${campoBusca("Buscar código, nome, dureza ou medida…")}
    <select id="filtro-categoria" aria-label="Filtrar por categoria"><option value="todas">Todas as categorias</option>${categorias.map((item) => `<option ${estado.filtroCategoria === item ? "selected" : ""}>${item}</option>`).join("")}</select></div>
    <div id="lista">${listaProdutos()}</div>`;
}

function listaProdutos() {
  const itens = estado.dados.produtos
    .filter((item) => estado.filtroCategoria === "todas" || item.categoria === estado.filtroCategoria)
    .filter((item) => combina([item.codigo, item.nome, item.categoria, item.dureza, item.medidas, item.descricao], estado.busca))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR"));
  if (!itens.length) return vazio("Nenhum produto encontrado.", "Cadastre um produto ou mude a busca.");
  return `<div class="tabela colunas-produtos" role="table" aria-label="Produtos">
    <div class="tabela-cabecalho" role="row"><span role="columnheader">Produto</span><span role="columnheader">Categoria</span><span role="columnheader">Dureza / medidas</span><span role="columnheader" class="alinha-direita">Preço</span></div>
    ${itens
      .map(
        (item) => `<button class="tabela-linha" role="row" data-acao="editar-produto" data-id="${item.id}">
        <span role="cell" class="destaque">${esc(item.nome)}<small>${esc(item.codigo)}</small></span>
        <span role="cell">${esc(item.categoria)}</span>
        <span role="cell">${esc(item.dureza || "—")}<small>${esc(item.medidas || "")}</small></span>
        <span role="cell" class="alinha-direita destaque">${moeda(item.preco)}<small>por ${esc(item.unidade)}</small></span>
      </button>`,
      )
      .join("")}
  </div>`;
}

// ---------- modais ----------

function moldura(titulo, corpo, largo = false) {
  return `<div class="fundo-modal" data-acao="fechar-fundo"><div class="modal ${largo ? "largo" : ""}" role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
    <div class="modal-topo"><h2 id="titulo-modal">${esc(titulo)}</h2><button class="botao-icone" data-acao="fechar" aria-label="Fechar">×</button></div>
    <div class="modal-corpo">${corpo}</div>
  </div></div>`;
}
function campo(rotulo, nome, valor = "", tipo = "text", extra = "") {
  return `<label>${rotulo}<input name="${nome}" type="${tipo}" value="${esc(valor)}" ${extra}></label>`;
}
function selecao(rotulo, nome, opcoes, valor, extra = "") {
  return `<label>${rotulo}<select name="${nome}" ${extra}>${opcoes.map(([v, r]) => `<option value="${esc(v)}" ${String(v) === String(valor) ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label>`;
}
function rodapeModal(textoSalvar, extraEsquerda = "") {
  return `<div class="modal-acoes"><div>${extraEsquerda}</div><div><button class="botao" type="button" data-acao="fechar">Cancelar</button><button class="botao primario" type="submit">${textoSalvar}</button></div></div>`;
}

// Guarda qual modal está aberto para, ao redesenhar o mesmo, manter a rolagem
// e não repetir a animação de entrada.
let modalAtual = "";

function renderModal(rolagem = document.querySelector("#modal .modal-corpo")?.scrollTop ?? 0) {
  const caixa = document.querySelector("#modal");
  if (!caixa) return;
  const m = estado.modal;
  const chave = m ? `${m.tipo}:${m.id || ""}` : "";
  const mesmo = Boolean(chave) && chave === modalAtual;
  const abrindo = Boolean(chave) && !modalAtual;
  modalAtual = chave;
  caixa.innerHTML = m ? conteudoModal(m) : "";
  caixa.querySelector(".fundo-modal")?.classList.toggle("entrando", abrindo);
  document.body.classList.toggle("com-modal", Boolean(m));
  const corpo = caixa.querySelector(".modal-corpo");
  if (corpo && mesmo) corpo.scrollTop = rolagem;
  else caixa.querySelector("input:not([type=hidden]):not([type=radio]), select, textarea, .modal button")?.focus();
}

function conteudoModal(m) {
  if (m.tipo === "cliente") return modalCliente(m.id);
  if (m.tipo === "ver-cliente") return modalVerCliente(m.id);
  if (m.tipo === "produto") return modalProduto(m.id);
  if (m.tipo === "pedido") return modalPedido();
  if (m.tipo === "ver-pedido") return modalVerPedido(m.id);
  if (m.tipo === "finalizar") return modalFinalizar(m.id);
  if (m.tipo === "cancelar") return modalCancelar(m.id);
  if (m.tipo === "esteira") return modalEsteira();
  if (m.tipo === "confirmar") return modalConfirmar(m);
  return "";
}

function modalCliente(id) {
  const c = cliente(id) || {};
  return moldura(id ? "Editar cliente" : "Novo cliente", `<form id="form-cliente" data-id="${esc(id || "")}">
    <div class="grade">
      <div class="inteiro">${campo("Nome ou razão social *", "nome", c.nome, "text", "required")}</div>
      ${campo("CNPJ ou CPF", "documento", formatarDocumento(c.documento), "text", 'inputmode="numeric"')}
      ${campo("Pessoa de contato", "contato", c.contato)}
      ${campo("Telefone / WhatsApp", "telefone", formatarTelefone(c.telefone), "tel")}
      ${campo("E-mail", "email", c.email, "email")}
      ${campo("Cidade", "cidade", c.cidade)}
      ${campo("UF", "uf", c.uf, "text", 'maxlength="2"')}
      <label class="inteiro">Observações<textarea name="observacoes" rows="2">${esc(c.observacoes)}</textarea></label>
    </div>
    ${rodapeModal(id ? "Salvar alterações" : "Cadastrar cliente")}
  </form>`);
}

function modalVerCliente(id) {
  const c = cliente(id);
  if (!c) return "";
  const lista = estado.dados.pedidos.filter((p) => p.clienteId === id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const total = lista.filter((p) => !p.cancelado && p.status !== "orcamento").reduce((soma, p) => soma + totalPedido(p), 0);
  return moldura(c.nome, `<dl class="ficha">
      <div><dt>CNPJ / CPF</dt><dd>${esc(formatarDocumento(c.documento) || "—")}</dd></div>
      <div><dt>Contato</dt><dd>${esc(c.contato || "—")}</dd></div>
      <div><dt>Telefone</dt><dd>${esc(formatarTelefone(c.telefone) || "—")}</dd></div>
      <div><dt>E-mail</dt><dd>${esc(c.email || "—")}</dd></div>
      <div><dt>Cidade</dt><dd>${esc([c.cidade, c.uf].filter(Boolean).join(" / ") || "—")}</dd></div>
      <div><dt>Total aprovado</dt><dd>${moeda(total)}</dd></div>
      ${c.observacoes ? `<div class="inteiro"><dt>Observações</dt><dd>${esc(c.observacoes)}</dd></div>` : ""}
    </dl>
    <div class="bloco-topo"><h3>Pedidos (${lista.length})</h3><button class="botao pequeno primario" data-acao="novo-pedido" data-cliente="${c.id}">+ Novo pedido</button></div>
    ${lista.length ? `<div class="lista-simples">${lista.map((p) => `<button class="linha-simples" data-acao="ver-pedido" data-id="${p.id}"><span><strong>${esc(p.numero)}</strong><small>${dataBR(p.criadoEm)} · ${moeda(totalPedido(p))}</small></span>${seloStatus(p)}</button>`).join("")}</div>` : vazio("Nenhum pedido deste cliente.")}
    <div class="modal-acoes"><div>${lista.length ? "" : `<button class="botao perigo" data-acao="excluir-cliente" data-id="${c.id}">Excluir cliente</button>`}</div><div><button class="botao" data-acao="editar-cliente" data-id="${c.id}">Editar dados</button></div></div>`, true);
}

function modalProduto(id) {
  const p = produto(id) || { unidade: "peça", categoria: categorias[0] };
  const emUso = id && estado.dados.pedidos.some((pd) => pd.itens.some((linha) => linha.produtoId === id));
  return moldura(id ? "Editar produto" : "Novo produto", `<form id="form-produto" data-id="${esc(id || "")}">
    <div class="grade">
      ${campo("Código *", "codigo", p.codigo, "text", 'required autocomplete="off"')}
      ${selecao("Categoria", "categoria", categorias.map((c) => [c, c]), p.categoria)}
      <div class="inteiro">${campo("Nome do produto *", "nome", p.nome, "text", "required")}</div>
      ${campo("Dureza", "dureza", p.dureza, "text", 'placeholder="Ex.: 95 Shore A"')}
      ${campo("Medidas", "medidas", p.medidas, "text", 'placeholder="Ex.: Ø 254 × 102 mm"')}
      ${campo("Preço de referência (R$)", "preco", p.preco != null ? valor2(p.preco) : "", "text", 'inputmode="decimal"')}
      ${selecao("Unidade", "unidade", unidades.map((u) => [u, u]), p.unidade)}
      <label class="inteiro">Descrição / observações técnicas<textarea name="descricao" rows="2">${esc(p.descricao)}</textarea></label>
    </div>
    ${rodapeModal(id ? "Salvar alterações" : "Cadastrar produto", id ? (emUso ? '<small class="dica">Usado em pedidos: não pode ser excluído.</small>' : `<button class="botao perigo" type="button" data-acao="excluir-produto" data-id="${id}">Excluir</button>`) : "")}
  </form>`);
}

function novaLinha() {
  return { produtoId: "", descricao: "", quantidade: 1, precoUnitario: 0, observacao: "" };
}

function modalPedido() {
  const r = estado.rascunho;
  const opcoesClientes = [["", "Selecione o cliente"], ...[...estado.dados.clientes].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((c) => [c.id, c.nome])];
  const opcoesProdutos = [["", "Selecione o produto"], ...estado.dados.produtos.map((p) => [p.id, `${p.codigo} · ${p.nome}`])];
  const linhas = r.itens
    .map(
      (linha, i) => `<fieldset class="item-pedido">
      <legend>Item ${i + 1}</legend>
      <div class="grade item-grade">
        <div class="inteiro">${selecao("Produto *", "produtoId", opcoesProdutos, linha.produtoId, `data-indice="${i}" required`)}</div>
        <label>Quantidade *<input name="quantidade" data-indice="${i}" inputmode="decimal" value="${esc(numero(linha.quantidade))}" required></label>
        <label>Preço unitário (R$)<input name="precoUnitario" data-indice="${i}" inputmode="decimal" value="${esc(valor2(linha.precoUnitario))}"></label>
        <div class="total-item"><span>Subtotal</span><strong data-subtotal="${i}">${moeda(totalItem(linha))}</strong></div>
        <label class="inteiro">Especificação do item<input name="observacao" data-indice="${i}" value="${esc(linha.observacao)}" placeholder="Ex.: núcleo do cliente, desenho rev. B, cor"></label>
      </div>
      ${r.itens.length > 1 ? `<button class="link perigo" type="button" data-acao="remover-item" data-indice="${i}">Remover item</button>` : ""}
    </fieldset>`,
    )
    .join("");
  // Só pedido novo escolhe por onde começa; depois disso o status muda pelas ações.
  const inicio = r.id
    ? ""
    : `<fieldset class="escolha-status inteiro"><legend>Começa como</legend>
        <label class="opcao"><input type="radio" name="statusInicial" value="orcamento" ${r.statusInicial !== "producao" ? "checked" : ""}><span><strong>Orçamento</strong><small>Aguarda a aprovação do cliente</small></span></label>
        <label class="opcao"><input type="radio" name="statusInicial" value="producao" ${r.statusInicial === "producao" ? "checked" : ""}><span><strong>Em produção</strong><small>Já aprovado: entra em ${esc(etapas()[0].nome)}</small></span></label>
      </fieldset>`;
  return moldura(r.id ? `Editar ${r.numero}` : "Novo pedido", `<form id="form-pedido" novalidate>
    <div class="grade">
      ${inicio}
      <div class="inteiro com-acao">${selecao("Cliente *", "clienteId", opcoesClientes, r.clienteId, "required")}<button class="link" type="button" data-acao="cliente-do-pedido">+ Cadastrar cliente</button></div>
      ${campo("Prazo de entrega", "prazo", r.prazo, "date")}
      ${campo("Desconto (R$)", "desconto", r.desconto ? valor2(r.desconto) : "", "text", 'inputmode="decimal" placeholder="0,00"')}
    </div>
    <h3 class="subtitulo">Itens</h3>
    ${linhas}
    <button class="botao tracejado" type="button" data-acao="adicionar-item">+ Adicionar item</button>
    <label class="bloco-campo">Observações do pedido<textarea name="observacoes" rows="2">${esc(r.observacoes)}</textarea></label>
    <div class="resumo-total"><span>Total do pedido</span><strong id="total-pedido">${moeda(totalPedido(r))}</strong></div>
    <div class="alerta-form" id="erro-pedido" role="alert" hidden></div>
    ${rodapeModal(r.id ? "Salvar pedido" : r.statusInicial === "producao" ? "Criar e enviar para produção" : "Criar orçamento")}
  </form>`, true);
}

function modalVerPedido(id) {
  const p = pedido(id);
  if (!p) return "";
  const c = cliente(p.clienteId);
  const lista = etapas();
  const ordemStatus = ["orcamento", "producao", "finalizado"];
  const posicaoStatus = ordemStatus.indexOf(p.status);
  const trilha = ordemStatus
    .map((status, i) => `<li class="${i < posicaoStatus ? "feito" : i === posicaoStatus ? (p.cancelado ? "parado" : "atual") : ""}">${statusPedido[status]}</li>`)
    .join("");

  let esteira = "";
  if (p.status === "orcamento") {
    esteira = `<div class="aviso-orcamento"><strong>Este pedido ainda é um orçamento.</strong><p>Ao aprovar, ele entra em <em>${esc(lista[0].nome)}</em>, a primeira etapa da esteira.</p></div>`;
  } else {
    const atual = p.status === "finalizado" ? lista.length : indiceEtapa(lista, p.etapaId);
    esteira = `<ol class="linha-tempo">${lista
      .map((etapa, i) => {
        const registro = [...p.historico].reverse().find((h) => h.tipo === "etapa" && h.etapaId === etapa.id);
        const classe = i < atual ? "feita" : i === atual ? (p.cancelado ? "feita" : "atual") : "";
        const detalhe = registro && i <= atual ? dataHoraBR(registro.em) : i === atual + 1 && !p.cancelado ? "Próxima etapa" : "";
        return `<li class="${classe}"><span class="ponto" aria-hidden="true"></span><span><strong>${esc(etapa.nome)}</strong><small>${detalhe}</small></span></li>`;
      })
      .join("")}</ol>`;
  }

  const proxima = proximaEtapa(p, lista);
  const anterior = etapaAnterior(p, lista);
  const acoes = [];
  if (podeAprovar(p)) acoes.push(`<button class="botao primario" data-acao="aprovar" data-id="${p.id}">Aprovar e enviar para produção</button>`);
  if (podeFinalizar(p, lista)) acoes.push(`<button class="botao primario" data-acao="finalizar" data-id="${p.id}">Finalizar pedido</button>`);
  if (proxima) acoes.push(`<button class="botao primario" data-acao="avancar" data-id="${p.id}">Avançar para ${esc(nomeEtapa(lista, proxima))} →</button>`);
  if (anterior) acoes.push(`<button class="botao" data-acao="voltar-etapa" data-id="${p.id}">← Voltar para ${esc(nomeEtapa(lista, anterior))}</button>`);
  else if (p.status === "producao" && !p.cancelado) acoes.push(`<button class="botao" data-acao="voltar-orcamento" data-id="${p.id}">← Voltar para orçamento</button>`);

  const encerrado = p.cancelado || p.status === "finalizado";
  const historico = [...p.historico]
    .reverse()
    .map((h) => `<li><span>${dataHoraBR(h.em)}</span><strong>${esc(h.nome)}</strong>${h.nota ? `<small>${esc(h.nota)}</small>` : ""}</li>`)
    .join("");

  return moldura(p.numero, `<ol class="trilha-status" aria-label="Status do pedido">${trilha}</ol>
    <div class="pedido-cabecalho">
      <div><span class="rotulo">Cliente</span><button class="link forte" data-acao="ver-cliente" data-id="${p.clienteId}">${esc(c?.nome || "Cliente removido")}</button><small>${esc([c?.contato, formatarTelefone(c?.telefone)].filter(Boolean).join(" · "))}</small></div>
      <div><span class="rotulo">Aberto em</span><strong>${dataBR(p.criadoEm)}</strong></div>
      <div><span class="rotulo">Prazo</span><strong>${dataBR(p.prazo)}</strong>${seloPrazo(p)}</div>
      <div><span class="rotulo">Total</span><strong>${moeda(totalPedido(p))}</strong><small>${plural(p.itens.length, "item", "itens")}</small></div>
    </div>
    ${p.cancelado ? `<div class="faixa cancelado"><strong>Pedido cancelado em ${dataBR(p.cancelado.em)}.</strong> ${esc(p.cancelado.motivo || "")}</div>` : ""}
    ${p.entrega ? `<div class="faixa entregue"><strong>Entregue em ${dataBR(p.entrega.data)}</strong>${p.entrega.recebidoPor ? ` · recebido por ${esc(p.entrega.recebidoPor)}` : ""}${p.entrega.notaFiscal ? ` · NF ${esc(p.entrega.notaFiscal)}` : ""}${p.entrega.observacao ? `<br>${esc(p.entrega.observacao)}` : ""}</div>` : ""}
    <div class="pedido-corpo">
      <section><h3>Esteira de produção</h3>${esteira}${acoes.length && !p.cancelado ? `<div class="acoes-etapa">${acoes.join("")}</div>` : ""}</section>
      <section><h3>Itens</h3>
        <div class="itens-lista">${p.itens.map((linha) => `<div class="item-linha"><span><strong>${esc(linha.descricao)}</strong><small>${esc(produto(linha.produtoId)?.codigo || "")}${linha.observacao ? ` · ${esc(linha.observacao)}` : ""}</small></span><span class="alinha-direita"><strong>${moeda(totalItem(linha))}</strong><small>${numero(linha.quantidade)} × ${moeda(linha.precoUnitario)}</small></span></div>`).join("")}
          ${Number(p.desconto) ? `<div class="item-linha discreto"><span>Desconto</span><span class="alinha-direita">− ${moeda(p.desconto)}</span></div>` : ""}
          <div class="item-linha total"><span>Total</span><strong class="alinha-direita">${moeda(totalPedido(p))}</strong></div>
        </div>
        ${p.observacoes ? `<h3>Observações</h3><p class="texto">${esc(p.observacoes)}</p>` : ""}
        <h3>Histórico</h3><ol class="historico">${historico}</ol>
      </section>
    </div>
    ${encerrado ? "" : `<div class="modal-acoes"><div><button class="botao perigo" data-acao="cancelar-pedido" data-id="${p.id}">Cancelar pedido</button></div><div><button class="botao" data-acao="editar-pedido" data-id="${p.id}">Editar pedido</button></div></div>`}`, true);
}

function modalFinalizar(id) {
  const p = pedido(id);
  return moldura(`Finalizar ${p.numero}`, `<form id="form-finalizar" data-id="${p.id}">
    <p class="dica">Registre a entrega. O pedido sai da esteira e entra no entregue do mês.</p>
    <div class="grade">
      ${campo("Data da entrega *", "data", hoje(), "date", "required")}
      ${campo("Nota fiscal", "notaFiscal", "", "text", 'placeholder="Opcional"')}
      <div class="inteiro">${campo("Recebido por", "recebidoPor", cliente(p.clienteId)?.contato || "")}</div>
      <label class="inteiro">Observação da entrega<textarea name="observacao" rows="2"></textarea></label>
    </div>
    ${rodapeModal("Finalizar pedido")}
  </form>`);
}

function modalCancelar(id) {
  const p = pedido(id);
  return moldura(`Cancelar ${p.numero}`, `<form id="form-cancelar" data-id="${p.id}">
    <p class="dica">O pedido fica guardado como cancelado e sai da esteira.</p>
    <label class="bloco-campo">Motivo<textarea name="motivo" rows="2" placeholder="Ex.: cliente não aprovou o orçamento"></textarea></label>
    <div class="modal-acoes"><div></div><div><button class="botao" type="button" data-acao="ver-pedido" data-id="${p.id}">Voltar</button><button class="botao perigo-cheio" type="submit">Cancelar pedido</button></div></div>
  </form>`);
}

function modalEsteira() {
  const linhas = estado.rascunhoEsteira;
  const ficam = linhas.filter((linha) => !linha.removida);
  // Se o destino escolhido também foi removido, aponta para a primeira etapa que fica.
  for (const linha of linhas) {
    if (linha.removida && !ficam.some((f) => f.id === linha.destino)) linha.destino = ficam[0]?.id || "";
  }
  let posicao = 0;
  const itens = linhas
    .map((linha, i) => {
      const qtd = pedidosNaEtapa(estado.dados.pedidos, linha.id).length;
      if (linha.removida) {
        return `<li class="esteira-linha removida">
          <span class="esteira-num" aria-hidden="true">—</span>
          <div class="esteira-campo"><s>${esc(linha.nome)}</s>
            <label class="esteira-destino">${plural(qtd, "pedido vai", "pedidos vão")} para
              <select data-destino="${i}">${ficam.map((f) => `<option value="${esc(f.id)}" ${f.id === linha.destino ? "selected" : ""}>${esc(f.nome || "Etapa sem nome")}</option>`).join("")}</select>
            </label>
          </div>
          <div class="esteira-botoes"><button class="botao pequeno" type="button" data-acao="esteira-desfazer" data-indice="${i}">Desfazer</button></div>
        </li>`;
      }
      posicao += 1;
      return `<li class="esteira-linha">
        <span class="esteira-num" aria-hidden="true">${posicao}</span>
        <div class="esteira-campo"><input data-etapa-nome="${i}" value="${esc(linha.nome)}" aria-label="Nome da etapa ${posicao}" placeholder="Nome da etapa" maxlength="60">${qtd ? `<small>${plural(qtd, "pedido nesta etapa", "pedidos nesta etapa")}</small>` : ""}</div>
        <div class="esteira-botoes">
          <button class="botao-icone pequeno" type="button" data-acao="esteira-subir" data-indice="${i}" aria-label="Subir ${esc(linha.nome)}" ${i === 0 ? "disabled" : ""}>↑</button>
          <button class="botao-icone pequeno" type="button" data-acao="esteira-descer" data-indice="${i}" aria-label="Descer ${esc(linha.nome)}" ${i === linhas.length - 1 ? "disabled" : ""}>↓</button>
          <button class="botao-icone pequeno perigo" type="button" data-acao="esteira-remover" data-indice="${i}" aria-label="Remover ${esc(linha.nome)}" ${ficam.length === 1 ? "disabled" : ""}>×</button>
        </div>
      </li>`;
    })
    .join("");
  return moldura("Esteira de produção", `<form id="form-esteira" novalidate>
    <p class="dica">Estas são as etapas por onde passa um pedido em produção, na ordem. Renomeie, mude a ordem, inclua ou remova. A <strong>última etapa</strong> libera a finalização do pedido.</p>
    <ol class="esteira-lista">${itens}</ol>
    <button class="botao tracejado" type="button" data-acao="esteira-adicionar">+ Adicionar etapa</button>
    <div class="alerta-form" role="alert" hidden></div>
    ${rodapeModal("Salvar esteira", '<button class="link" type="button" data-acao="esteira-padrao">Voltar ao padrão</button>')}
  </form>`);
}

function modalConfirmar(m) {
  return moldura(m.titulo, `<p>${esc(m.texto)}</p><div class="modal-acoes"><div></div><div><button class="botao" data-acao="fechar">Voltar</button><button class="botao perigo-cheio" data-acao="${m.acao}" data-id="${m.id || ""}">${esc(m.confirmar || "Excluir")}</button></div></div>`);
}

// ---------- ações ----------

function abrir(modal) {
  estado.modal = modal;
  renderModal();
}
function fechar() {
  // Desistiu de cadastrar o cliente no meio do pedido: volta ao pedido.
  if (estado.retornoPedido && estado.modal?.tipo === "cliente") {
    estado.rascunho = estado.retornoPedido;
    estado.retornoPedido = null;
    abrir({ tipo: "pedido" });
    return;
  }
  estado.modal = null;
  estado.rascunho = null;
  estado.rascunhoEsteira = null;
  estado.retornoPedido = null;
  renderModal();
}
function concluir(mensagem, proximoModal = null) {
  salvar();
  estado.modal = proximoModal;
  if (!proximoModal) estado.rascunho = null;
  estado.rascunhoEsteira = null;
  render();
  avisar(mensagem);
}

function registrar(p, evento) {
  p.historico.push({ em: agora(), nota: "", ...evento });
}
function irParaEtapa(p, etapaId, nota = "") {
  p.etapaId = etapaId;
  registrar(p, { tipo: "etapa", etapaId, nome: nomeEtapa(etapas(), etapaId), nota });
}
function mudarStatus(p, status, nota = "") {
  p.status = status;
  registrar(p, { tipo: "status", status, nome: statusPedido[status], nota });
}

function abrirPedido(clienteId = "", id = null) {
  if (id) {
    const p = pedido(id);
    estado.rascunho = structuredClone({ id: p.id, numero: p.numero, clienteId: p.clienteId, prazo: p.prazo, itens: p.itens, desconto: p.desconto, observacoes: p.observacoes });
  } else {
    estado.rascunho = { clienteId, prazo: "", itens: [novaLinha()], desconto: 0, observacoes: "", statusInicial: "orcamento" };
  }
  abrir({ tipo: "pedido" });
}

function lerRascunho(form) {
  const r = estado.rascunho;
  r.clienteId = form.elements.clienteId.value;
  r.prazo = form.elements.prazo.value;
  r.desconto = lerNumero(form.elements.desconto.value);
  r.observacoes = form.elements.observacoes.value;
  if (form.elements.statusInicial) r.statusInicial = form.elements.statusInicial.value;
  form.querySelectorAll("[data-indice]").forEach((el) => {
    const linha = r.itens[Number(el.dataset.indice)];
    if (!linha || !el.name) return;
    linha[el.name] = el.name === "quantidade" || el.name === "precoUnitario" ? lerNumero(el.value) : el.value;
  });
}

function trocarLinhasEsteira(i, j) {
  const linhas = estado.rascunhoEsteira;
  if (j < 0 || j >= linhas.length) return;
  [linhas[i], linhas[j]] = [linhas[j], linhas[i]];
  renderModal();
  document.querySelector(`[data-acao="${j < i ? "esteira-subir" : "esteira-descer"}"][data-indice="${j}"]`)?.focus();
}

const acoes = {
  fechar,
  "fechar-fundo": (alvo, evento) => {
    if (evento.target === alvo) fechar();
  },
  restaurar: () =>
    abrir({ tipo: "confirmar", titulo: "Restaurar dados de exemplo", texto: "Tudo o que foi cadastrado nesta prévia, inclusive a esteira, será apagado e os dados de exemplo voltam.", acao: "confirmar-restaurar", confirmar: "Restaurar" }),
  "confirmar-restaurar": () => {
    estado.dados = gerarExemplo();
    concluir("Dados de exemplo restaurados.");
  },
  "novo-cliente": () => abrir({ tipo: "cliente" }),
  "editar-cliente": (alvo) => abrir({ tipo: "cliente", id: alvo.dataset.id }),
  "ver-cliente": (alvo) => abrir({ tipo: "ver-cliente", id: alvo.dataset.id }),
  "excluir-cliente": (alvo) =>
    abrir({ tipo: "confirmar", titulo: "Excluir cliente", texto: `${cliente(alvo.dataset.id).nome} será removido do cadastro.`, acao: "confirmar-excluir-cliente", id: alvo.dataset.id }),
  "confirmar-excluir-cliente": (alvo) => {
    estado.dados.clientes = estado.dados.clientes.filter((c) => c.id !== alvo.dataset.id);
    concluir("Cliente excluído.");
  },
  "novo-produto": () => abrir({ tipo: "produto" }),
  "editar-produto": (alvo) => abrir({ tipo: "produto", id: alvo.dataset.id }),
  "excluir-produto": (alvo) =>
    abrir({ tipo: "confirmar", titulo: "Excluir produto", texto: `${produto(alvo.dataset.id).nome} será removido do catálogo.`, acao: "confirmar-excluir-produto", id: alvo.dataset.id }),
  "confirmar-excluir-produto": (alvo) => {
    estado.dados.produtos = estado.dados.produtos.filter((p) => p.id !== alvo.dataset.id);
    concluir("Produto excluído.");
  },
  "novo-pedido": (alvo) => abrirPedido(alvo.dataset.cliente || ""),
  "editar-pedido": (alvo) => abrirPedido("", alvo.dataset.id),
  "ver-pedido": (alvo) => abrir({ tipo: "ver-pedido", id: alvo.dataset.id }),
  "adicionar-item": () => {
    lerRascunho(document.querySelector("#form-pedido"));
    estado.rascunho.itens.push(novaLinha());
    renderModal();
    const selects = document.querySelectorAll('#form-pedido select[name="produtoId"]');
    selects[selects.length - 1]?.focus();
  },
  "remover-item": (alvo) => {
    lerRascunho(document.querySelector("#form-pedido"));
    estado.rascunho.itens.splice(Number(alvo.dataset.indice), 1);
    renderModal();
  },
  "cliente-do-pedido": () => {
    lerRascunho(document.querySelector("#form-pedido"));
    estado.retornoPedido = estado.rascunho;
    abrir({ tipo: "cliente" });
  },
  aprovar: (alvo) => {
    const p = pedido(alvo.dataset.id);
    if (!podeAprovar(p)) return;
    mudarStatus(p, "producao", "Orçamento aprovado");
    irParaEtapa(p, etapas()[0].id);
    concluir(`${p.numero} aprovado: entrou em ${etapas()[0].nome}.`, estado.modal);
  },
  avancar: (alvo) => {
    const p = pedido(alvo.dataset.id);
    const destino = proximaEtapa(p, etapas());
    if (!destino) return;
    irParaEtapa(p, destino);
    concluir(`${p.numero} avançou para ${nomeEtapa(etapas(), destino)}.`, estado.modal);
  },
  "voltar-etapa": (alvo) => {
    const p = pedido(alvo.dataset.id);
    const destino = etapaAnterior(p, etapas());
    if (!destino) return;
    irParaEtapa(p, destino, "Etapa corrigida");
    concluir(`${p.numero} voltou para ${nomeEtapa(etapas(), destino)}.`, estado.modal);
  },
  "voltar-orcamento": (alvo) => {
    const p = pedido(alvo.dataset.id);
    p.etapaId = null;
    mudarStatus(p, "orcamento", "Voltou para orçamento");
    concluir(`${p.numero} voltou para orçamento.`, estado.modal);
  },
  finalizar: (alvo) => abrir({ tipo: "finalizar", id: alvo.dataset.id }),
  "cancelar-pedido": (alvo) => abrir({ tipo: "cancelar", id: alvo.dataset.id }),

  "editar-esteira": () => {
    estado.rascunhoEsteira = etapas().map((etapa) => ({ ...etapa, removida: false, destino: "" }));
    abrir({ tipo: "esteira" });
  },
  "esteira-adicionar": () => {
    estado.rascunhoEsteira.push({ id: `e${novoId()}`, nome: "", removida: false, destino: "", nova: true });
    renderModal();
    const campos = document.querySelectorAll("[data-etapa-nome]");
    campos[campos.length - 1]?.focus();
  },
  "esteira-subir": (alvo) => trocarLinhasEsteira(Number(alvo.dataset.indice), Number(alvo.dataset.indice) - 1),
  "esteira-descer": (alvo) => trocarLinhasEsteira(Number(alvo.dataset.indice), Number(alvo.dataset.indice) + 1),
  "esteira-remover": (alvo) => {
    const linhas = estado.rascunhoEsteira;
    const i = Number(alvo.dataset.indice);
    const linha = linhas[i];
    // Sem pedido parado nela, a etapa some na hora; com pedido, pede o destino.
    if (!pedidosNaEtapa(estado.dados.pedidos, linha.id).length) {
      linhas.splice(i, 1);
    } else {
      const vizinha = [...linhas.slice(0, i)].reverse().find((l) => !l.removida) || linhas.slice(i + 1).find((l) => !l.removida);
      linha.removida = true;
      linha.destino = vizinha?.id || "";
    }
    renderModal();
  },
  "esteira-desfazer": (alvo) => {
    const linha = estado.rascunhoEsteira[Number(alvo.dataset.indice)];
    linha.removida = false;
    linha.destino = "";
    renderModal();
  },
  "esteira-padrao": () => {
    // Etapas criadas pelo cliente que ainda têm pedido entram como removidas,
    // para ele escolher o destino desses pedidos antes de salvar.
    const atuais = estado.rascunhoEsteira;
    const novas = esteiraPadrao.map((etapa) => ({ ...etapa, removida: false, destino: "" }));
    const sobrando = atuais
      .filter((l) => !novas.some((n) => n.id === l.id) && pedidosNaEtapa(estado.dados.pedidos, l.id).length)
      .map((l) => ({ ...l, removida: true, destino: novas[0].id }));
    estado.rascunhoEsteira = [...novas, ...sobrando];
    renderModal();
  },
};

const formularios = {
  "form-cliente": (form, dados) => {
    const documento = somenteDigitos(dados.documento);
    const repetido = documento && estado.dados.clientes.find((c) => c.documento === documento && c.id !== form.dataset.id);
    if (repetido) return `Já existe um cliente com esse documento: ${repetido.nome}.`;
    const registro = {
      nome: dados.nome.trim(),
      documento,
      contato: dados.contato.trim(),
      telefone: somenteDigitos(dados.telefone),
      email: dados.email.trim(),
      cidade: dados.cidade.trim(),
      uf: dados.uf.trim().toUpperCase(),
      observacoes: dados.observacoes.trim(),
    };
    if (form.dataset.id) {
      Object.assign(cliente(form.dataset.id), registro);
      concluir("Cliente atualizado.", { tipo: "ver-cliente", id: form.dataset.id });
      return;
    }
    const novo = { id: novoId(), criadoEm: agora(), ...registro };
    estado.dados.clientes.push(novo);
    if (estado.retornoPedido) {
      estado.rascunho = estado.retornoPedido;
      estado.rascunho.clienteId = novo.id;
      estado.retornoPedido = null;
      concluir("Cliente cadastrado.", { tipo: "pedido" });
      return;
    }
    concluir("Cliente cadastrado.");
  },
  "form-produto": (form, dados) => {
    const codigo = dados.codigo.trim().toUpperCase();
    if (estado.dados.produtos.some((p) => p.codigo.toUpperCase() === codigo && p.id !== form.dataset.id))
      return `O código ${codigo} já está em uso.`;
    const registro = {
      codigo,
      nome: dados.nome.trim(),
      categoria: dados.categoria,
      dureza: dados.dureza.trim(),
      medidas: dados.medidas.trim(),
      preco: lerNumero(dados.preco),
      unidade: dados.unidade,
      descricao: dados.descricao.trim(),
    };
    if (form.dataset.id) Object.assign(produto(form.dataset.id), registro);
    else estado.dados.produtos.push({ id: novoId(), ...registro });
    concluir(form.dataset.id ? "Produto atualizado." : "Produto cadastrado.");
  },
  "form-pedido": (form) => {
    lerRascunho(form);
    const r = estado.rascunho;
    if (!r.clienteId) return "Selecione o cliente.";
    if (r.itens.some((linha) => !linha.produtoId)) return "Escolha o produto de todos os itens.";
    if (r.itens.some((linha) => !(linha.quantidade > 0))) return "Informe a quantidade de todos os itens.";
    const itens = r.itens.map((linha) => ({ ...linha, descricao: produto(linha.produtoId)?.nome || linha.descricao }));
    if (r.id) {
      Object.assign(pedido(r.id), { clienteId: r.clienteId, prazo: r.prazo, itens, desconto: r.desconto, observacoes: r.observacoes.trim() });
      concluir(`${r.numero} atualizado.`, { tipo: "ver-pedido", id: r.id });
      return;
    }
    const novo = {
      id: novoId(),
      numero: proximoNumero(estado.dados.pedidos, new Date().getFullYear()),
      clienteId: r.clienteId,
      criadoEm: agora(),
      prazo: r.prazo,
      status: "orcamento",
      etapaId: null,
      itens,
      desconto: r.desconto,
      observacoes: r.observacoes.trim(),
      historico: [],
    };
    registrar(novo, { tipo: "status", status: "orcamento", nome: statusPedido.orcamento });
    if (r.statusInicial === "producao") {
      mudarStatus(novo, "producao", "Criado já aprovado");
      irParaEtapa(novo, etapas()[0].id);
    }
    estado.dados.pedidos.push(novo);
    concluir(`${novo.numero} criado como ${statusPedido[novo.status].toLowerCase()}.`, { tipo: "ver-pedido", id: novo.id });
  },
  "form-finalizar": (form, dados) => {
    const p = pedido(form.dataset.id);
    if (!dados.data) return "Informe a data da entrega.";
    if (!podeFinalizar(p, etapas())) return "O pedido precisa estar na última etapa da esteira.";
    p.entrega = { data: dados.data, notaFiscal: dados.notaFiscal.trim(), recebidoPor: dados.recebidoPor.trim(), observacao: dados.observacao.trim() };
    mudarStatus(p, "finalizado");
    concluir(`${p.numero} finalizado.`, { tipo: "ver-pedido", id: p.id });
  },
  "form-cancelar": (form, dados) => {
    const p = pedido(form.dataset.id);
    p.cancelado = { em: agora(), motivo: dados.motivo.trim() };
    registrar(p, { tipo: "status", status: "cancelado", nome: "Cancelado", nota: dados.motivo.trim() });
    concluir(`${p.numero} cancelado.`, { tipo: "ver-pedido", id: p.id });
  },
  "form-esteira": () => {
    const linhas = estado.rascunhoEsteira;
    const erro = validarEsteira(linhas, estado.dados.pedidos);
    if (erro) return erro;
    const resultado = aplicarEsteira(estado.dados.pedidos, linhas, agora());
    estado.dados.etapas = resultado.etapas;
    estado.dados.pedidos = resultado.pedidos;
    if (estado.filtroPedidos.startsWith("etapa:") && !resultado.etapas.some((e) => `etapa:${e.id}` === estado.filtroPedidos))
      estado.filtroPedidos = "ativos";
    concluir("Esteira atualizada.");
  },
};

function mostrarErro(form, mensagem) {
  let caixa = form.querySelector(".alerta-form");
  if (!caixa) {
    caixa = document.createElement("div");
    caixa.className = "alerta-form";
    caixa.setAttribute("role", "alert");
    form.querySelector(".modal-acoes").before(caixa);
  }
  caixa.hidden = false;
  caixa.textContent = mensagem;
}

// ---------- eventos ----------

app.addEventListener("click", (evento) => {
  const ir = evento.target.closest("[data-ir]");
  if (ir) {
    if (ir.dataset.filtro) estado.filtroPedidos = ir.dataset.filtro;
    if (location.hash === `#${ir.dataset.ir}`) render();
    else location.hash = ir.dataset.ir;
    return;
  }
  const alvo = evento.target.closest("[data-acao]");
  if (!alvo || !acoes[alvo.dataset.acao]) return;
  if (alvo.dataset.acao === "fechar-fundo" && evento.target !== alvo) return;
  evento.preventDefault();
  acoes[alvo.dataset.acao](alvo, evento);
});

app.addEventListener("submit", (evento) => {
  const form = evento.target;
  const tratar = formularios[form.id];
  if (!tratar) return;
  evento.preventDefault();
  if (!form.noValidate && !form.reportValidity()) return;
  const erro = tratar(form, Object.fromEntries(new FormData(form)));
  if (erro) mostrarErro(form, erro);
});

app.addEventListener("input", (evento) => {
  const alvo = evento.target;
  if (alvo.id === "busca") {
    estado.busca = alvo.value;
    const lista = document.querySelector("#lista");
    if (lista && listas[estado.secao]) lista.innerHTML = listas[estado.secao]();
    return;
  }
  if (alvo.dataset.etapaNome) {
    const linha = estado.rascunhoEsteira[Number(alvo.dataset.etapaNome)];
    linha.nome = alvo.value;
    // As listas "vão para" das etapas removidas acompanham o nome novo.
    document.querySelectorAll(`[data-destino] option[value="${CSS.escape(linha.id)}"]`).forEach((opcao) => {
      opcao.textContent = alvo.value || "Etapa sem nome";
    });
    return;
  }
  const form = alvo.closest("#form-pedido");
  if (!form) return;
  lerRascunho(form);
  form.querySelectorAll("[data-subtotal]").forEach((el) => {
    el.textContent = moeda(totalItem(estado.rascunho.itens[Number(el.dataset.subtotal)]));
  });
  form.querySelector("#total-pedido").textContent = moeda(totalPedido(estado.rascunho));
});

app.addEventListener("change", (evento) => {
  const alvo = evento.target;
  if (alvo.id === "filtro-pedidos" || alvo.id === "filtro-categoria") {
    if (alvo.id === "filtro-pedidos") estado.filtroPedidos = alvo.value;
    else estado.filtroCategoria = alvo.value;
    document.querySelector("#lista").innerHTML = listas[estado.secao]();
    return;
  }
  if (alvo.dataset.destino) {
    estado.rascunhoEsteira[Number(alvo.dataset.destino)].destino = alvo.value;
    return;
  }
  // O texto do botão de salvar acompanha a escolha de status inicial.
  if (alvo.name === "statusInicial") {
    lerRascunho(alvo.form);
    renderModal();
    return;
  }
  // Ao escolher o produto, o preço de referência entra no item.
  if (alvo.name === "produtoId" && alvo.closest("#form-pedido")) {
    lerRascunho(alvo.form);
    const linha = estado.rascunho.itens[Number(alvo.dataset.indice)];
    const escolhido = produto(alvo.value);
    if (escolhido) {
      linha.precoUnitario = escolhido.preco;
      linha.descricao = escolhido.nome;
    }
    renderModal();
    document.querySelector(`#form-pedido [name="quantidade"][data-indice="${alvo.dataset.indice}"]`)?.focus();
  }
});

// Campo numérico seleciona o valor ao entrar: digitar substitui o "1" em vez de virar "12".
app.addEventListener("focusin", (evento) => {
  const campo = evento.target;
  if (!campo.matches('#form-pedido input[inputmode="decimal"]')) return;
  campo.dataset.selecionar = "1";
  campo.select();
});
// O clique desfaz a seleção do foco; o primeiro clique depois dele seleciona de novo.
app.addEventListener("mouseup", (evento) => {
  const campo = evento.target;
  if (campo.dataset?.selecionar !== "1") return;
  delete campo.dataset.selecionar;
  evento.preventDefault();
  campo.select();
});

document.addEventListener("keydown", (evento) => {
  if (evento.key === "Escape" && estado.modal) fechar();
});

window.addEventListener("hashchange", () => {
  const nova = secaoDoEndereco();
  if (nova !== estado.secao) estado.busca = "";
  estado.secao = nova;
  estado.modal = null;
  estado.rascunho = null;
  estado.rascunhoEsteira = null;
  render();
  window.scrollTo(0, 0);
});

// Mantém os dados entre abas abertas ao mesmo tempo.
window.addEventListener("storage", (evento) => {
  if (evento.key !== CHAVE || !evento.newValue) return;
  estado.dados = JSON.parse(evento.newValue);
  render();
});

render();
