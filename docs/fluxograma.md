# Fluxograma do VisuLex

Fluxo do sistema, da entrada do código à apresentação dos resultados. É a mesma figura da seção Materiais e Métodos do artigo (Tarefa 4).

**Situação em 17/11/2026:** entrada, validação, scanner e apresentação dos resultados léxicos estão **implementados**. O parser e a AST estão **em desenvolvimento** (etapa 4). A análise semântica e a tabela de símbolos estão **previstas** para a etapa 5 e **ainda não existem**.

```mermaid
flowchart TD
    A["1. Entrada<br/>O usuário escreve, cola ou seleciona um exemplo"]:::impl
    VF{"Código vazio ou só com espaços?<br/>(frontend)"}:::impl
    B["2. Envio<br/>POST /api/analisar"]:::impl
    VB{"Requisição válida?<br/>(backend: corpo, tipo e tamanho)"}:::impl
    L["3. Análise léxica: scanner (etapa 3)<br/>tokens, erros léxicos e passos do autômato"]:::impl
    DL{"Há erros léxicos?"}:::dev
    S["4. Análise sintática: parser (etapa 4)<br/>descendente recursivo preditivo, LL(1)"]:::dev
    DS{"Há erros sintáticos?"}:::dev
    T["5. AST com posições e passos de construção (etapa 4)"]:::dev
    M["6. Análise semântica (etapa 5)<br/>ainda não implementada"]:::plan
    TS["7. Tabela de símbolos e erros semânticos (etapa 5)"]:::plan
    P["8. Apresentação didática<br/>tokens e passo a passo léxico (implementado)<br/>árvore e erros sintáticos (etapa 4)<br/>semântica (etapa 5)"]:::impl

    E1["Mensagem de validação no navegador, sem requisição"]:::erro
    E2["Erro HTTP 4xx com código e mensagem"]:::erro
    E3["Erros léxicos apresentados;<br/>parser não executado, com aviso"]:::erro
    E4["AST nula; erros sintáticos com esperado,<br/>encontrado, regra e posição"]:::erro

    A --> VF
    VF -- sim --> E1
    E1 --> A
    VF -- não --> B
    B --> VB
    VB -- não --> E2
    E2 --> A
    VB -- sim --> L
    L --> DL
    DL -- sim --> E3
    E3 --> P
    DL -- não --> S
    S --> DS
    DS -- sim --> E4
    E4 --> P
    DS -- não --> T
    T -.-> M
    M -.-> TS
    TS -.-> P
    T -. enquanto a etapa 5 não existir .-> P

    classDef impl fill:#e6f4ea,stroke:#1e1e1e,stroke-width:1.5px
    classDef dev fill:#fdebd3,stroke:#1e1e1e,stroke-width:1.5px,stroke-dasharray:6 3
    classDef plan fill:#eeeeee,stroke:#777777,stroke-width:1.5px,stroke-dasharray:2 3
    classDef erro fill:#fbe9e9,stroke:#a33,stroke-width:1.5px
```

**Legenda:** verde com contorno contínuo = implementado; laranja tracejado = etapa 4, em desenvolvimento; cinza pontilhado = etapa 5, prevista; vermelho = ponto de retorno de erro ao usuário.

## Decisões representadas

- **Erros léxicos interrompem o fluxo antes do parser.** Uma lista de tokens com lacunas produziria erros sintáticos sem relação com o problema real. Os erros léxicos continuam sendo apresentados, e a interface avisa que a sintaxe será analisada depois da correção. Casos de teste: CT-L06 e CT-B09 ([casos-de-teste.md](casos-de-teste.md)).
- **Erros léxicos e sintáticos são apresentados separadamente.** Os léxicos continuam em `erros`; os sintáticos ficam em `sintatico.erros`.
- **Até a etapa 5, a AST vai direto para a apresentação.** A seta pontilhada que passa pela análise semântica só vale depois que ela for implementada.

O contrato previsto da resposta e o formato da AST estão descritos na seção Materiais e Métodos do artigo. O README só será atualizado com eles quando o parser estiver implementado e testado.
