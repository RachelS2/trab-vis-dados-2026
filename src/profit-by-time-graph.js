import * as d3 from "d3";
import {
  innerHeight,
  innerWidth,
  margin,
  height,
  updateCharts,
  width,
  filterData,
  getPortugueseSubCategoryName,
  getPortugueseCategoryName
} from "./utils"

export async function renderProfitByTime(ecommerce, filters) {
  /* Transformação 3.3.2.2 no Relatório: Agregações de Lucro por TEMPO (WHEN). */

  const whereClause = filterData(filters, {
    excludePeriod: true
  });
  const selectedPeriod = filters.period;
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
    .attr("fill", d => {

      const current =
        `${d.Year}-Q${d.Quarter}`;

      if (
        current === selectedPeriod.start ||
        current === selectedPeriod.end
      ) {
        return "#FF9800";
      }

      return "#1B5E20";
    })
    .attr("stroke", "white")
    .attr("stroke-width", 1.5);

  const quarterId = d => `${d.Year}-Q${d.Quarter}`;

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
      .attr("y2", innerHeight + 30) // supera a altura do gráfico para incluir os valores do eixo X
      .attr("stroke", "#cccccc") // cor das linhas
      .attr("stroke-width", 1) // largura das linhas
      .attr("stroke-dasharray", "4,4"); // define tracejado
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
    })
    .on("click", async (event, d) => {

      const clicked = `${d.Year}-Q${d.Quarter}`;

      // clicou novamente no início
      if (selectedPeriod.start === clicked) {

        selectedPeriod.start = null;

        if (selectedPeriod.end) {
          selectedPeriod.start = selectedPeriod.end;
          selectedPeriod.end = null;
        }
      }

      // clicou novamente no fim
      else if (selectedPeriod.end === clicked) {

        selectedPeriod.end = null;
      }

      // define início
      else if (!selectedPeriod.start) {

        selectedPeriod.start = clicked;
      }

      // define fim
      else if (!selectedPeriod.end) {

        selectedPeriod.end = clicked;

        if (selectedPeriod.start > selectedPeriod.end) {
          [selectedPeriod.start, selectedPeriod.end] = [selectedPeriod.end, selectedPeriod.start];
        }
      }

      // reset
      else {
        selectedPeriod.start = clicked;
        selectedPeriod.end = null;
      }

      await updateCharts(
        ecommerce, filters
      );
    });
}