// Testes de interface da análise léxica (etapa 3), no Chromium com o backend real:
// tabela de tokens, destaque colorido, erros, passo a passo, comparação e layout no celular.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { iniciarAmbiente } from './ambiente.js';
import { buscarExemplo } from '../../public/js/exemplos.js';

const require = createRequire(import.meta.url);
const { analisarLexico } = require('../../../backend/src/analisadorLexico.js');

let ambiente;
before(async () => { ambiente = await iniciarAmbiente(); });
after(() => ambiente.encerrar());

const indicador = (p) => p.locator('#passo-indicador');
const linhasTabela = (p) => p.locator('#tabela-tokens tbody tr');

async function analisar(p, codigo, estadoEsperado = 'sucesso') {
  await p.locator('#editor-codigo').fill(codigo);
  await p.locator('#botao-analisar').click();
  await p.locator(`#resultado[data-estado="${estadoEsperado}"]`).waitFor({ timeout: 5000 });
}

async function celulas(linha) {
  return linha.locator('td').allTextContents();
}

describe('tabela de tokens e resumo', () => {
  test('os tokens aparecem na tabela com tipo, lexema, linha e coluna', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'let x = 10;\nx = x + 1;');
    await p.locator('#aba-tabela').click();
    assert.equal(await linhasTabela(p).count(), 11);
    assert.deepEqual(await celulas(linhasTabela(p).nth(0)), ['1', 'PALAVRA_RESERVADA', 'let', '1', '1']);
    assert.deepEqual(await celulas(linhasTabela(p).nth(3)), ['4', 'LITERAL_INTEIRO', '10', '1', '9']);
    assert.deepEqual(await celulas(linhasTabela(p).nth(9)), ['10', 'LITERAL_INTEIRO', '1', '2', '9']);
    await p.context().close();
  });

  test('o resumo mostra totais e a contagem de tokens por categoria', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'let x = 10;\nx = x + 1;');
    assert.equal(await p.locator('#resultado-mensagem').textContent(), 'Análise léxica concluída: 11 tokens reconhecidos e nenhum erro léxico.');
    const itens = await p.locator('#contagem-categorias li').allTextContents();
    assert.deepEqual(itens, ['Palavra reservada1', 'Identificador3', 'Literal inteiro2', 'Operador aritmético1', 'Operador de atribuição2', 'Delimitador2']);
    assert.equal(await p.locator('#bloco-erros').isVisible(), false);
    await p.context().close();
  });

  test('o código aparece colorido por categoria, como texto e sem interpretar HTML', async () => {
    const p = await ambiente.novaPagina();
    const codigo = 'let s = "<b>x</b>"; // <i>nota</i>';
    await analisar(p, codigo);
    assert.equal(await p.locator('#codigo-destacado').textContent(), codigo);
    assert.equal(await p.locator('#codigo-destacado .g-reservada').first().textContent(), 'let');
    assert.equal(await p.locator('#codigo-destacado .g-string').textContent(), '"<b>x</b>"');
    assert.equal(await p.locator('#codigo-destacado .g-comentario').textContent(), '// <i>nota</i>');
    assert.equal(await p.locator('main b, main i').count(), 0);
    await p.context().close();
  });

  test('código só com comentários mostra que nenhum token foi gerado', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, '// só um comentário');
    await p.locator('#aba-tabela').click();
    assert.match(await linhasTabela(p).first().textContent(), /Nenhum token/);
    assert.equal(await p.locator('#bloco-categorias').isVisible(), false);
    await p.context().close();
  });
});

describe('erros léxicos na interface', () => {
  test('erro léxico mostra mensagem com linha e coluna, destaca o trecho e mantém os tokens', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'let total = 10 @ 2;', 'erro-lexico');
    assert.equal(await p.locator('#resultado-titulo').textContent(), 'Erros léxicos encontrados');
    assert.deepEqual(await p.locator('#lista-erros li').allTextContents(), [
      "Erro léxico na linha 1, coluna 16: caractere não reconhecido '@'. Verifique se ele faz parte do subconjunto suportado.",
    ]);
    assert.equal(await p.locator('#codigo-destacado .g-erro').textContent(), '@');
    await p.locator('#aba-tabela').click();
    assert.equal(await linhasTabela(p).count(), 6);
    await p.context().close();
  });

  test('o exemplo de erros variados lista todos os erros sem quebrar a tela', async () => {
    const p = await ambiente.novaPagina();
    const erros = [];
    p.on('pageerror', (e) => erros.push(e.message));
    await p.selectOption('#seletor-exemplo', 'erros-lexicos');
    await p.locator('#botao-analisar').click();
    await p.locator('#resultado[data-estado="erro-lexico"]').waitFor();
    const esperado = analisarLexico(buscarExemplo('erros-lexicos').codigo).erros.map((e) => e.mensagem);
    assert.deepEqual(await p.locator('#lista-erros li').allTextContents(), esperado);
    assert.equal(await p.locator('#codigo-destacado .g-erro').count(), esperado.length);
    assert.deepEqual(erros, [], 'nenhum erro de JavaScript na página');
    await p.context().close();
  });

  test('clicar em um erro leva ao passo correspondente', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'a @ b', 'erro-lexico');
    await p.locator('#aba-tabela').click();
    await p.locator('#lista-erros button').click();
    assert.equal(await p.locator('#aba-passos').getAttribute('aria-selected'), 'true');
    assert.equal(await indicador(p).textContent(), 'Passo 2 de 3');
    assert.equal(await p.locator('#passo-titulo').textContent(), 'Erro léxico');
    assert.match(await p.locator('#passo-explicacao').textContent(), /continua a leitura/);
    assert.ok(await p.locator('#passo-estados .rejeicao').isVisible());
    await p.context().close();
  });

  test('entrada muito ruim (só caracteres inválidos) não quebra a interface', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, '@#$'.repeat(100), 'erro-lexico');
    assert.match(await p.locator('#resultado-mensagem').textContent(), /interrompida depois de 100 erros/);
    assert.equal(await p.locator('#lista-erros li').count(), 101);
    await p.context().close();
  });
});

describe('passo a passo', () => {
  test('começa no fim, volta ao início e avança token a token', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'while (n >= 1)');
    assert.equal(await indicador(p).textContent(), 'Passo 6 de 6');
    assert.equal(await p.locator('#passo-proximo').isDisabled(), true);

    await p.locator('#passo-inicio').click();
    assert.equal(await indicador(p).textContent(), 'Passo 0 de 6');
    assert.equal(await p.locator('#passo-titulo').textContent(), 'Início da leitura');
    assert.equal(await p.locator('#codigo-destacado .trecho.pendente').count(), 6);
    assert.equal(await p.locator('#passo-anterior').isDisabled(), true);

    await p.locator('#passo-proximo').click();
    assert.equal(await indicador(p).textContent(), 'Passo 1 de 6');
    assert.equal(await p.locator('#passo-titulo').textContent(), 'Token reconhecido: Palavra reservada');
    assert.equal(await p.locator('#codigo-destacado .trecho.atual').textContent(), 'while');
    assert.equal(await p.locator('#codigo-destacado .trecho.pendente').count(), 5);
    assert.deepEqual(await p.locator('#passo-token dd').allTextContents(), ['PALAVRA_RESERVADA', 'while', '1', '1']);

    await p.locator('#passo-proximo').click();
    await p.locator('#passo-proximo').click();
    await p.locator('#passo-proximo').click();
    assert.equal(await p.locator('#codigo-destacado .trecho.atual').textContent(), '>=');
    assert.match(await p.locator('#passo-explicacao').textContent(), /maior lexema possível/);

    await p.locator('#passo-anterior').click();
    assert.equal(await p.locator('#codigo-destacado .trecho.atual').textContent(), 'n');
    await p.locator('#passo-fim').click();
    assert.equal(await indicador(p).textContent(), 'Passo 6 de 6');
    await p.context().close();
  });

  test('o percurso no autômato mostra os estados de cada parte do lexema', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'x = 3.14;');
    await p.locator('#codigo-destacado .trecho', { hasText: '3.14' }).click();
    assert.equal(await indicador(p).textContent(), 'Passo 3 de 4');
    const estados = await p.locator('#passo-estados .estado').allTextContents();
    assert.deepEqual(estados, ['início', 'INTEIRO', 'PONTO', 'REAL']);
    assert.deepEqual(await p.locator('#passo-estados .leitura').allTextContents(), ['3', '.', '14']);
    assert.ok(await p.locator('#passo-estados .aceitacao').isVisible());
    await p.context().close();
  });

  test('Reproduzir avança sozinho e Pausar interrompe', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'let a = 1; let b = 2;');
    await p.locator('#passo-reproduzir').click();
    assert.equal(await p.locator('#passo-reproduzir').textContent(), '⏸ Pausar');
    await p.locator('#passo-indicador', { hasText: 'Passo 2 de 10' }).waitFor({ timeout: 5000 });
    await p.locator('#passo-reproduzir').click();
    assert.equal(await p.locator('#passo-reproduzir').textContent(), '▶ Reproduzir');
    const parado = await indicador(p).textContent();
    await p.waitForTimeout(1200);
    assert.equal(await indicador(p).textContent(), parado, 'não avança depois de pausar');
    await p.context().close();
  });

  test('clicar em uma linha da tabela mostra o token no passo a passo', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'let x = 10;');
    await p.locator('#aba-tabela').click();
    await linhasTabela(p).nth(2).click();
    assert.equal(await p.locator('#painel-passos').isVisible(), true);
    assert.equal(await indicador(p).textContent(), 'Passo 3 de 5');
    assert.equal(await p.locator('#codigo-destacado .trecho.atual').textContent(), '=');
    await p.locator('#aba-tabela').click();
    assert.match(await linhasTabela(p).nth(2).getAttribute('class'), /atual/);
    await p.context().close();
  });
});

describe('outras visualizações e regressão', () => {
  test('código × tokens mostra cada linha com a sua sequência de tokens', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'let a = 1;\n// nada\nb = a;');
    await p.locator('#aba-comparacao').click();
    const linhas = p.locator('#tabela-comparacao tbody tr');
    assert.equal(await linhas.count(), 3);
    assert.deepEqual(
      await linhas.nth(0).locator('.token-par').allTextContents(),
      ['⟨PALAVRA_RESERVADA, let⟩', '⟨IDENTIFICADOR, a⟩', '⟨OPERADOR_ATRIBUICAO, =⟩', '⟨LITERAL_INTEIRO, 1⟩', '⟨DELIMITADOR, ;⟩'],
    );
    assert.equal(await linhas.nth(1).locator('.token-par').count(), 0);
    assert.equal(await linhas.nth(1).locator('.original').textContent(), '// nada');
    await p.context().close();
  });

  test('as abas funcionam com o teclado (setas)', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'x');
    await p.locator('#aba-passos').focus();
    await p.keyboard.press('ArrowRight');
    assert.equal(await p.locator('#aba-tabela').getAttribute('aria-selected'), 'true');
    assert.equal(await p.locator('#painel-tabela').isVisible(), true);
    await p.keyboard.press('ArrowLeft');
    await p.keyboard.press('ArrowLeft');
    assert.equal(await p.locator('#aba-comparacao').getAttribute('aria-selected'), 'true');
    await p.context().close();
  });

  test('editar o código depois da análise avisa que o resultado está desatualizado', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'let a = 1;');
    assert.equal(await p.locator('#aviso-desatualizado').isVisible(), false);
    await p.locator('#editor-codigo').press('End');
    await p.locator('#editor-codigo').type(' a = 2;');
    assert.equal(await p.locator('#aviso-desatualizado').isVisible(), true);
    await p.locator('#botao-analisar').click();
    await p.locator('#aviso-desatualizado').waitFor({ state: 'hidden' });
    await p.context().close();
  });

  test('erro de entrada e falha de comunicação escondem a análise anterior', async () => {
    const p = await ambiente.novaPagina();
    await analisar(p, 'let a = 1;');
    await p.locator('#editor-codigo').fill('   ');
    await p.locator('#botao-analisar').click();
    await p.locator('#resultado[data-estado="erro-entrada"]').waitFor();
    assert.equal(await p.locator('#secao-lexica').isVisible(), false);

    await analisar(p, 'let a = 1;');
    await p.route('**/api/analisar', (rota) => rota.abort('connectionrefused'));
    await p.locator('#botao-analisar').click();
    await p.locator('#resultado[data-estado="erro-comunicacao"]').waitFor();
    assert.equal(await p.locator('#secao-lexica').isVisible(), false);
    await p.context().close();
  });

  test('selecionar outro exemplo esconde os tokens do exemplo anterior', async () => {
    const p = await ambiente.novaPagina();
    await p.selectOption('#seletor-exemplo', 'categorias');
    await p.locator('#botao-analisar').click();
    await p.locator('#resultado[data-estado="sucesso"]').waitFor();
    await p.selectOption('#seletor-exemplo', 'repeticao');
    assert.equal(await p.locator('#secao-lexica').isVisible(), false);
    assert.equal(await p.locator('#resultado').getAttribute('data-estado'), 'inicial');
    await p.context().close();
  });

  test('no celular (375 px) a página não rola na horizontal em nenhuma aba', async () => {
    const contexto = await ambiente.navegador.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const p = await contexto.newPage();
    await p.goto(ambiente.baseUrl);
    const larguras = async () => p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    let [rolagem, tela] = await larguras();
    assert.ok(rolagem <= tela, `antes da análise: ${rolagem} > ${tela}`);
    for (const exemplo of ['categorias', 'erros-lexicos']) {
      await p.selectOption('#seletor-exemplo', exemplo);
      await p.locator('#botao-analisar').tap();
      await p.locator('#secao-lexica').waitFor();
      for (const aba of ['#aba-passos', '#aba-tabela', '#aba-comparacao']) {
        await p.locator(aba).tap();
        [rolagem, tela] = await larguras();
        assert.ok(rolagem <= tela, `${exemplo} ${aba}: ${rolagem} > ${tela}`);
      }
    }
    await contexto.close();
  });
});
