# Trabalho 02 — Design de Sistemas de Visualização Interativos

Este repositório cria um Sistema de Visualização Interativos para o dataset <a src="https://www.kaggle.com/datasets/mmumairkhattak/e-commerce-orders-dataset-2026-scra">E-commerce Orders Dataset 2026 | SCRA</a>, com estrutura de design baseada no livro de Tamara Munzner e implementação feita em **D3.js** + **DuckDB**, como trabalho final da disciplina Visualização de Dados (2026.2) da Universidade Federal Fluminense (Instituto de Computação).

## Como executar

```bash
npm install
npm run dev
```

Abra o endereço exibido no terminal (geralmente `http://localhost:5173`).

## Estrutura

```
├── data/ecommerce_orders_dataset.csv   # Dataset de e-Commerce.
├── index.html                 # Estrutura principal da pagina web do trabalho
├── src/main.js                # DuckDB (query SQL) + D3.js (gráficos SVG)
└── src/styles.css
```

## Tecnologias

- **D3.js v7** 
- **DuckDB WASM** 
