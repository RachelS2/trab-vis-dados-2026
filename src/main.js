import * as d3 from "d3";
import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import {
  ECommerce
} from "./ecommerce";

import {
  updateCharts
} from "./utils";


// ==============================
// GLOBAL STATE (// Variáveis globais que armazenam o filtro atual escolhido pelo usuário)
// ==============================
let filters = {
  traffic: null, // armazena fonte de marketing escolhida.
  category: null, // armazena categoria de produto escolhida por clique no gráfico de barras correspondente.
  country: null,  // armazena país do pedido escolhido por clique no gráfico de barras correspondente.
  period: { // armazena trimestre para filtragem.
    start: null,
    end: null
  }
};


async function updateTrafficSourceFilterOptions(ecommerce) {

  // Busca todas as fontes únicas de marketing / trafego registradas no dataset.
  const trafficSources = await ecommerce.query(`
    SELECT DISTINCT Traffic_Source
    FROM ecommerce
    ORDER BY Traffic_Source
  `);

  // Referencia a tag html.
  const select = d3.select("#traffic-filter");

  // Atualiza componente de UI com opções de fontes de marketing retornadas pelo BD 
  select.selectAll("option.source")
    .data(trafficSources)
    .enter()
    .append("option")
    .attr("class", "source")
    .attr("value", d => d.Traffic_Source)
    .text(d => d.Traffic_Source);
}

window.onload = async () => {

  // Inicializa banco de dados:
  const ecommerce = await main();
  await updateTrafficSourceFilterOptions(ecommerce); // Carrega filtros de fontes de marketing uma única vez
  await updateCharts(ecommerce, filters);
  await verifyGraphsAccuracy(ecommerce);

  // Monitora mudanças no filtro de fonte de marketing:
  d3.select("#traffic-filter")
    .on("change", async function () {

      // captura valor selecionado pelo usuário e atribui a variável global
      filters.traffic = this.value;

      await updateCharts(ecommerce, filters); // Atualiza todos os gráficos considerando essa mudança nos filtros
    });
}

async function main() {
  try {

    const ecommerce = new ECommerce();
    await ecommerce.init();
    return ecommerce;

  } catch (error) {
    console.error(error);
    loadingStatus.text("Erro ao carregar dados. Verifique o console.");
  }
}



async function verifyGraphsAccuracy(ecommerce) {

  // OBS 1: Para testar a acurácia dos valores exibidos nos gráficos após aplicação de filtros, descomente o código abaixo e verifique se os valores impressos no terminal são iguais valores exibidos nos hovers.
  // OBS 2.: Insira, EM INGLES, o país e a categoria que você filtrou pela tela na cláusula WHERE abaixo!
  // OBS 3.: Para verificar os valores em inglês, acesse o arquivo maps.ts deste diretório.

  // const teste = await ecommerce.query(`
  //   SELECT
  //     SUM(Profit_Amount) AS Profit
  //   FROM ecommerce
  //   WHERE Country = 'India' and Product_Category = 'Books' -- INSIRA AQUI O QUE VOCÊ FILTROU (EM INGLÊS)!
  // `);
  // console.log(teste[0]?.Profit);
}