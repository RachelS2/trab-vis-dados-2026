import * as d3 from "d3";
import {
  innerHeight,
  innerWidth,
  margin,
  height,
  width,
  filterData,
  updateCharts,
  getPortugueseCountryName
} from "./utils"

export async function renderProfitByCountry(ecommerce, filters) {
  /* Transformação 3.3.2.2 no Relatório: Agregações de Lucro por PAÍS (WHERE). */

  // Inicializa tooltip conforme declarado em index.html
  const tooltip = d3.select("#tooltip");

  // Monta a cláusula WHERE, considerando filtros de fontes de marketing, tempo e país:
  const whereClause = filterData(filters, {
    excludeCountry: true
  });

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

      if (filters.country === d.Country) {
        filters.country = null;
      } else {
        filters.country = d.Country;
      }

      console.log(filters.country);

      await updateCharts(ecommerce, filters);
    })
    .attr("opacity", d => {

      if (
        filters.country &&
        filters.country !== d.Country
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