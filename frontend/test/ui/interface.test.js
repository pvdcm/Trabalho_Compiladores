// Testes de interface no navegador (Chromium via Playwright), com o backend real.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { iniciarAmbiente } from './ambiente.js';
import { EXEMPLOS } from '../../public/js/exemplos.js';

let ambiente;
before(async () => { ambiente = await iniciarAmbiente(); });
after(() => ambiente.encerrar());

const editor = (p) => p.locator('#editor-codigo');
const resultado = (p) => p.locator('#resultado');
const botaoAnalisar = (p) => p.locator('#botao-analisar');

async function estado(p) {
  return resultado(p).getAttribute('data-estado');
}

async function esperarEstado(p, esperado) {
  await p.locator(`#resultado[data-estado="${esperado}"]`).waitFor({ timeout: 5000 });
}

// Conta requisições de análise feitas pela página.
function contarAnalises(p) {
  const contador = { total: 0 };
  p.on('request', (r) => { if (r.url().endsWith('/api/analisar')) contador.total += 1; });
  return contador;
}

describe('tela principal', () => {
  test('identifica o sistema, a linguagem e mostra todos os elementos obrigatórios', async () => {
    const p = await ambiente.novaPagina();
    assert.equal(await p.locator('h1').textContent(), 'VisuLex');
    assert.match(await p.locator('#linguagem').textContent(), /MiniJS.*subconjunto de JavaScript/s);
    assert.ok(await editor(p).isVisible());
    assert.ok(await botaoAnalisar(p).isVisible());
    assert.ok(await resultado(p).isVisible());
    assert.ok(await p.locator('#seletor-exemplo').isVisible());
    assert.equal(await p.locator('label[for="seletor-exemplo"]').textContent(), 'Exemplo');
    await p.context().close();
  });

  test('o seletor lista todos os exemplos mais a opção inicial', async () => {
    const p = await ambiente.novaPagina();
    const valores = await p.locator('#seletor-exemplo option').evaluateAll((ops) => ops.map((o) => o.value));
    assert.deepEqual(valores, ['', ...EXEMPLOS.map((e) => e.id)]);
    await p.context().close();
  });

  test('o estado inicial orienta o usuário e indica o servidor conectado', async () => {
    const p = await ambiente.novaPagina();
    assert.equal(await estado(p), 'inicial');
    assert.match(await p.locator('#resultado-mensagem').textContent(), /escolha um exemplo/);
    assert.equal(await p.locator('#status-servidor').textContent(), 'Servidor conectado');
    assert.equal(await editor(p).inputValue(), '');
    await p.context().close();
  });

  test('o editor usa fonte monoespaçada', async () => {
    const p = await ambiente.novaPagina();
    const fonte = await editor(p).evaluate((e) => getComputedStyle(e).fontFamily);
    assert.match(fonte, /mono|Consolas|Menlo/i);
    await p.context().close();
  });
});

describe('exemplos', () => {
  for (const exemplo of EXEMPLOS) {
    test(`selecionar "${exemplo.titulo}" carrega o código e a descrição`, async () => {
      const p = await ambiente.novaPagina();
      await p.selectOption('#seletor-exemplo', exemplo.id);
      assert.equal(await editor(p).inputValue(), exemplo.codigo);
      assert.equal(await p.locator('#descricao-exemplo').textContent(), exemplo.descricao);
      const linhas = exemplo.codigo.split('\n').length;
      assert.match(await p.locator('#contador').textContent(), new RegExp(`^${linhas} linhas`));
      await p.context().close();
    });
  }

  test('escolher outro exemplo substitui o conteúdo anterior, inclusive edições', async () => {
    const p = await ambiente.novaPagina();
    await p.selectOption('#seletor-exemplo', EXEMPLOS[0].id);
    await editor(p).press('End');
    await editor(p).type('\n// edição do usuário');
    await p.selectOption('#seletor-exemplo', EXEMPLOS[1].id);
    assert.equal(await editor(p).inputValue(), EXEMPLOS[1].codigo);
    await p.context().close();
  });

  test('selecionar um exemplo não envia nada ao servidor e reinicia a área de resultados', async () => {
    const p = await ambiente.novaPagina();
    const analises = contarAnalises(p);
    await editor(p).fill('');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'erro-entrada');
    await p.selectOption('#seletor-exemplo', EXEMPLOS[2].id);
    assert.equal(await estado(p), 'inicial');
    assert.equal(analises.total, 0);
    await p.context().close();
  });
});

describe('entrada e envio do código', () => {
  test('exemplo editado é enviado com as edições e o servidor confirma o recebimento', async () => {
    const p = await ambiente.novaPagina();
    await p.selectOption('#seletor-exemplo', 'variaveis');
    await editor(p).press('Control+End');
    await editor(p).type('\nlet extra = 1;');
    const esperado = `${EXEMPLOS[0].codigo}\nlet extra = 1;`;
    assert.equal(await editor(p).inputValue(), esperado);

    const [requisicao] = await Promise.all([
      p.waitForRequest((r) => r.url().endsWith('/api/analisar')),
      botaoAnalisar(p).click(),
    ]);
    assert.deepEqual(requisicao.postDataJSON(), { codigo: esperado });
    await esperarEstado(p, 'sucesso');
    assert.match(await p.locator('#resultado-mensagem').textContent(), /recebido com sucesso/);
    const detalhes = await p.locator('#resultado-detalhes dd').allTextContents();
    assert.deepEqual(detalhes, [String(esperado.split('\n').length), String([...esperado].length)]);
    await p.context().close();
  });

  test('código colado com caracteres especiais e Unicode chega intacto ao servidor', async () => {
    const p = await ambiente.novaPagina();
    const codigo = 'const s = "olá, ção! <b>&amp;</b> {}[]%$#@~^ 😀";\n\tlet x = 1;';
    await editor(p).fill(codigo);
    const [requisicao] = await Promise.all([
      p.waitForRequest((r) => r.url().endsWith('/api/analisar')),
      botaoAnalisar(p).click(),
    ]);
    assert.equal(requisicao.postDataJSON().codigo, codigo);
    await esperarEstado(p, 'sucesso');
    // O texto vindo do servidor é exibido como texto, nunca interpretado como HTML.
    assert.equal(await p.locator('#resultado b').count(), 0);
    await p.context().close();
  });

  test('o código permanece no editor depois da análise', async () => {
    const p = await ambiente.novaPagina();
    await editor(p).fill('let a = 1;');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'sucesso');
    assert.equal(await editor(p).inputValue(), 'let a = 1;');
    await p.context().close();
  });

  test('Ctrl+Enter no editor solicita a análise', async () => {
    const p = await ambiente.novaPagina();
    await editor(p).fill('let a = 1;');
    await editor(p).press('Control+Enter');
    await esperarEstado(p, 'sucesso');
    await p.context().close();
  });

  test('Limpar esvazia o editor, reinicia o seletor e a área de resultados', async () => {
    const p = await ambiente.novaPagina();
    await p.selectOption('#seletor-exemplo', 'funcao');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'sucesso');
    await p.locator('#botao-limpar').click();
    assert.equal(await editor(p).inputValue(), '');
    assert.equal(await p.locator('#seletor-exemplo').inputValue(), '');
    assert.equal(await estado(p), 'inicial');
    await p.context().close();
  });
});

describe('validações e mensagens de erro', () => {
  test('entrada vazia mostra orientação e não envia requisição', async () => {
    const p = await ambiente.novaPagina();
    const analises = contarAnalises(p);
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'erro-entrada');
    assert.equal(await p.locator('#resultado-mensagem').textContent(), 'Informe um código-fonte antes de solicitar a análise.');
    assert.equal(analises.total, 0);
    await p.context().close();
  });

  test('entrada só com espaços mostra orientação e não envia requisição', async () => {
    const p = await ambiente.novaPagina();
    const analises = contarAnalises(p);
    await editor(p).fill('   \n\t  \n');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'erro-entrada');
    assert.match(await p.locator('#resultado-mensagem').textContent(), /apenas espaços em branco/);
    assert.equal(analises.total, 0);
    await p.context().close();
  });

  test('erro de validação devolvido pelo servidor é mostrado como problema de entrada', async () => {
    const p = await ambiente.novaPagina();
    await p.route('**/api/analisar', (rota) => rota.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ erro: { codigo: 'CODIGO_TIPO_INVALIDO', mensagem: 'O campo "codigo" deve ser um texto.' } }),
    }));
    await editor(p).fill('let a = 1;');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'erro-entrada');
    assert.equal(await p.locator('#resultado-mensagem').textContent(), 'O campo "codigo" deve ser um texto.');
    await p.context().close();
  });

  test('falha de rede mostra falha de comunicação, preserva o código e permite tentar de novo', async () => {
    const p = await ambiente.novaPagina();
    await p.route('**/api/analisar', (rota) => rota.abort('connectionrefused'));
    await editor(p).fill('let a = 1;');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'erro-comunicacao');
    assert.equal(
      await p.locator('#resultado-mensagem').textContent(),
      'Não foi possível comunicar com o servidor. Verifique a conexão e tente novamente.',
    );
    assert.equal(await botaoAnalisar(p).isEnabled(), true);
    assert.equal(await botaoAnalisar(p).textContent(), 'Analisar');
    assert.equal(await editor(p).inputValue(), 'let a = 1;');

    // Conexão restabelecida: a mesma tela volta a funcionar sem recarregar.
    await p.unroute('**/api/analisar');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'sucesso');
    await p.context().close();
  });

  test('502 do proxy (backend fora do ar) é tratado como falha de comunicação', async () => {
    const p = await ambiente.novaPagina();
    await p.route('**/api/analisar', (rota) => rota.fulfill({ status: 502, contentType: 'text/html', body: '<h1>502 Bad Gateway</h1>' }));
    await editor(p).fill('let a = 1;');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'erro-comunicacao');
    await p.context().close();
  });

  test('erro 500 mostra mensagem genérica sem expor detalhes internos', async () => {
    const p = await ambiente.novaPagina();
    await p.route('**/api/analisar', (rota) => rota.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ erro: { codigo: 'ERRO_INTERNO', mensagem: 'TypeError at /app/src/app.js:42' } }),
    }));
    await editor(p).fill('let a = 1;');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'erro-inesperado');
    const texto = await resultado(p).textContent();
    assert.doesNotMatch(texto, /TypeError|\/app\/|app\.js/);
    await p.context().close();
  });

  test('durante o envio o botão fica desabilitado e não permite envio duplicado', async () => {
    const p = await ambiente.novaPagina();
    const analises = contarAnalises(p);
    let liberar;
    const bloqueio = new Promise((r) => { liberar = r; });
    await p.route('**/api/analisar', async (rota) => { await bloqueio; await rota.continue(); });
    await editor(p).fill('let a = 1;');
    await botaoAnalisar(p).click();
    await esperarEstado(p, 'carregando');
    assert.equal(await botaoAnalisar(p).isDisabled(), true);
    assert.equal(await botaoAnalisar(p).textContent(), 'Analisando…');
    await editor(p).press('Control+Enter'); // tentativa de reenvio durante o carregamento
    liberar();
    await esperarEstado(p, 'sucesso');
    assert.equal(analises.total, 1);
    assert.equal(await botaoAnalisar(p).isEnabled(), true);
    await p.context().close();
  });

  test('servidor indisponível ao abrir a página é sinalizado no rodapé', async () => {
    const contexto = await ambiente.navegador.newContext();
    const p = await contexto.newPage();
    await p.route('**/api/health', (rota) => rota.abort('connectionrefused'));
    await p.goto(ambiente.baseUrl);
    await p.locator('#status-servidor[data-online="false"]').waitFor();
    assert.equal(await p.locator('#status-servidor').textContent(), 'Servidor indisponível');
    await contexto.close();
  });
});
