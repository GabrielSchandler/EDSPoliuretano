// Dados fictícios da prévia. Nenhum cliente, CNPJ ou preço é real.
import { esteiraPadrao } from "./domain.js";

export function gerarExemplo(hoje = new Date()) {
  const dia = (deslocamento) => {
    const data = new Date(hoje);
    data.setDate(data.getDate() + deslocamento);
    return data.toLocaleDateString("sv-SE");
  };
  const momento = (deslocamento, hora = "09:00") => `${dia(deslocamento)}T${hora}:00`;
  const ano = hoje.getFullYear();
  const etapas = esteiraPadrao.map((etapa) => ({ ...etapa }));

  const clientes = [
    { id: "c1", nome: "Logística Vale Alto Ltda.", documento: "00111222000101", contato: "Renata Moura", telefone: "11900000101", email: "compras@valealto.exemplo", cidade: "Mauá", uf: "SP", observacoes: "Frota de 14 empilhadeiras elétricas.", criadoEm: momento(-120) },
    { id: "c2", nome: "Gráfica Horizonte Impressos", documento: "00111222000102", contato: "Paulo Siqueira", telefone: "11900000102", email: "manutencao@horizonte.exemplo", cidade: "Santo André", uf: "SP", observacoes: "Revestimento de cilindros a cada 6 meses.", criadoEm: momento(-95) },
    { id: "c3", nome: "Metalúrgica Santa Rita", documento: "00111222000103", contato: "Cláudio Araújo", telefone: "11900000103", email: "suprimentos@santarita.exemplo", cidade: "São Bernardo do Campo", uf: "SP", observacoes: "", criadoEm: momento(-80) },
    { id: "c4", nome: "Embalagens Planalto", documento: "00111222000104", contato: "Juliana Prado", telefone: "11900000104", email: "juliana@planalto.exemplo", cidade: "Diadema", uf: "SP", observacoes: "Pagamento em 28 dias.", criadoEm: momento(-60) },
    { id: "c5", nome: "Transportes Serra Azul", documento: "00111222000105", contato: "Marcos Lima", telefone: "11900000105", email: "oficina@serraazul.exemplo", cidade: "Ribeirão Pires", uf: "SP", observacoes: "", criadoEm: momento(-30) },
  ];

  const produtos = [
    { id: "p1", codigo: "RD-254", nome: "Roda de tração para empilhadeira 254 × 102 mm", categoria: "Rodas para empilhadeira", dureza: "95 Shore A", medidas: "Ø 254 × 102 mm", unidade: "peça", preco: 780, descricao: "Recapagem sobre núcleo do cliente." },
    { id: "p2", codigo: "RD-082", nome: "Roda de carga 82 × 70 mm", categoria: "Rodas para empilhadeira", dureza: "92 Shore A", medidas: "Ø 82 × 70 mm", unidade: "peça", preco: 145, descricao: "" },
    { id: "p3", codigo: "CL-120", nome: "Cilindro revestido para impressão", categoria: "Cilindros e roletes", dureza: "75 Shore A", medidas: "Ø 120 × 1.600 mm", unidade: "peça", preco: 2350, descricao: "Retificado após a cura." },
    { id: "p4", codigo: "RL-060", nome: "Rolete transportador", categoria: "Cilindros e roletes", dureza: "85 Shore A", medidas: "Ø 60 × 500 mm", unidade: "peça", preco: 210, descricao: "" },
    { id: "p5", codigo: "AN-150", nome: "Anel de poliuretano", categoria: "Anéis", dureza: "90 Shore A", medidas: "Ø ext. 150 × Ø int. 110 × 30 mm", unidade: "peça", preco: 98, descricao: "" },
    { id: "p6", codigo: "PT-RSP", nome: "Raspador técnico sob desenho", categoria: "Peças técnicas", dureza: "80 Shore A", medidas: "Conforme desenho", unidade: "peça", preco: 320, descricao: "Exige desenho técnico do cliente." },
    { id: "p7", codigo: "RV-MT", nome: "Revestimento de cilindro", categoria: "Revestimento", dureza: "Conforme aplicação", medidas: "Por metro linear", unidade: "metro", preco: 640, descricao: "" },
  ];

  // Histórico de um pedido aberto como orçamento, aprovado e levado até a etapa `ate` (1 a 5).
  const historico = (inicio, ate, finalizado = false) => {
    const eventos = [{ tipo: "status", status: "orcamento", nome: "Orçamento", em: momento(inicio, "08:40"), nota: "" }];
    if (ate < 1) return eventos;
    eventos.push({ tipo: "status", status: "producao", nome: "Em produção", em: momento(inicio + 1, "10:15"), nota: "Orçamento aprovado" });
    etapas.slice(0, ate).forEach((etapa, i) =>
      eventos.push({ tipo: "etapa", etapaId: etapa.id, nome: etapa.nome, em: momento(inicio + 1 + i, i ? "14:30" : "10:15"), nota: "" }),
    );
    if (finalizado) eventos.push({ tipo: "status", status: "finalizado", nome: "Finalizado", em: momento(inicio + 1 + ate, "16:00"), nota: "" });
    return eventos;
  };
  const item = (produtoId, quantidade, observacao = "") => {
    const p = produtos.find((produto) => produto.id === produtoId);
    return { produtoId, descricao: p.nome, quantidade, precoUnitario: p.preco, observacao };
  };

  const pedidos = [
    { id: "o1", numero: `PED-${ano}-0001`, clienteId: "c2", criadoEm: momento(-21), prazo: dia(-6), status: "finalizado", etapaId: "e5", itens: [item("p3", 2, "Núcleos entregues pelo cliente.")], desconto: 0, observacoes: "", historico: historico(-21, 5, true), entrega: { data: dia(-14), notaFiscal: "1.204", recebidoPor: "Paulo Siqueira", observacao: "" } },
    { id: "o2", numero: `PED-${ano}-0002`, clienteId: "c1", criadoEm: momento(-12), prazo: dia(1), status: "producao", etapaId: "e5", itens: [item("p1", 4), item("p2", 8)], desconto: 120, observacoes: "Retirar na fábrica.", historico: historico(-12, 5) },
    { id: "o3", numero: `PED-${ano}-0003`, clienteId: "c3", criadoEm: momento(-9), prazo: dia(-1), status: "producao", etapaId: "e3", itens: [item("p5", 40)], desconto: 0, observacoes: "", historico: historico(-9, 3) },
    { id: "o4", numero: `PED-${ano}-0004`, clienteId: "c4", criadoEm: momento(-6), prazo: dia(5), status: "producao", etapaId: "e2", itens: [item("p4", 12)], desconto: 0, observacoes: "", historico: historico(-6, 2) },
    { id: "o5", numero: `PED-${ano}-0005`, clienteId: "c5", criadoEm: momento(-4), prazo: dia(9), status: "producao", etapaId: "e1", itens: [item("p1", 2, "Conferir furação do núcleo.")], desconto: 0, observacoes: "", historico: historico(-4, 1) },
    { id: "o6", numero: `PED-${ano}-0006`, clienteId: "c1", criadoEm: momento(-5), prazo: dia(2), status: "producao", etapaId: "e4", itens: [item("p2", 10)], desconto: 0, observacoes: "Urgente: empilhadeira parada.", historico: historico(-5, 4) },
    { id: "o7", numero: `PED-${ano}-0007`, clienteId: "c2", criadoEm: momento(-2), prazo: dia(12), status: "orcamento", etapaId: null, itens: [item("p7", 3.2), item("p6", 6, "Desenho rev. B")], desconto: 0, observacoes: "Aguardando aprovação do comprador.", historico: historico(-2, 0) },
    { id: "o8", numero: `PED-${ano}-0008`, clienteId: "c4", criadoEm: momento(-1), prazo: "", status: "orcamento", etapaId: null, itens: [item("p5", 120)], desconto: 300, observacoes: "", historico: historico(-1, 0) },
  ];

  return { etapas, clientes, produtos, pedidos };
}
