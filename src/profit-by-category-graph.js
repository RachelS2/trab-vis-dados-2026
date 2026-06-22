import * as d3 from "d3";
import {
  innerHeight,
  updateCharts,
  innerWidth,
  margin,
  height,
  width,
  filterData,
  getPortugueseSubCategoryName,
  getPortugueseCategoryName,
  profitAxisLeft
} from "./utils"


export async function renderProfitByCategory(ecommerce, filters) {

  // Inicializa tooltip conforme declarado em index.html
  const tooltip = d3.select("#tooltip");

  // Exclui categoria da cláusula WHERE para exibir todas as categorias no gráfico
  const whereClause = filterData(filters, {
    excludeCategory: true
  });

  // Seleciona os dados de CATEGORIAS: 
  /* Transformação 3.3.2.2 no Relatório: Agregações de Lucro por CATEGORIA (WHAT). */
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

    .attr("opacity", d => { // Define opacidade quando a barra é ou não selecionada (filtrada)

      if (
        filters.category &&
        filters.category !== d.Product_Category
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
      console.log("categoria selecionada: " + filters.category);
      if (filters.category === d.Product_Category) {
        filters.category = null;
      } else {
        filters.category = d.Product_Category;
      }

      await updateCharts(ecommerce, filters); // atualiza dados com filtro aplicado
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
    .call(profitAxisLeft(y, 5))
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