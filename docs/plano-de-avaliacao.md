# Plano de avaliação

Definido em **17/11/2026**, antes da implementação do parser e de qualquer execução da avaliação (Tarefa 4, seção Materiais e Métodos). Nada aqui é resultado: é o que será medido, como e com qual meta.

## Critérios

| Critério | Como verificar | Meta |
| --- | --- | --- |
| C1 Correção léxica | Casos CT-L e regressão da etapa 3 | 100% aprovados |
| C2 Correção sintática | Casos CT-V e CT-S; válidos conferidos com `node --check` | 100%; concordância com o Node.js em todos os válidos |
| C3 Correção da AST | Comparação com AST de referência (tipos, atributos, ordem, precedência, associatividade) | 100% dos CT-V |
| C4 Correção semântica | Casos CT-M | 100%, a partir da etapa 5 |
| C5 Detecção e localização | Linha e coluna do token encontrado; sem cascata nos casos de recuperação | 100% com posição exata |
| C6 Clareza das mensagens | Teste automatizado dos campos (tipo, esperado, encontrado, posição, regra); itens D1–D3 | 100% dos campos; mediana ≥ 4 |
| C7 Clareza das visualizações | Itens B e C; tarefas T3 e T6 | Mediana ≥ 4; ≥ 70% de sucesso |
| C8 Consistência entre visualizações | Posições dos nós = posições dos tokens, em todos os exemplos | 100% |
| C9 Cobertura | Casos aprovados / casos definidos, por categoria | 100% das etapas 3 e 4; pendências declaradas |
| C10 Usabilidade | Itens A1–A4, sucesso nas tarefas e pedidos de ajuda | Mediana ≥ 4; ≥ 70% de sucesso |
| C11 Reprodutibilidade | Clone limpo, `docker compose build --no-cache`, serviços `healthy`, suíte no Docker | Todos os passos sem intervenção manual |
| C12 Documentação | README com objetivo, escopo, gramática, execução, exemplos e limitações | 6 de 6 |
| C13 Robustez | Entrada no limite de tamanho; aninhamento acima do limite | 100% dos CT-B, sem erro 500 |

As metas de mediana ≥ 4 e 70% de sucesso são decisões do projeto, usadas para apontar o que precisa ser corrigido; não vêm da literatura.

## Testes técnicos

| Tipo | Comando |
| --- | --- |
| Backend (scanner, parser, endpoints, regressão) | `cd backend && npm test` |
| Frontend unitário | `cd frontend && npm run test:unit` |
| Interface (Playwright) | `cd frontend && npm run test:ui` |
| Todas as suítes locais | `node scripts/executar-testes.mjs` |
| Tudo no Docker, inclusive implantação | `docker compose --profile test run --rm testes` |

Cada execução vai para [testes.md](testes.md), com comando, aprovados, reprovados, falhas e correções.

## Avaliação por pares

- **Quando:** depois da conclusão da etapa 4 prática.
- **Quem:** estudantes de Computação e de Inteligência Artificial que cursam ou já cursaram Compiladores; o professor, se participar, como avaliador especialista, com respostas analisadas à parte. Meta: ao menos 10 participantes (sem cálculo amostral).
- **Privacidade:** Google Forms sem coleta de e-mail; nenhum nome, matrícula ou dado pessoal; participantes identificados só por código (P01, P02...) na planilha de tarefas.
- **Procedimento:** consentimento no início do formulário → cerca de 15 minutos de uso com as tarefas abaixo, com registro de resultado e pedidos de ajuda → formulário.

### Tarefas

| ID | Tarefa | Resposta esperada |
| --- | --- | --- |
| T1 | Selecionar o exemplo "Expressões aritméticas" e executar a análise | Resultado sem erros |
| T2 | Indicar a categoria do token `%` nesse exemplo | `OPERADOR_ARITMETICO` |
| T3 | Analisar `let r = 10 + 5 * 2;` e dizer, pela árvore, qual operação é feita primeiro | A multiplicação |
| T4 | Analisar `let a = 1` seguido de `let b = 2;`, localizar o erro e corrigir | `;` no fim da linha 1 |
| T5 | No exemplo "Programa com erros intencionais", explicar por que a árvore não aparece | Erro léxico; parser não executado |
| T6 | No exemplo "Estrutura condicional", selecionar o nó da condição e indicar o trecho | `nota >= 7 && frequencia >= 75` |

### Formulário (Likert 1 = discordo totalmente a 5 = concordo totalmente, com "não se aplica")

**Perfil:** P1 curso (Ciência da Computação, Inteligência Artificial, outro, docente); P2 situação em Compiladores (cursando, já cursei, não cursei); P3 familiaridade com JavaScript (1–5); P4 dispositivo (computador, celular, ambos).

- **A. Uso e interface:** A1 A interface foi fácil de entender e utilizar. A2 Consegui inserir um código e executar a análise sem ajuda. A3 Encontrei na tela as informações que procurava sem dificuldade. A4 (Se usou celular) A ferramenta pôde ser usada no celular sem dificuldade.
- **B. Análise léxica:** B1 A tabela de tokens ajudou a compreender a análise léxica. B2 O passo a passo do scanner ajudou a entender onde e por que cada token termina.
- **C. Análise sintática e AST:** C1 A visualização da AST ajudou a compreender a estrutura do programa. C2 Foi fácil navegar pela árvore. C3 A árvore deixou clara a precedência dos operadores. C4 (Quando implementada) A apresentação da análise semântica foi compreensível.
- **D. Mensagens de erro:** D1 As mensagens de erro foram claras e úteis. D2 Ficou claro se cada erro era léxico, sintático ou semântico. D3 A mensagem de erro me ajudou a corrigir o código.
- **E. Diferencial:** E1 Ver o trecho do código destacado ao selecionar um nó ajudou a relacionar o código à árvore. E2 Acompanhar a construção da árvore passo a passo ajudou a entender como o parser trabalha. E3 Ver a regra da gramática em cada nó ajudou a entender a análise sintática. E4 Ver tokens e árvore na mesma interface ajudou a entender a passagem de uma fase à outra. E5 Os exemplos prontos foram suficientes para experimentar sem escrever código. E6 As explicações curtas sobre cada etapa foram úteis.
- **F. Geral:** F1 O software contribuiu para minha compreensão sobre compiladores. F2 Eu recomendaria o software a colegas que estão começando a disciplina.
- **G. Abertas:** G1 Você encontrou algum problema técnico ou de usabilidade? G2 Que melhorias você sugere? G3 Alguma informação pareceu confusa ou diferente do que você aprendeu na disciplina?

### Análise

- Por item: mediana, moda, média, desvio padrão e número de respostas; separação por situação na disciplina quando houver respostas suficientes.
- Alfa de Cronbach por bloco se houver ao menos 10 respostas, com ressalva do tamanho da amostra.
- Tarefas: proporção de conclusão e de pedidos de ajuda. Respostas abertas agrupadas em problemas de uso, sugestões e dúvidas conceituais.
- Item com mediana ≤ 3 ou tarefa com menos de 70% de conclusão = problema a corrigir.
- Os resultados descrevem percepção e desempenho em tarefas, **não** ganho de aprendizagem.

## Limitações

Sem grupo de controle nem pré e pós-teste; amostra pequena e de conveniência (colegas do autor); participantes que já estudam Compiladores, portanto sem generalização para quem não programa; uso em celular só entre quem escolher; análise semântica só a partir da etapa 5; conformidade verificada com a gramática de MiniJS, não com JavaScript completo.
