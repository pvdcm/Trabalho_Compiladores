// Liga os elementos da página ao comportamento: seleção de exemplos, edição do código,
// validação, envio e exibição dos resultados. Recebe o documento e as funções de API por
// parâmetro, o que permite testar a interface com respostas simuladas.
import { EXEMPLOS, buscarExemplo } from './exemplos.js';
import { validarCodigo, contarCaracteres, contarLinhas } from './validacao.js';
import { enviarCodigo as enviarPadrao, verificarServidor as verificarPadrao } from './api.js';

const TITULOS = {
  inicial: 'Aguardando código',
  carregando: 'Enviando…',
  sucesso: 'Código recebido',
  'erro-entrada': 'Problema na entrada',
  'erro-comunicacao': 'Falha de comunicação',
  'erro-inesperado': 'Erro inesperado',
};

const TEXTO_INICIAL = 'Escreva um programa MiniJS ou escolha um exemplo e clique em Analisar.';

export function iniciarInterface(doc, { enviarCodigo = enviarPadrao, verificarServidor = verificarPadrao } = {}) {
  const el = {
    seletor: doc.getElementById('seletor-exemplo'),
    descricao: doc.getElementById('descricao-exemplo'),
    editor: doc.getElementById('editor-codigo'),
    contador: doc.getElementById('contador'),
    botaoAnalisar: doc.getElementById('botao-analisar'),
    botaoLimpar: doc.getElementById('botao-limpar'),
    resultado: doc.getElementById('resultado'),
    resultadoTitulo: doc.getElementById('resultado-titulo'),
    resultadoMensagem: doc.getElementById('resultado-mensagem'),
    resultadoDetalhes: doc.getElementById('resultado-detalhes'),
    statusServidor: doc.getElementById('status-servidor'),
  };

  let enviando = false;

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

  function mostrarResultado(estado, mensagem, detalhes = null) {
    el.resultado.dataset.estado = estado;
    el.resultadoTitulo.textContent = TITULOS[estado];
    el.resultadoMensagem.textContent = mensagem;
    el.resultadoDetalhes.replaceChildren();
    el.resultadoDetalhes.hidden = !detalhes;
    if (detalhes) {
      for (const [rotulo, valor] of detalhes) {
        const item = doc.createElement('div');
        const dt = doc.createElement('dt');
        const dd = doc.createElement('dd');
        dt.textContent = rotulo;
        dd.textContent = String(valor);
        item.append(dt, dd);
        el.resultadoDetalhes.append(item);
      }
    }
  }

  function carregarExemplo(id) {
    const exemplo = buscarExemplo(id);
    if (!exemplo) {
      el.descricao.textContent = '';
      return;
    }
    el.editor.value = exemplo.codigo;
    el.descricao.textContent = exemplo.descricao;
    atualizarContador();
    mostrarResultado('inicial', TEXTO_INICIAL);
    el.editor.focus();
  }

  function limpar() {
    el.editor.value = '';
    el.seletor.value = '';
    el.descricao.textContent = '';
    atualizarContador();
    mostrarResultado('inicial', TEXTO_INICIAL);
    el.editor.focus();
  }

  async function analisar() {
    if (enviando) return;
    const codigo = el.editor.value;

    const validacao = validarCodigo(codigo);
    if (!validacao.valido) {
      mostrarResultado('erro-entrada', validacao.mensagem);
      el.editor.focus();
      return;
    }

    enviando = true;
    el.botaoAnalisar.disabled = true;
    el.botaoAnalisar.textContent = 'Analisando…';
    el.resultado.setAttribute('aria-busy', 'true');
    mostrarResultado('carregando', 'Enviando o código ao servidor…');

    try {
      const resposta = await enviarCodigo(codigo);
      if (resposta.ok) {
        const { mensagem, resumo } = resposta.dados;
        const detalhes = resumo ? [['Linhas', resumo.linhas], ['Caracteres', resumo.caracteres]] : null;
        mostrarResultado('sucesso', mensagem, detalhes);
      } else {
        mostrarResultado(`erro-${resposta.tipo}`, resposta.mensagem);
      }
    } catch {
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
  el.editor.addEventListener('input', atualizarContador);
  el.botaoLimpar.addEventListener('click', limpar);
  el.botaoAnalisar.addEventListener('click', analisar);
  el.editor.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault();
      analisar();
    }
  });

  atualizarStatusServidor();

  return { analisar, carregarExemplo, limpar };
}
