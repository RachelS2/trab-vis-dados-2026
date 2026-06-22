import * as d3 from "d3";
import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import {
  ECommerce
} from "./ecommerce";

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

// define valores para as margens
const margin = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 100
};

// definem largura  e altura
const width = 700;
const height = 350;

// Define largura interna
const innerWidth = width - margin.left - margin.right;

// Define altura interna
const innerHeight = height - margin.top - margin.bottom;

function getTrafficSourceWhereClause(choosenTrafficSource = "") {
  // Monta clausula WHERE quando o usuário especifica alguma fonte de tráfego pela UI.
  let whereClause = "";
  console.log("Fonte de tráfego: " + choosenTrafficSource);

  if (choosenTrafficSource && choosenTrafficSource !== "Todas") {
    return `
      WHERE Traffic_Source = '${choosenTrafficSource}'
    `;
  }
  return whereClause;
}
async function renderProfitOverTime(ecommerce, choosenTrafficSource = "") {

  const whereClause = getTrafficSourceWhereClause(choosenTrafficSource);

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

  console.log("Altura interna: " + innerHeight);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Profit)])
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

  // Linha (coordenada X,Y)
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

  // Eixo X: apenas Q1, Q2...
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
      .tickFormat(d3.format(".2s"))
    );

  // ---- Anos abaixo dos trimestres ----

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

  // Linhas divisórias entre anos

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
}

async function renderProfitByCountry(ecommerce, choosenTrafficSource) {
  /* Transformação 3.3.2.2 no Relatório: Agregações de Lucro por país. */

  // Inicializa tooltip conforme declarado em index.html
  const tooltip = d3.select("#tooltip");

  // Pega a clausula where quando uma fonte de tráfego/marketing é especificada 
  const whereClause = getTrafficSourceWhereClause(choosenTrafficSource);

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
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const y = d3.scaleBand()
    .domain(data.map(d => d.Country))
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
    .attr("y", d => y(d.Country))
    .attr("x", 0)
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.profit))
    .attr("fill", "#4CAF50")
    .on("mouseover", (event, d) => { // Explicita lucro por país no hover da barra.
      tooltip
        .style("opacity", 1)
        .html(`
        <strong>${d.Country}</strong><br/>
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
    .call(d3.axisLeft(y));

  // eixo X (lucro)
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x));
}

async function renderProfitByCategory(ecommerce, choosenTrafficSource) {
  // Inicializa tooltip conforme declarado em index.html
  const tooltip = d3.select("#tooltip");

  // Pega a clausula where quando uma fonte de tráfego/marketing é especificada 
  const whereClause = getTrafficSourceWhereClause(choosenTrafficSource);

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
  GROUP BY Product_Category, Product_Subcategory
`);
  // const teste = await ecommerce.query(`
  // SELECT
  //   SUM(Profit_Amount) AS total
  // FROM ecommerce

  // `);
  // console.log("LUCRO TOTAL " + teste?.[0]?.total)
  const subMap = d3.group(subData, d => d.Product_Category);

  // Seleciona o espaço para colocar o gráfico, definido em index.html
  const svg = d3.select("#category-chart");

  // Define largura e altura do gráfico.
  svg.attr("width", width)
    .attr("height", height);

  // Armazena as categorias.
  const categories = data.map(d => d.Product_Category);

  // Constrói o eixo X com as categorias.
  const x = d3.scaleBand()
    .domain(categories)
    .range([0, innerWidth])
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

  g.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.Product_Category)) // Define eixo X como Categoria
    .attr("y", d => y(d.Profit)) // Define eixo Y como o Lucro
    .attr("width", x.bandwidth())
    .attr("fill", "#1B5E20") // Define cor verde para as barras
    .attr("height", d => innerHeight - y(d.Profit))
    .on("mouseover", (event, d) => {
      // Explicita lucro por categoria no hover.
      tooltip
        .style("opacity", 1)
        .html(`
        <strong>${d.Product_Category}</strong><br/>
        Lucro: ${d3.format(",.2f")(d.Profit)}
      `);
    })

    .on("mousemove", (event) => {
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px");
    })

    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    })
    .on("mouseover", (event, d) => {

      // Explicita lucro por subcategoria no hover.
      const subs = subMap.get(d.Product_Category) || [];

      tooltip
        .style("opacity", 1)
        .html(`
      <strong>${d.Product_Category}</strong><br/>
      Total: ${d3.format(",.2f")(d.Profit)}<br/><br/>
      <u>Subcategorias:</u><br/>
      ${subs.map(s =>
        `${s.Product_Subcategory}: ${d3.format(",.2f")(s.Profit)}`
      ).join("<br/>")}
    `);
    })

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("g")
    .attr(
      "transform",
      `translate(0,${innerHeight})`
    )
    .call(d3.axisBottom(x));
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

  // Atualiza componente de UI com dados retornados do BD (fontes de tráfego ) 
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
  await renderProfitOverTime(ecommerce);
  await renderProfitByCategory(ecommerce);
  await renderProfitByCountry(ecommerce);
  await loadTrafficSourceFilter(ecommerce);

  // Monitora mudanças no filtro de fonte de tráfego:
  d3.select("#traffic-filter")
    .on("change", async function () {

      // captura valor selecionado pelo usuário na lista suspensa
      const selectedSource = this.value;

      // Reinicia todos os gráficos
      d3.select("#time-chart").selectAll("*").remove();
      d3.select("#category-chart").selectAll("*").remove();
      d3.select("#country-chart").selectAll("*").remove();

      await renderProfitOverTime(ecommerce, selectedSource);
      await renderProfitByCategory(ecommerce, selectedSource);
      await renderProfitByCountry(ecommerce, selectedSource);
    });
}