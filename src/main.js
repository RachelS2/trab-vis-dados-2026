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

const margin = {
  top: 20,
  right: 20,
  bottom: 40,
  left: 100
};
const width = 700;
const height = 350;

async function renderProfitOverTime(ecommerce) {
  /* Transformação 3.3.2.1. no Relatório: Agregações de Lucro por tempo. */
  const data = await ecommerce.query(`
    SELECT
    CONCAT(Year, ' Q', Quarter) AS Period,
    SUM(Profit_Amount) AS Profit
    FROM ecommerce
    GROUP BY Year, Quarter
    ORDER BY Year, Quarter
    `);

  console.log(data)
  // Seleciona área do gráfico definida em index.html
  const svg = d3.select("#time-chart");

  // Define altura e largura da área
  svg.attr("width", width)
    .attr("height", height);

  // Define largura e altura interna
  const innerWidth =
    width - margin.left - margin.right;

  const innerHeight =
    height - margin.top - margin.bottom;

  const x = d3.scalePoint()
    .domain(data.map(d => d.Period))
    .range([0, innerWidth]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Profit)])
    .nice()
    .range([innerHeight, 0]);

  const g = svg.append("g")
    .attr(
      "transform",
      `translate(${margin.left},${margin.top})`
    );

  const line = d3.line()
    .x(d => x(d.Period))
    .y(d => y(d.Profit));

  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 2)
    .attr("d", line);

  g.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.Period))
    .attr("cy", d => y(d.Profit))
    .attr("r", 4);

  g.append("g")
    .attr(
      "transform",
      `translate(0,${innerHeight})`
    )
    .call(d3.axisBottom(x));

  g.append("g")
    .call(d3.axisLeft(y));
}

async function renderProfitByCountry(ecommerce) {
  /* Transformação 3.3.2.2 no Relatório: Agregações de Lucro por país. */

  const tooltip = d3.select("#tooltip");

  const data = await ecommerce.query(`
    SELECT
        Country,
        SUM(Profit_Amount) AS profit
    FROM ecommerce
    GROUP BY Country
    ORDER BY profit DESC
  `);

  const svg = d3.select("#country-chart");

  svg.attr("width", width)
    .attr("height", height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

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

async function renderProfitByCategory(ecommerce) {

  // Seleciona os dados: 
  const data = await ecommerce.query(`
        SELECT
            Product_Category,
            SUM(Profit_Amount) AS Profit
        FROM ecommerce
        GROUP BY Product_Category
        ORDER BY Profit DESC
    `);

  // Seleciona o espaço para colocar o gráfico, definido em index.html
  const svg = d3.select("#category-chart");

  // Define largura e altura do gráfico.
  svg.attr("width", width)
    .attr("height", height);

  // Define largura interna
  const innerWidth =
    width - margin.left - margin.right;

  // Define altura interna
  const innerHeight =
    height - margin.top - margin.bottom;

  const x = d3.scaleBand()
    .domain(data.map(d => d.Product_Category))
    .range([0, innerWidth])
    .padding(0.2);

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
    .attr("x", d => x(d.Product_Category))
    .attr("y", d => y(d.Profit))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.Profit));

  g.append("g")
    .call(d3.axisLeft(y));

  g.append("g")
    .attr(
      "transform",
      `translate(0,${innerHeight})`
    )
    .call(d3.axisBottom(x));
}



window.onload = async () => {
  const ecommerce = await main();

  await renderProfitOverTime(ecommerce);
  await renderProfitByCategory(ecommerce);
  await renderProfitByCountry(ecommerce);
}