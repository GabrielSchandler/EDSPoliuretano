// Teste de ponta a ponta no Chrome instalado: sobe o Vite, percorre os fluxos
// principais como um usuário e confere o resultado no localStorage.
// Uso: npm run test:navegador   (CHROME_PATH=... para outro executável)
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import puppeteer from "puppeteer-core";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const capturas = fileURLToPath(new URL("../capturas/", import.meta.url));
const chrome =
  process.env.CHROME_PATH ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].find(existsSync);
if (!chrome) throw new Error("Chrome não encontrado. Informe o caminho em CHROME_PATH.");
mkdirSync(capturas, { recursive: true });

const servidor = await createServer({ root: raiz, logLevel: "error", server: { port: 0, host: "127.0.0.1" } });
await servidor.listen();
const endereco = servidor.resolvedUrls.local[0];
const navegador = await puppeteer.launch({ executablePath: chrome, headless: true });
const pagina = await navegador.newPage();
const errosConsole = [];
pagina.on("pageerror", (e) => errosConsole.push(e.message));
pagina.on("console", (m) => m.type() === "error" && errosConsole.push(m.text()));

let falhas = 0;
async function etapa(nome, fn) {
  try {
    await fn();
    console.log(`  ok  ${nome}`);
  } catch (erro) {
    falhas += 1;
    console.log(`  FALHOU  ${nome}\n          ${erro.message}`);
    await foto(`falha-${nome.replace(/\W+/g, "-")}`).catch(() => {});
  }
}
function confere(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const foto = async (nome) => {
  await espera(300);
  await pagina.screenshot({ path: `${capturas}${nome}.png` });
};
const clicar = async (seletor) => {
  await pagina.waitForSelector(seletor, { visible: true, timeout: 4000 });
  await pagina.click(seletor);
};
const digitar = async (seletor, texto) => {
  await pagina.waitForSelector(seletor, { visible: true, timeout: 4000 });
  await pagina.click(seletor);
  await pagina.$eval(seletor, (el) => el.select?.());
  await pagina.type(seletor, texto);
};
const texto = (seletor) => pagina.$eval(seletor, (el) => el.textContent.trim());
const dados = () => pagina.evaluate(() => JSON.parse(localStorage.getItem("eds-gestao-previa-v2")));
// Recarrega sempre: começa a tela limpa (sem busca nem filtro da etapa anterior)
// e prova que o que foi feito ficou salvo.
const ir = async (secao) => {
  await pagina.goto(`${endereco}#${secao}`, { waitUntil: "networkidle0" });
  await pagina.reload({ waitUntil: "networkidle0" });
};
const opcaoPorTexto = (seletor, trecho) =>
  pagina.$eval(seletor, (s, t) => [...s.options].find((o) => o.text.includes(t))?.value, trecho);
const erroDoFormulario = () => pagina.$eval(".alerta-form:not([hidden])", (el) => el.textContent.trim());
const pedidoPorNumero = async (numero) => (await dados()).pedidos.find((p) => p.numero === numero);
const abrirPedido = async (numero) => {
  await ir("pedidos");
  await pagina.select("#filtro-pedidos", "todos");
  await digitar("#busca", numero);
  await clicar("#lista .tabela-linha");
  await pagina.waitForSelector(".trilha-status");
};

console.log(`Testando ${endereco}\n`);
await pagina.setViewport({ width: 1440, height: 900 });
await pagina.goto(endereco, { waitUntil: "networkidle0" });
await pagina.evaluate(() => localStorage.clear());
await pagina.reload({ waitUntil: "networkidle0" });

let numeroNovo = "";

await etapa("painel abre com os dados de exemplo", async () => {
  const metricas = await pagina.$$eval(".metrica strong", (els) => els.map((e) => e.textContent));
  confere(metricas[0] === "2", `orçamentos em aberto: ${metricas[0]}`);
  confere(metricas[1] === "5", `em produção: ${metricas[1]}`);
  await foto("01-painel");
});

await etapa("cadastra cliente e recusa documento repetido", async () => {
  await ir("clientes");
  await clicar('[data-acao="novo-cliente"]');
  await digitar('#form-cliente [name="nome"]', "Indústria Teste Ltda.");
  await digitar('#form-cliente [name="documento"]', "00.111.222/0001-01");
  await pagina.click('#form-cliente [type="submit"]');
  confere((await erroDoFormulario()).includes("Já existe"), "aceitou CNPJ repetido");
  await digitar('#form-cliente [name="documento"]', "00999888000177");
  await pagina.click('#form-cliente [type="submit"]');
  await digitar("#busca", "industria teste");
  confere((await pagina.$$("#lista .tabela-linha")).length === 1, "cliente não aparece na busca");
});

await etapa("cadastra produto e recusa código repetido", async () => {
  await ir("produtos");
  await clicar('[data-acao="novo-produto"]');
  await digitar('#form-produto [name="codigo"]', "rd-254");
  await digitar('#form-produto [name="nome"]', "Duplicado");
  await pagina.click('#form-produto [type="submit"]');
  confere((await erroDoFormulario()).includes("já está em uso"), "aceitou código repetido");
  await digitar('#form-produto [name="codigo"]', "RD-300");
  await digitar('#form-produto [name="nome"]', "Roda de teste 300 mm");
  await digitar('#form-produto [name="preco"]', "1.250,50");
  await pagina.click('#form-produto [type="submit"]');
  const produto = (await dados()).produtos.find((p) => p.codigo === "RD-300");
  confere(produto?.preco === 1250.5, `preço salvo: ${produto?.preco}`);
});

await etapa("cria pedido como orçamento, com dois itens e total certo", async () => {
  await ir("pedidos");
  await clicar('.topo [data-acao="novo-pedido"]');
  await pagina.click('#form-pedido [type="submit"]');
  confere((await erroDoFormulario()).includes("cliente"), "deixou criar sem cliente");
  await pagina.select('#form-pedido [name="clienteId"]', await opcaoPorTexto('#form-pedido [name="clienteId"]', "Indústria Teste"));
  await pagina.select('#form-pedido [name="produtoId"][data-indice="0"]', await opcaoPorTexto('#form-pedido [name="produtoId"]', "RD-300"));
  // Clique simples no campo, como uma pessoa: o "1" é substituído, não vira "12".
  await pagina.click('#form-pedido [name="quantidade"][data-indice="0"]');
  await pagina.type('#form-pedido [name="quantidade"][data-indice="0"]', "2");
  await clicar('[data-acao="adicionar-item"]');
  await pagina.select('#form-pedido [name="produtoId"][data-indice="1"]', "p5");
  await pagina.click('#form-pedido [name="quantidade"][data-indice="1"]');
  await pagina.type('#form-pedido [name="quantidade"][data-indice="1"]', "10");
  const total = await texto("#total-pedido");
  confere(total.replace(/\s/g, " ") === "R$ 3.481,00", `total ${total}`);
  confere((await texto('#form-pedido [type="submit"]')) === "Criar orçamento", "botão deveria dizer Criar orçamento");
  await foto("02-novo-pedido");
  await pagina.click('#form-pedido [type="submit"]');
  await pagina.waitForSelector(".aviso-orcamento");
  numeroNovo = await texto("#titulo-modal");
  const p = await pedidoPorNumero(numeroNovo);
  confere(p.status === "orcamento" && p.etapaId === null, `status ${p.status}`);
  confere(p.itens.length === 2, "itens");
  await foto("03-orcamento");
});

await etapa("orçamento aparece na coluna Orçamento do quadro", async () => {
  await ir("acompanhamento");
  const numeros = await pagina.$$eval(".coluna-orcamento .cartao-numero", (els) => els.map((e) => e.textContent));
  confere(numeros.some((n) => n.startsWith(numeroNovo)), "não está na coluna Orçamento");
});

await etapa("aprova o orçamento e ele entra na primeira etapa", async () => {
  await abrirPedido(numeroNovo);
  await clicar('.acoes-etapa [data-acao="aprovar"]');
  await pagina.waitForSelector(".linha-tempo");
  const p = await pedidoPorNumero(numeroNovo);
  confere(p.status === "producao" && p.etapaId === "e1", `status ${p.status}, etapa ${p.etapaId}`);
  confere(p.historico.some((h) => h.nota === "Orçamento aprovado"), "histórico sem aprovação");
});

await etapa("volta para orçamento e aprova de novo", async () => {
  await clicar('.acoes-etapa [data-acao="voltar-orcamento"]');
  await pagina.waitForSelector(".aviso-orcamento");
  confere((await pedidoPorNumero(numeroNovo)).status === "orcamento", "não voltou");
  await clicar('.acoes-etapa [data-acao="aprovar"]');
  await pagina.waitForSelector(".linha-tempo");
  await pagina.keyboard.press("Escape");
});

await etapa("esteira: recusa nome vazio e nome repetido", async () => {
  await ir("acompanhamento");
  await clicar('.faixa-intro [data-acao="editar-esteira"]');
  await clicar('[data-acao="esteira-adicionar"]');
  await pagina.click('#form-esteira [type="submit"]');
  confere((await erroDoFormulario()).includes("nome"), "aceitou etapa sem nome");
  const campos = await pagina.$$("[data-etapa-nome]");
  await campos.at(-1).type("moldagem do POLIURETANO");
  await pagina.click('#form-esteira [type="submit"]');
  confere((await erroDoFormulario()).includes("duas etapas"), "aceitou nome repetido");
  await pagina.keyboard.press("Escape");
  confere((await dados()).etapas.length === 5, "salvou mesmo com erro");
});

await etapa("esteira: renomeia, inclui, reordena e remove etapa com pedido", async () => {
  await clicar('.faixa-intro [data-acao="editar-esteira"]');
  // Renomeia a 1ª
  await digitar('[data-etapa-nome="0"]', "Separação do núcleo");
  // Inclui "Embalagem" no fim e sobe uma posição (fica antes de "Pronto para entrega")
  await clicar('[data-acao="esteira-adicionar"]');
  await pagina.type('[data-etapa-nome="5"]', "Embalagem");
  await clicar('[data-acao="esteira-subir"][data-indice="5"]');
  // Remove "Cura e usinagem" (índice 2), que tem o PED-0003 parado nela
  await clicar('[data-acao="esteira-remover"][data-indice="2"]');
  await pagina.waitForSelector(".esteira-linha.removida select");
  const destino = await pagina.$eval(".esteira-linha.removida select", (s) => s.options[s.selectedIndex].text);
  confere(destino === "Moldagem do poliuretano", `destino padrão: ${destino}`);
  await foto("04-editar-esteira");
  await pagina.click('#form-esteira [type="submit"]');
  await pagina.waitForFunction(() => !document.querySelector("#form-esteira"));
  const d = await dados();
  const nomes = d.etapas.map((e) => e.nome);
  confere(
    JSON.stringify(nomes) === JSON.stringify(["Separação do núcleo", "Moldagem do poliuretano", "Inspeção de qualidade", "Embalagem", "Pronto para entrega"]),
    `esteira salva: ${nomes.join(" > ")}`,
  );
  const movido = d.pedidos.find((p) => p.id === "o3");
  confere(movido.etapaId === "e2", `PED-0003 ficou em ${movido.etapaId}`);
  confere(movido.historico.at(-1).nota.includes("removida"), "histórico não registra a remoção");
  const colunas = await pagina.$$eval(".coluna h2", (els) => els.map((e) => e.textContent));
  confere(colunas.length === 6 && colunas[0] === "Orçamento" && colunas[4] === "Embalagem", `colunas: ${colunas.join(", ")}`);
  await foto("05-quadro-esteira-nova");
});

await etapa("finalizar só aparece na última etapa da esteira nova", async () => {
  await abrirPedido(numeroNovo);
  for (let i = 0; i < 4; i++) {
    confere(!(await pagina.$('.acoes-etapa [data-acao="finalizar"]')), `finalizar apareceu antes da última etapa (${i})`);
    await clicar('.acoes-etapa [data-acao="avancar"]');
  }
  confere(!(await pagina.$('.acoes-etapa [data-acao="avancar"]')), "ainda há botão Avançar na última etapa");
  confere((await pedidoPorNumero(numeroNovo)).etapaId === "e5", "não chegou à última etapa");
  await clicar('.acoes-etapa [data-acao="finalizar"]');
  await digitar('#form-finalizar [name="notaFiscal"]', "9.999");
  await pagina.click('#form-finalizar [type="submit"]');
  await pagina.waitForSelector(".faixa.entregue");
  const p = await pedidoPorNumero(numeroNovo);
  confere(p.status === "finalizado" && p.entrega.notaFiscal === "9.999", `status ${p.status}`);
  confere(!(await pagina.$('[data-acao="editar-pedido"]')), "pedido finalizado ainda é editável");
  await foto("06-finalizado");
  await pagina.keyboard.press("Escape");
});

await etapa("pedido criado direto em produção entra na 1ª etapa", async () => {
  await ir("pedidos");
  await clicar('.topo [data-acao="novo-pedido"]');
  await pagina.select('#form-pedido [name="clienteId"]', "c3");
  await pagina.click('#form-pedido input[value="producao"]');
  await pagina.select('#form-pedido [name="produtoId"][data-indice="0"]', "p2");
  confere((await texto('#form-pedido [type="submit"]')) === "Criar e enviar para produção", "texto do botão");
  await pagina.click('#form-pedido [type="submit"]');
  await pagina.waitForSelector(".linha-tempo");
  const p = await pedidoPorNumero(await texto("#titulo-modal"));
  confere(p.status === "producao" && p.etapaId === "e1", `status ${p.status}, etapa ${p.etapaId}`);
  await pagina.keyboard.press("Escape");
});

await etapa("cancela um orçamento e ele sai da esteira", async () => {
  await ir("pedidos");
  await pagina.select("#filtro-pedidos", "orcamento");
  await clicar("#lista .tabela-linha");
  const numero = await texto("#titulo-modal");
  await clicar('[data-acao="cancelar-pedido"]');
  await digitar('#form-cancelar [name="motivo"]', "Cliente não aprovou");
  await pagina.click('#form-cancelar [type="submit"]');
  await pagina.waitForSelector(".faixa.cancelado");
  const p = await pedidoPorNumero(numero);
  confere(p.cancelado?.motivo === "Cliente não aprovou", "não cancelou");
  await pagina.keyboard.press("Escape");
  await ir("acompanhamento");
  const noQuadro = await pagina.$$eval(".cartao-numero", (els, n) => els.some((e) => e.textContent.startsWith(n)), numero);
  confere(!noQuadro, "cancelado continua no quadro");
});

await etapa("filtros de pedidos por status e por etapa", async () => {
  await ir("pedidos");
  const contar = async (valor) => {
    await pagina.select("#filtro-pedidos", valor);
    return (await pagina.$$("#lista .tabela-linha")).length;
  };
  const d = await dados();
  const esperado = (fn) => d.pedidos.filter(fn).length;
  confere((await contar("orcamento")) === esperado((p) => !p.cancelado && p.status === "orcamento"), "filtro orçamento");
  confere((await contar("producao")) === esperado((p) => !p.cancelado && p.status === "producao"), "filtro produção");
  confere((await contar("finalizado")) === esperado((p) => !p.cancelado && p.status === "finalizado"), "filtro finalizado");
  confere((await contar("cancelados")) === esperado((p) => p.cancelado), "filtro cancelados");
  confere((await contar("etapa:e2")) === esperado((p) => !p.cancelado && p.status === "producao" && p.etapaId === "e2"), "filtro etapa");
});

await etapa("restaurar exemplo volta a esteira padrão", async () => {
  await clicar('[data-acao="restaurar"]');
  await clicar('[data-acao="confirmar-restaurar"]');
  const d = await dados();
  confere(d.etapas.length === 5 && d.etapas[0].nome === "Preparação do núcleo", "esteira não voltou");
  confere(d.pedidos.length === 8, `pedidos: ${d.pedidos.length}`);
});

await etapa("celular: nenhuma tela com rolagem lateral", async () => {
  await pagina.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  for (const secao of ["painel", "acompanhamento", "pedidos", "clientes", "produtos"]) {
    await ir(secao);
    const largura = await pagina.evaluate(() => document.documentElement.scrollWidth);
    confere(largura <= 390, `${secao} com ${largura}px`);
    await foto(`07-celular-${secao}`);
  }
  await clicar('.faixa-intro [data-acao="editar-esteira"]').catch(async () => {
    await ir("acompanhamento");
    await clicar('.faixa-intro [data-acao="editar-esteira"]');
  });
  await foto("08-celular-esteira");
  await pagina.keyboard.press("Escape");
  await ir("acompanhamento");
  await clicar(".coluna-orcamento .cartao-abrir");
  await foto("09-celular-orcamento");
});

await etapa("nenhum erro no console", async () => {
  confere(!errosConsole.length, errosConsole.join(" | "));
});

await navegador.close();
await servidor.close();
console.log(`\n${falhas ? `${falhas} falha(s)` : "Tudo certo"}. Capturas em ${capturas}`);
process.exit(falhas ? 1 : 0);
