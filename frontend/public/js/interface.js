// Liga os elementos da página ao comportamento: seleção de exemplos, edição do código,
// validação, envio e exibição dos resultados da análise léxica (tabela de tokens, destaque
// colorido, passo a passo e comparação código × tokens). Recebe o documento e as funções de
// API por parâmetro, o que permite testar a interface com respostas simuladas.
import { EXEMPLOS, buscarExemplo } from './exemplos.js';
import { validarCodigo, contarCaracteres, contarLinhas } from './validacao.js';
import { enviarCodigo as enviarPadrao, verificarServidor as verificarPadrao } from './api.js';
import {
  rotuloDoTipo,
  grupoDoPasso,
  contarPorCategoria,
  segmentarCodigo,
  compactarCaminho,
  exibirTrecho,
  compararPorLinha,
} from './lexico.js';

const TITULOS = {
  inicial: 'Aguardando código',
  carregando: 'Analisando…',
  sucesso: 'Análise léxica concluída',
  'erro-lexico': 'Erros léxicos encontrados',
  'erro-entrada': 'Problema na entrada',
  'erro-comunicacao': 'Falha de comunicação',
  'erro-inesperado': 'Erro inesperado',
};

const TEXTO_INICIAL = 'Escreva um programa MiniJS ou escolha um exemplo e clique em Analisar.';
const INTERVALO_REPRODUCAO_MS = 900;

export function iniciarInterface(doc, { enviarCodigo = enviarPadrao, verificarServidor = verificarPadrao } = {}) {
  const $ = (id) => doc.getElementById(id);
  const el = {
    seletor: $('seletor-exemplo'),
    descricao: $('descricao-exemplo'),
    editor: $('editor-codigo'),
    contador: $('contador'),
    botaoAnalisar: $('botao-analisar'),
    botaoLimpar: $('botao-limpar'),
    resultado: $('resultado'),
    resultadoTitulo: $('resultado-titulo'),
    resultadoMensagem: $('resultado-mensagem'),
    resultadoDetalhes: $('resultado-detalhes'),
    blocoCategorias: $('bloco-categorias'),
    contagemCategorias: $('contagem-categorias'),
    blocoErros: $('bloco-erros'),
    listaErros: $('lista-erros'),
    secaoLexica: $('secao-lexica'),
    avisoDesatualizado: $('aviso-desatualizado'),
    abas: [$('aba-passos'), $('aba-tabela'), $('aba-comparacao')],
    codigoDestacado: $('codigo-destacado'),
    passoInicio: $('passo-inicio'),
    passoAnterior: $('passo-anterior'),
    passoReproduzir: $('passo-reproduzir'),
    passoProximo: $('passo-proximo'),
    passoFim: $('passo-fim'),
    passoIndicador: $('passo-indicador'),
    passoTitulo: $('passo-titulo'),
    passoExplicacao: $('passo-explicacao'),
    passoCaminho: $('passo-caminho'),
    passoEstados: $('passo-estados'),
    passoToken: $('passo-token'),
    tabelaTokens: $('tabela-tokens').tBodies[0],
    tabelaComparacao: $('tabela-comparacao').tBodies[0],
    statusServidor: $('status-servidor'),
  };

  let enviando = false;

  // Estado da análise exibida: código analisado, resposta e passo atual do passo a passo.
  // passoAtual vai de 0 (nada lido ainda) até passos.length (análise completa).
  let analise = null;
  let passoAtual = 0;
  let temporizador = null;
  let trechosPorPasso = [];
  let linhasPorPasso = [];

  function preencherSeletor() {
    for (const exemplo of EXEMPLOS) {
      const opcao = doc.createElement('option');
      opcao.value = exemplo.id;
      opcao.textContent = exemplo.contemErros ? `${exemplo.titulo} ⚠` : exemplo.titulo;
      el.seletor.append(opcao);
    }
  }

  function atualizarContador() {
    const texto = el.editor.value;
    const linhas = contarLinhas(texto);
    const caracteres = contarCaracteres(texto);
    el.contador.textContent = `${linhas} ${linhas === 1 ? 'linha' : 'linhas'} · ${caracteres} ${caracteres === 1 ? 'caractere' : 'caracteres'}`;
  }

  function criar(tag, texto, classe) {
    const elemento = doc.createElement(tag);
    if (texto !== undefined) elemento.textContent = String(texto);
    if (classe) elemento.className = classe;
    return elemento;
  }

  function preencherFicha(dl, pares) {
    dl.replaceChildren();
    for (const [rotulo, valor] of pares) {
      const item = criar('div');
      item.append(criar('dt', rotulo), criar('dd', valor));
      dl.append(item);
    }
  }

  function mostrarResultado(estado, mensagem, detalhes = null) {
    el.resultado.dataset.estado = estado;
    el.resultadoTitulo.textContent = TITULOS[estado];
    el.resultadoMensagem.textContent = mensagem;
    el.resultadoDetalhes.hidden = !detalhes;
    preencherFicha(el.resultadoDetalhes, detalhes ?? []);
  }

  // --- Passo a passo -------------------------------------------------------------------

  function pararReproducao() {
    if (temporizador !== null) clearInterval(temporizador);
    temporizador = null;
    el.passoReproduzir.textContent = '▶ Reproduzir';
    el.passoReproduzir.setAttribute('aria-pressed', 'false');
  }

  function mostrarCaminho(passo) {
    el.passoEstados.replaceChildren(criar('li', 'início', 'estado'));
    const caminho = compactarCaminho(analise.codigo, passo);
    caminho.forEach((parte, i) => {
      const ultimo = i === caminho.length - 1;
      el.passoEstados.append(criar('li', exibirTrecho(parte.texto), 'leitura'));
      let classe = 'estado';
      if (ultimo) classe += passo.acao === 'ERRO' ? ' rejeicao' : ' aceitacao';
      el.passoEstados.append(criar('li', parte.estado, classe));
    });
    el.passoCaminho.hidden = caminho.length === 0;
  }

  function mostrarPasso(indice, { rolar = true } = {}) {
    const { passos } = analise;
    passoAtual = Math.max(0, Math.min(indice, passos.length));
    const atual = passoAtual - 1;

    trechosPorPasso.forEach((trecho, i) => {
      trecho.classList.toggle('pendente', i > atual);
      trecho.classList.toggle('atual', i === atual);
    });
    linhasPorPasso.forEach((linha, i) => linha?.classList.toggle('atual', i === atual));

    el.passoIndicador.textContent = `Passo ${passoAtual} de ${passos.length}`;
    el.passoInicio.disabled = passoAtual === 0;
    el.passoAnterior.disabled = passoAtual === 0;
    el.passoProximo.disabled = passoAtual === passos.length;
    el.passoFim.disabled = passoAtual === passos.length;

    if (passoAtual === 0) {
      el.passoTitulo.textContent = 'Início da leitura';
      el.passoExplicacao.textContent = 'O scanner está antes do primeiro caractere (linha 1, coluna 1). '
        + 'A cada passo ele lê caracteres até completar um lexema, classifica o lexema e registra o token. '
        + 'Espaços em branco entre os lexemas são descartados.';
      el.passoCaminho.hidden = true;
      el.passoToken.hidden = true;
      return;
    }

    const passo = passos[atual];
    if (passo.acao === 'TOKEN') el.passoTitulo.textContent = `Token reconhecido: ${rotuloDoTipo(passo.tipo)}`;
    else if (passo.acao === 'IGNORADO') el.passoTitulo.textContent = 'Comentário descartado';
    else el.passoTitulo.textContent = 'Erro léxico';
    el.passoExplicacao.textContent = passo.explicacao;
    mostrarCaminho(passo);

    el.passoToken.hidden = false;
    const tipo = passo.acao === 'TOKEN' ? passo.tipo : passo.acao === 'ERRO' ? 'ERRO_LEXICO' : passo.tipo;
    preencherFicha(el.passoToken, [
      ['Tipo', tipo],
      ['Lexema', passo.lexema],
      ['Linha', passo.linha],
      ['Coluna', passo.coluna],
    ]);
    if (rolar) rolarAteTrecho(trechosPorPasso[atual]);
  }

  // Mantém o trecho atual visível rolando só a caixa do código, nunca a página.
  function rolarAteTrecho(trecho) {
    const caixa = el.codigoDestacado;
    if (!trecho) return;
    const { offsetTop: topo, offsetLeft: esquerda, offsetHeight: altura, offsetWidth: largura } = trecho;
    if (topo < caixa.scrollTop || topo + altura > caixa.scrollTop + caixa.clientHeight) {
      caixa.scrollTop = topo - caixa.clientHeight / 2;
    }
    if (esquerda < caixa.scrollLeft || esquerda + largura > caixa.scrollLeft + caixa.clientWidth) {
      caixa.scrollLeft = esquerda - caixa.clientWidth / 3;
    }
  }

  function irPara(indice) {
    pararReproducao();
    mostrarPasso(indice);
  }

  function alternarReproducao() {
    if (temporizador !== null) {
      pararReproducao();
      return;
    }
    if (passoAtual >= analise.passos.length) mostrarPasso(0);
    el.passoReproduzir.textContent = '⏸ Pausar';
    el.passoReproduzir.setAttribute('aria-pressed', 'true');
    temporizador = setInterval(() => {
      mostrarPasso(passoAtual + 1);
      if (passoAtual >= analise.passos.length) pararReproducao();
    }, INTERVALO_REPRODUCAO_MS);
  }

  // Leva ao passo do índice informado, na aba do passo a passo.
  function verNoPassoAPasso(indicePasso) {
    selecionarAba(el.abas[0]);
    irPara(indicePasso + 1);
    el.codigoDestacado.focus?.({ preventScroll: true });
  }

  function selecionarAba(aba) {
    for (const outra of el.abas) {
      const selecionada = outra === aba;
      outra.setAttribute('aria-selected', String(selecionada));
      outra.tabIndex = selecionada ? 0 : -1;
      $(outra.getAttribute('aria-controls')).hidden = !selecionada;
    }
  }

  // --- Montagem das visualizações -------------------------------------------------------

  function montarCodigoDestacado() {
    el.codigoDestacado.replaceChildren();
    trechosPorPasso = [];
    for (const trecho of segmentarCodigo(analise.codigo, analise.passos)) {
      if (trecho.passo === null) {
        el.codigoDestacado.append(doc.createTextNode(trecho.texto));
        continue;
      }
      const passo = analise.passos[trecho.passo];
      const span = criar('span', trecho.texto, `trecho g-${grupoDoPasso(passo)}`);
      span.title = passo.acao === 'TOKEN' ? rotuloDoTipo(passo.tipo) : passo.acao === 'ERRO' ? 'Erro léxico' : 'Comentário';
      span.dataset.passo = String(trecho.passo);
      span.addEventListener('click', () => irPara(trecho.passo + 1));
      el.codigoDestacado.append(span);
      trechosPorPasso[trecho.passo] = span;
    }
    el.codigoDestacado.tabIndex = -1;
  }

  function montarTabelaTokens() {
    el.tabelaTokens.replaceChildren();
    linhasPorPasso = [];
    let numero = 0;
    analise.passos.forEach((passo, indice) => {
      if (passo.acao !== 'TOKEN') return;
      numero += 1;
      const linha = criar('tr');
      linha.append(
        criar('td', numero),
        criar('td', passo.tipo, `tipo g-${grupoDoPasso(passo)}`),
        criar('td', passo.lexema, 'lexema'),
        criar('td', passo.linha),
        criar('td', passo.coluna),
      );
      linha.tabIndex = 0;
      linha.title = 'Ver este token no passo a passo';
      linha.addEventListener('click', () => verNoPassoAPasso(indice));
      linha.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault();
          verNoPassoAPasso(indice);
        }
      });
      el.tabelaTokens.append(linha);
      linhasPorPasso[indice] = linha;
    });
    if (numero === 0) {
      const vazia = criar('tr');
      const celula = criar('td', 'Nenhum token: o código só tem comentários e espaços.');
      celula.colSpan = 5;
      vazia.append(celula);
      el.tabelaTokens.append(vazia);
    }
  }

  function montarComparacao() {
    el.tabelaComparacao.replaceChildren();
    for (const linha of compararPorLinha(analise.codigo, analise.tokens)) {
      const tr = criar('tr');
      const sequencia = criar('td', undefined, 'sequencia');
      if (linha.tokens.length === 0) {
        sequencia.append(criar('span', '—', 'nota'));
      }
      for (const token of linha.tokens) {
        const grupo = grupoDoPasso({ acao: 'TOKEN', tipo: token.tipo });
        sequencia.append(criar('span', `⟨${token.tipo}, ${token.lexema}⟩`, `token-par g-${grupo}`));
      }
      tr.append(criar('td', linha.numero, 'numero'), criar('td', linha.texto, 'original'), sequencia);
      el.tabelaComparacao.append(tr);
    }
  }

  function montarResumo() {
    el.contagemCategorias.replaceChildren();
    for (const categoria of contarPorCategoria(analise.tokens)) {
      const item = criar('li', undefined, 'categoria');
      item.dataset.tipo = categoria.tipo;
      item.append(criar('span', undefined, `amostra g-${categoria.grupo}`), criar('span', categoria.rotulo), criar('strong', categoria.quantidade));
      el.contagemCategorias.append(item);
    }
    el.blocoCategorias.hidden = analise.tokens.length === 0;

    el.listaErros.replaceChildren();
    analise.passos.forEach((passo, indice) => {
      if (passo.acao !== 'ERRO') return;
      const item = criar('li');
      const botao = criar('button', analise.erros.find((e) => e.inicio === passo.inicio && e.codigo === passo.tipo)?.mensagem ?? passo.explicacao, 'erro-item');
      botao.type = 'button';
      botao.addEventListener('click', () => verNoPassoAPasso(indice));
      item.append(botao);
      el.listaErros.append(item);
    });
    el.blocoErros.hidden = analise.erros.length === 0;
  }

  function mostrarAnalise(codigo, dados) {
    pararReproducao();
    analise = { codigo, tokens: dados.tokens, erros: dados.erros, passos: dados.passos ?? [] };
    montarResumo();
    montarCodigoDestacado();
    montarTabelaTokens();
    montarComparacao();
    el.avisoDesatualizado.hidden = true;
    el.secaoLexica.hidden = false;
    // Começa mostrando o resultado completo; o aluno volta ao início para ver passo a passo.
    mostrarPasso(analise.passos.length, { rolar: false });
    el.codigoDestacado.scrollTop = 0;
    el.codigoDestacado.scrollLeft = 0;
  }

  function esconderAnalise() {
    pararReproducao();
    analise = null;
    el.secaoLexica.hidden = true;
    el.blocoCategorias.hidden = true;
    el.blocoErros.hidden = true;
    el.contagemCategorias.replaceChildren();
    el.listaErros.replaceChildren();
  }

  // --- Ações da tela --------------------------------------------------------------------

  function carregarExemplo(id) {
    const exemplo = buscarExemplo(id);
    if (!exemplo) {
      el.descricao.textContent = '';
      return;
    }
    el.editor.value = exemplo.codigo;
    el.descricao.textContent = exemplo.descricao;
    atualizarContador();
    esconderAnalise();
    mostrarResultado('inicial', TEXTO_INICIAL);
    el.editor.focus();
  }

  function limpar() {
    el.editor.value = '';
    el.seletor.value = '';
    el.descricao.textContent = '';
    atualizarContador();
    esconderAnalise();
    mostrarResultado('inicial', TEXTO_INICIAL);
    el.editor.focus();
  }

  async function analisar() {
    if (enviando) return;
    const codigo = el.editor.value;

    const validacao = validarCodigo(codigo);
    if (!validacao.valido) {
      esconderAnalise();
      mostrarResultado('erro-entrada', validacao.mensagem);
      el.editor.focus();
      return;
    }

    enviando = true;
    pararReproducao();
    el.botaoAnalisar.disabled = true;
    el.botaoAnalisar.textContent = 'Analisando…';
    el.resultado.setAttribute('aria-busy', 'true');
    mostrarResultado('carregando', 'Enviando o código ao servidor…');

    try {
      const resposta = await enviarCodigo(codigo);
      if (resposta.ok) {
        const { sucesso, mensagem, resumo } = resposta.dados;
        const detalhes = resumo
          ? [['Linhas', resumo.linhas], ['Caracteres', resumo.caracteres], ['Tokens', resumo.tokens], ['Erros léxicos', resumo.erros]]
          : null;
        mostrarResultado(sucesso ? 'sucesso' : 'erro-lexico', mensagem, detalhes);
        mostrarAnalise(codigo, resposta.dados);
      } else {
        esconderAnalise();
        mostrarResultado(`erro-${resposta.tipo}`, resposta.mensagem);
      }
    } catch {
      esconderAnalise();
      mostrarResultado('erro-inesperado', 'Ocorreu um erro inesperado. Tente novamente em instantes.');
    } finally {
      enviando = false;
      el.botaoAnalisar.disabled = false;
      el.botaoAnalisar.textContent = 'Analisar';
      el.resultado.removeAttribute('aria-busy');
    }
  }

  async function atualizarStatusServidor() {
    const online = await verificarServidor();
    el.statusServidor.dataset.online = String(online);
    el.statusServidor.textContent = online ? 'Servidor conectado' : 'Servidor indisponível';
  }

  preencherSeletor();
  atualizarContador();
  mostrarResultado('inicial', TEXTO_INICIAL);

  el.seletor.addEventListener('change', () => carregarExemplo(el.seletor.value));
  el.editor.addEventListener('input', () => {
    atualizarContador();
    if (analise) el.avisoDesatualizado.hidden = el.editor.value === analise.codigo;
  });
  el.botaoLimpar.addEventListener('click', limpar);
  el.botaoAnalisar.addEventListener('click', analisar);
  el.editor.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      analisar();
    }
  });

  el.passoInicio.addEventListener('click', () => irPara(0));
  el.passoAnterior.addEventListener('click', () => irPara(passoAtual - 1));
  el.passoProximo.addEventListener('click', () => irPara(passoAtual + 1));
  el.passoFim.addEventListener('click', () => irPara(analise.passos.length));
  el.passoReproduzir.addEventListener('click', alternarReproducao);

  el.abas.forEach((aba, i) => {
    aba.addEventListener('click', () => selecionarAba(aba));
    // Setas esquerda/direita alternam entre as abas (padrão de acessibilidade de tablist).
    aba.addEventListener('keydown', (evento) => {
      if (evento.key !== 'ArrowRight' && evento.key !== 'ArrowLeft') return;
      const proxima = el.abas[(i + (evento.key === 'ArrowRight' ? 1 : el.abas.length - 1)) % el.abas.length];
      selecionarAba(proxima);
      proxima.focus();
    });
  });

  atualizarStatusServidor();

  return { analisar, carregarExemplo, limpar };
}
