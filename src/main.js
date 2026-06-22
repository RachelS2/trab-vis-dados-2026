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
  getPortugueseCountryName,
  getPortugueseSubCategoryName,
  getPortugueseCategoryName
} from "./maps";

// define valores para as margens
const margin = {
  top: 20,
  right: 100,
  bottom: 70,
  left: 100
};

// definem largura  e altura
const width = 700;
const height = 350;

// Define largura interna
const innerWidth = width - margin.left - margin.right;

// Define altura interna
const innerHeight = height - margin.top - margin.bottom;

// Variáveis globais que armazenam o filtro atual escolhido pelo usuário
let selectedTrafficSource = null;
let selectedCategory = null;
let selectedCountry = null;

function filterDataBy({ excludeCategory = false, excludeCountry = false } = {}) {
  // Monta clausula WHERE quando o usuário filtra alguma informação pela UI.
  const conditions = [];

  if (selectedTrafficSource) {
    conditions.push(
      `Traffic_Source = '${selectedTrafficSource}'`
    );
  }

  if (selectedCategory && !excludeCategory) {
    conditions.push(
      `Product_Category = '${selectedCategory}'`
    );
  }

  if (selectedCountry && !excludeCountry) {
    conditions.push(
      `Country = '${selectedCountry}'`
    );
  }

  if (conditions.length === 0) {
    return "";
  }

  return `WHERE ${conditions.join(" AND ")}`;
}

async function renderProfitOverTime(ecommerce) {
  /* Transformação 3.3.2.2 no Relatório: Agregações de Lucro por TEMPO (WHEN). */

  const whereClause = filterDataBy();

  // Agrupa lucro por trimestres de cada ano do dataset (2023 a 2026)
  const data = await ecommerce.query(`
    SELECT
      Year,
      Quarter,
      CONCAT('Q', Quarter) AS QuarterLabel,
      SUM(Profit_Amount) AS Profit
    FROM ecommerce
    ${whereClause}
    GROUP BY Year, Quarter
    ORDER BY Year, Quarter
  `);
  const svg = d3.select("#time-chart");


  svg.attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr(
      "transform",
      `translate(${margin.left},${margin.top})`
    );

  const x = d3.scalePoint()
    .domain(data.map(d => `${d.Year}-Q${d.Quarter}`))
    .range([0, innerWidth]);


  const max = d3.max(data, d => d.Profit);

  const y = d3.scaleLinear()
    .domain([0, max])
    .nice()
    .range([innerHeight, 0]);

  const line = d3.line()
    .x(d => x(`${d.Year}-Q${d.Quarter}`))
    .y(d => y(d.Profit));

  // linhas tracejadas horizontais
  g.append("g")
    .attr("class", "grid")
    .call(
      d3.axisLeft(y)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat("")
    );

  // Linha represnentando oscilação no lucro por tempo (X,Y)
  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#4CAF50")
    .attr("stroke-width", 2.5)
    .attr("d", line);

  // Pontos marcando encontro entre eixos X e Y
  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(`${d.Year}-Q${d.Quarter}`))
    .attr("cy", d => y(d.Profit))
    .attr("r", 5)
    .attr("fill", "#1B5E20")
    .attr("stroke", "white")
    .attr("stroke-width", 1.5);

  // Eixo X (trimestres): Q1, Q2...
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x)
      .tickFormat(d => d.split("-")[1])
    );

  // Eixo Y 
  g.append("g")
    .call(
      d3.axisLeft(y)
      .ticks(5)
      .tickFormat(d3.format(".0s")) // (converte valor de 1000 para 1k para maior clareza visual)
    );

  // ano que cada trimestre corresponde

  const years = d3.groups(data, d => d.Year);

  years.forEach(([year, values]) => {

    const first =
      x(`${year}-Q${values[0].Quarter}`);

    const last =
      x(`${year}-Q${values[values.length - 1].Quarter}`);

    const center = (first + last) / 2;

    g.append("text")
      .attr("x", center)
      .attr("y", innerHeight + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .text(year);
  });

  // Linhas divisórias entre anos para melhor visualização 

  years.slice(0, -1).forEach(([year, values]) => {

    const lastQuarter = values[values.length - 1];

    const xPos =
      x(`${year}-Q${lastQuarter.Quarter}`) +
      (x.step ? x.step() / 2 : 25);

    g.append("line")
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", 0)
      .attr("y2", innerHeight + 30)
      .attr("stroke", "#cccccc")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");
  });

  g.append("g")
    .selectAll("text")
    .style("font-size", "11px")

  // Inicializa tooltip conforme declarado em index.html
  const tooltip = d3.select("#tooltip");
  g.selectAll("circle")
    .on("mouseover", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(`
        <strong>Q${d.Quarter} - ${d.Year}</strong><br>
        Lucro: ${d3.format(",.2f")(d.Profit)}
      `);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY + 10}px`);
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });
}

async function renderProfitByCountry(ecommerce) {
  /* Transformação 3.3.2.2 no Relatório: Agregações de Lucro por PAÍS (WHERE). */

  // Inicializa tooltip conforme declarado em index.html
  const tooltip = d3.select("#tooltip");

  // Exclui país da cláusula WHERE para exibir todos os países no gráfico
  const whereClause = filterDataBy({ excludeCountry: true });

  // seleciona dados a partir de agrupamentos e somas
  const data = await ecommerce.query(`
    SELECT
        Country,
        SUM(Profit_Amount) AS profit
        FROM ecommerce
    ${whereClause}
    GROUP BY Country
    ORDER BY profit DESC
  `);

  const svg = d3.select("#country-chart");

  svg.attr("width", width)
    .attr("height", height);

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left + 15},${margin.top})`);

  const y = d3.scaleBand()
    .domain(data.map(d => getPortugueseCountryName(d.Country)))
    .range([0, innerHeight])
    .padding(0.2);

  // X: valores (lucro)
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.profit)])
    .nice()
    .range([0, innerWidth]);

  g.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("y", d => y(getPortugueseCountryName(d.Country)))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.profit))
    .attr("fill", "#4CAF50")
    .on("click", async (event, d) => {

      if (selectedCountry === d.Country) {
        selectedCountry = null;
      } else {
        selectedCountry = d.Country;
      }

      console.log(selectedCountry);

      await updateCharts(ecommerce);
    })
    .attr("opacity", d => {

      if (
        selectedCountry &&
        selectedCountry !== d.Country
      ) {

        return 0.3;
      }
      return 1;
    })
    .on("mouseover", (event, d) => { // Explicita lucro por país no hover da barra.
      tooltip
        .style("opacity", 1)
        .html(`
        <strong>${getPortugueseCountryName(d.Country)}</strong><br/>
        Lucro: ${d3.format(",.2f")(d.profit)}
      `);
    })

    .on("mousemove", (event) => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px");
    })

    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  // eixo Y (países)
  g.append("g")
    .call(
      d3.axisLeft(y)
      .tickFormat(getPortugueseCountryName) // formata o nome do país em PT
    )
    .selectAll("text")
    .style("font-size", "11px");

  // eixo X (lucro)
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x)
      .ticks(5)
      .tickFormat(d3.format(".0s"))
    )
    .selectAll("text")
    .style("font-size", "11px");
}

async function renderProfitByCategory(ecommerce) {
  /* Transformação 3.3.2.2 no Relatório: Agregações de Lucro por CATEGORIA (WHAT). */

  // Inicializa tooltip conforme declarado em index.html
  const tooltip = d3.select("#tooltip");

  // Exclui categoria da cláusula WHERE para exibir todas as categorias no gráfico
  const whereClause = filterDataBy({ excludeCategory: true });

  // Seleciona os dados de CATEGORIAS: 
  const data = await ecommerce.query(`
  SELECT
    Product_Category,
    SUM(Profit_Amount) AS Profit
    FROM ecommerce
  ${whereClause}
  GROUP BY Product_Category
  ORDER BY Profit DESC
    `);


  // Seleciona os dados de SUBCATEGORIAS: 
  const subData = await ecommerce.query(`
  SELECT
    Product_Category,
    Product_Subcategory,
    SUM(Profit_Amount) AS Profit
  FROM ecommerce
  ${whereClause}
  GROUP BY Product_Category, Product_Subcategory
`);

  const subMap = d3.group(subData, d => d.Product_Category);

  // Seleciona o espaço para colocar o gráfico, definido em index.html
  const svg = d3.select("#category-chart");

  // Define largura e altura do gráfico.
  svg.attr("width", width + 90)
    .attr("height", height);


  // Armazena as categorias.
  const categories = data.map(d => getPortugueseCategoryName(d.Product_Category));

  // Constrói o eixo X com as categorias.
  const x = d3.scaleBand()
    .domain(categories)
    .range([0, innerWidth + 90])
    .padding(0.2);

  // Constrói o eixo y com o lucro (do maior para o menor)
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Profit)])
    .nice()
    .range([innerHeight, 0]);

  const g = svg.append("g")
    .attr(
      "transform",
      `translate(${margin.left},${margin.top})`
    );

  // Configura barras verticais
  g.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(getPortugueseCategoryName(d.Product_Category))) // Define eixo X como Categoria
    .attr("y", d => y(d.Profit)) // Define eixo Y como o Lucro
    .attr("width", x.bandwidth())
    .attr("fill", "#1B5E20") // Define cor verde para as barras

    .attr("opacity", d => {

      if (
        selectedCategory &&
        selectedCategory !== d.Product_Category
      ) {
        return 0.3;
      }

      return 1;
    })
    .attr("height", d => innerHeight - y(d.Profit))
    .on("mousemove", (event) => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px");
    })

    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    })

    // Monitora clique na barra da categoria, para filtrar os dados a partir da categoria escolhida.
    .on("click", async (event, d) => {
      console.log("categoria selecionada: " + selectedCategory);
      if (selectedCategory === d.Product_Category) {
        selectedCategory = null;
      } else {
        selectedCategory = d.Product_Category;
      }

      await updateCharts(ecommerce);
    })
    .on("mouseover", (event, d) => {

      // Explicita lucro por subcategoria no hover.
      const subs = subMap.get(d.Product_Category) || [];

      tooltip
        .style("opacity", 1)
        .html(`
      <strong>${getPortugueseCategoryName(d.Product_Category)}</strong><br/>
      Total: ${d3.format(",.2f")(d.Profit)}<br/><br/>
      <u>Subcategorias:</u><br/>
      ${subs.map(s =>
        `${getPortugueseSubCategoryName(s.Product_Subcategory)}: ${d3.format(",.2f")(s.Profit)}`
      ).join("<br/>")}
    `);
    })

  g.append("g")
    .call(
      d3.axisLeft(y)
      .ticks(5)
      .tickFormat(d3.format(".0s")) // Converte de 1.000.000 para 1M, por exemplo
    )
    .selectAll("text")
    .style("font-size", "11px");

  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "11px")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-40)"); // Rotaciona texto do eixo X.
}


async function loadTrafficSourceFilter(ecommerce) {

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
  loadTrafficSourceFilter(ecommerce); // Carrega filtros de fontes de marketing uma única vez
  await updateCharts(ecommerce);

  // Monitora mudanças no filtro de fonte de marketing:
  d3.select("#traffic-filter")
    .on("change", async function () {

      selectedTrafficSource = this.value || null;

      await updateCharts(ecommerce);
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

async function updateCharts(ecommerce) {
  // Limpa tooltip para não exibir valores do filtro anterior
  d3.select("#tooltip").style("opacity", 0).html("");

  // Reinicia todos os gráficos
  d3.select("#time-chart").selectAll("*").remove();
  d3.select("#category-chart").selectAll("*").remove();
  d3.select("#country-chart").selectAll("*").remove();

  await Promise.all([
    renderProfitOverTime(
      ecommerce
    ),

    renderProfitByCategory(
      ecommerce
    ),

    renderProfitByCountry(
      ecommerce
    )
  ]);
  verifyGraphsAccuracy(ecommerce);
}

async function verifyGraphsAccuracy(ecommerce) {

  // OBS 1: Para testar a acurácia dos valores exibidos nos gráficos após aplicação de filtros, descomente o código abaixo e verifique se os valores impressos no terminal são iguais valores exibidos nos hovers.
  // OBS 2.: Insira, EM INGLES, o país e a categoria que você filtrou pela tela na cláusula WHERE abaixo!
  // OBS 3.: Para verificar os valores em inglês, acesse o arquivo maps.ts deste diretório.

    const teste = await ecommerce.query(`
    SELECT
      SUM(Profit_Amount) AS Profit
    FROM ecommerce
    WHERE Country = 'India' and Product_Category = 'Books' -- INSIRA AQUI O QUE VOCÊ FILTROU (EM INGLÊS)!
  `);
  console.log(teste[0]?.Profit);
}