# VisuLex

Software educacional web que mostra, passo a passo, as análises **léxica** e **sintática** de programas escritos em **MiniJS**, um subconjunto da linguagem JavaScript. Voltado a estudantes de graduação da disciplina de Compiladores.

> **Etapa atual: 1 — estrutura inicial.** A aplicação exibe "Hello, World!" buscado do backend, provando que frontend, backend e Docker Compose estão funcionando juntos. As análises serão implementadas nas próximas etapas.

## Linguagem analisada

**Linguagem escolhida:** JavaScript, limitada ao subconjunto **MiniJS**.

**Subconjunto inicial:**

- declaração de variáveis com `let` e `const`;
- números, strings e booleanos;
- operadores aritméticos (`+ - * / %`), relacionais (`== != === !== < <= > >=`) e lógicos (`&& || !`);
- atribuição;
- estruturas `if/else` e `while`;
- funções simples com `function` e `return`.

A lista completa de tokens, as construções aceitas e o que fica de fora estão em [`docs/minijs.md`](docs/minijs.md).

**Por que JavaScript:**

1. É uma linguagem que os alunos já usam no desenvolvimento web, então o esforço fica nos conceitos de compilação, e não na sintaxe.
2. A mesma linguagem é usada para construir a ferramenta (frontend e backend em JavaScript), o que mantém o projeto em uma única linguagem.
3. Os trabalhos encontrados na revisão de literatura analisam pseudolinguagens ou linguagens criadas só para a disciplina; analisar uma linguagem real e popular é um diferencial.

**Por que um subconjunto:** JavaScript completo tem casos difíceis para um primeiro analisador, como o ponto e vírgula opcional e a ambiguidade entre divisão e expressão regular. Começar com um núcleo pequeno torna o projeto viável e permite crescer a cada etapa.

## Arquitetura

```
Navegador ──► frontend (Nginx, porta 8080)
                 ├── /        → arquivos estáticos (HTML, CSS, JS)
                 └── /api/*   → repassa para ──► backend (Node.js, porta 3000, rede interna)
```

- **frontend:** página estática servida pelo Nginx, que também repassa as chamadas `/api/` ao backend. Assim o navegador fala com um único endereço.
- **backend:** API em Node.js sem dependências externas. Nas próximas etapas receberá o código MiniJS e devolverá tokens, passos do autômato e a árvore sintática.
- **Banco de dados:** não é necessário nesta etapa.

## Estrutura de pastas

```
visulex/
├── backend/
│   ├── src/
│   │   ├── app.js          # rotas da API
│   │   └── server.js       # inicia o servidor
│   ├── test/               # testes automatizados (node --test)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/             # index.html, styles.css, app.js
│   ├── nginx.conf          # servidor estático + proxy para /api
│   └── Dockerfile
├── docs/
│   └── minijs.md           # especificação do subconjunto MiniJS
├── docker-compose.yml
├── .env.example            # porta do frontend (opcional)
└── README.md
```

## Pré-requisitos

| Ferramenta | Versão mínima | Como conferir |
| --- | --- | --- |
| Docker Engine (ou Docker Desktop) | 24 | `docker --version` |
| Docker Compose (plugin v2) | 2.20 | `docker compose version` |
| Git | qualquer recente | `git --version` |

Node.js **não** precisa estar instalado: tudo roda dentro dos contêineres. A porta **8080** precisa estar livre (veja como trocar em [Problemas comuns](#problemas-comuns)).

## Como executar

```bash
# 1. Baixar o projeto
git clone https://github.com/<seu-usuario>/visulex.git
cd visulex

# 2. Construir as imagens e subir os contêineres em segundo plano
docker compose up --build -d

# 3. Conferir se os dois serviços estão "running" (o backend aparece como "healthy")
docker compose ps
```

Abra **http://localhost:8080** no navegador. A página deve mostrar **Hello, World!** e o status do backend como "respondendo".

Para testar a API direto pelo terminal:

```bash
curl http://localhost:8080/api/hello
# {"message":"Hello, World!"}
```

## Como encerrar

```bash
# Parar e remover os contêineres e a rede do projeto
docker compose down

# (Opcional) remover também as imagens construídas pelo projeto
docker compose down --rmi local
```

## Comandos úteis

```bash
docker compose logs -f            # acompanhar os logs dos dois serviços
docker compose logs -f backend    # só o backend
docker compose restart            # reiniciar os serviços
docker compose up --build -d      # reconstruir após alterar o código
```

## Testes

Os testes do backend rodam dentro de um contêiner, sem instalar nada:

```bash
docker run --rm -v "$PWD/backend:/app" -w /app node:22-alpine npm test
```

## Validação de instalação limpa

Procedimento para garantir que o projeto não depende de nada que exista só na máquina do autor:

```bash
# 1. Remover qualquer resto de execuções anteriores
docker compose down --rmi local --remove-orphans

# 2. Clonar o repositório em uma pasta nova
cd /tmp && rm -rf visulex-teste
git clone https://github.com/<seu-usuario>/visulex.git visulex-teste
cd visulex-teste

# 3. Seguir apenas os comandos da seção "Como executar"
docker compose up --build -d
docker compose ps
curl http://localhost:8080/api/hello

# 4. Encerrar
docker compose down --rmi local
```

**Registro da validação:**

| Data | Sistema operacional | Docker | Compose | Resultado |
| --- | --- | --- | --- | --- |
| _preencher_ | _ex.: Ubuntu 24.04 / Windows 11_ | _ex.: 27.x_ | _ex.: 2.29_ | _"Hello, World!" exibido_ |

## Problemas comuns

- **Porta 8080 ocupada:** copie `.env.example` para `.env` e troque o valor de `FRONTEND_PORT` (por exemplo, `8081`). Depois rode `docker compose up -d` e acesse `http://localhost:8081`.
- **"Não foi possível falar com o backend" na página:** veja `docker compose logs backend`. O frontend só sobe depois que o backend passa no healthcheck, então aguarde alguns segundos e recarregue.
- **`docker compose` não encontrado:** versões antigas usam `docker-compose` (com hífen). Atualize para o Compose v2.

## Roadmap

- [x] Etapa 1 — estrutura, Docker e "Hello, World!"
- [ ] Analisador léxico de MiniJS com autômato animado
- [ ] Analisador sintático LL(1) com construção passo a passo da árvore
- [ ] Explicações teóricas e exemplos prontos
- [ ] Avaliação com alunos (pré e pós-teste)
