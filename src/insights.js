import * as d3 from "d3";
import {
  filterData,
  getPortugueseCategoryName,
  getPortugueseCountryName
} from "./utils";

function formatPeriodFilter(period) {
  if (!period?.start) {
    return "Todos";
  }

  const formatQuarter = (value) => {
    const [year, quarter] = value.split("-Q");
    return `Q${quarter} de ${year}`;
  };

  if (!period.end) {
    return formatQuarter(period.start);
  }

  return `${formatQuarter(period.start)} — ${formatQuarter(period.end)}`;
}

function buildActiveFilters(filters) {
  return [
    {
      label: "Fonte de marketing",
      value: filters.traffic || "Todas"
    },
    {
      label: "Categoria",
      value: filters.category
        ? getPortugueseCategoryName(filters.category)
        : "Nenhuma"
    },
    {
      label: "País",
      value: filters.country
        ? getPortugueseCountryName(filters.country)
        : "Nenhum"
    },
    {
      label: "Período",
      value: formatPeriodFilter(filters.period)
    }
  ];
}

async function queryTopCategory(ecommerce, filters) {
  const whereClause = filterData(filters, { excludeCategory: true });
  const [row] = await ecommerce.query(`
    SELECT Product_Category, SUM(Profit_Amount) AS Profit
    FROM ecommerce
    ${whereClause}
    GROUP BY Product_Category
    ORDER BY Profit DESC
    LIMIT 1
  `);

  return row ?? null;
}

async function queryTopCountry(ecommerce, filters) {
  const whereClause = filterData(filters, { excludeCountry: true });
  const [row] = await ecommerce.query(`
    SELECT Country, SUM(Profit_Amount) AS profit
    FROM ecommerce
    ${whereClause}
    GROUP BY Country
    ORDER BY profit DESC
    LIMIT 1
  `);

  return row ?? null;
}

async function queryTopTrafficSource(ecommerce, filters) {
  const whereClause = filterData(filters, { excludeTraffic: true });
  const [row] = await ecommerce.query(`
    SELECT Traffic_Source, SUM(Profit_Amount) AS Profit
    FROM ecommerce
    ${whereClause}
    GROUP BY Traffic_Source
    ORDER BY Profit DESC
    LIMIT 1
  `);

  return row ?? null;
}

async function queryTopQuarter(ecommerce, filters) {
  const whereClause = filterData(filters, { excludePeriod: true });
  const [row] = await ecommerce.query(`
    SELECT Year, Quarter, SUM(Profit_Amount) AS Profit
    FROM ecommerce
    ${whereClause}
    GROUP BY Year, Quarter
    ORDER BY Profit DESC
    LIMIT 1
  `);

  return row ?? null;
}

function renderList(container, items) {
  container.selectAll("*").remove();

  container
    .selectAll("li")
    .data(items)
    .enter()
    .append("li")
    .html(d => `
      <span class="insight-label">${d.label}</span>
      <span class="insight-value">${d.value}</span>
    `);
}

export async function renderInsights(ecommerce, filters) {
  const [topCategory, topCountry, topQuarter, topTraffic] = await Promise.all([
    queryTopCategory(ecommerce, filters),
    queryTopCountry(ecommerce, filters),
    queryTopQuarter(ecommerce, filters),
    queryTopTrafficSource(ecommerce, filters)
  ]);

  const profitFormat = d3.format(",.2f");

  renderList(
    d3.select("#active-filters-list"),
    buildActiveFilters(filters)
  );

  renderList(
    d3.select("#profit-insights-list"),
    [
      {
        label: "Fonte de marketing",
        value: topTraffic
          ? `${topTraffic.Traffic_Source} (${profitFormat(topTraffic.Profit)})`
          : "—"
      },
      {
        label: "Categoria",
        value: topCategory
          ? `${getPortugueseCategoryName(topCategory.Product_Category)} (${profitFormat(topCategory.Profit)})`
          : "—"
      },
      {
        label: "País",
        value: topCountry
          ? `${getPortugueseCountryName(topCountry.Country)} (${profitFormat(topCountry.profit)})`
          : "—"
      },
      {
        label: "Trimestre",
        value: topQuarter
          ? `Q${topQuarter.Quarter} de ${topQuarter.Year} (${profitFormat(topQuarter.Profit)})`
          : "—"
      }
    ]
  );
}
