import * as d3 from "d3";
import {
  renderProfitByCountry
} from "./profit-by-country-graph";
import {
  renderProfitByCategory
} from "./profit-by-category-graph";
import {
  renderProfitByTime
} from "./profit-by-time-graph";

const COUNTRIES_MAP_EN_PT = {
  "United States": "Estados Unidos",
  "France": "França",
  "Canada": "Canadá",
  "United Kingdom": "Reino Unido",
  "Australia": "Austrália",
  "India": "Índia",
  "Germany": "Alemanha",
  "Pakistan": "Paquistão",
  "Saudi Arabia": "Arábia Saudita",
  "UAE": "Emirados Árabes"
};


export function getPortugueseCountryName(d) {
  return COUNTRIES_MAP_EN_PT[d] ?? d;
}

const CATEGORIES_MAP_EN_PT = {
  "Books": "Livros",
  "Sports": "Esportes",
  "Beauty": "Beleza",
  "Fashion": "Moda",
  "Home & Kitchen": "Casa & Cozinha",
  "Groceries": "Mercado",
  "Electronics": "Eletrônicos",
  "Toys": "Brinquedos"
};


export function getPortugueseCategoryName(d) {
  return CATEGORIES_MAP_EN_PT[d] ?? d;
}

const SUB_CATEGORIES_MAP_EN_PT = {
  "Comics": "Quadrinhos",
  "Equipment": "Equipamentos",
  "Skincare": "Cuidados com a pele",
  "Women Clothing": "Roupas Femininas",
  "Makeup": "Maquiagem",
  "Decor": "Decoração",
  "Cookware": "Utensílios de Cozinha",
  "Beverages": "Bebidas",
  "Dairy": "Laticínios",
  "Snacks": "Snacks",
  "Laptop": "Notebook",
  "Sportswear": "Roupas Esportivas",
  "Accessories": "Acessórios",
  "Headphones": "Fones de Ouvido",
  "Fitness": "Fitness",
  "Mobile": "Celulares",
  "Education": "Educação",
  "Action Figures": "Action Figures",
  "Bags": "Bolsas",
  "Haircare": "Cuidados com o Cabelo",
  "Shoes": "Calçados",
  "Furniture": "Móveis",
  "Men Clothing": "Roupas Masculinas",
  "Non-Fiction": "Não Ficção",
  "Fresh Produce": "Produtos Frescos",
  "Fragrance": "Perfumes",
  "Appliances": "Eletrodomésticos",
  "Board Games": "Jogos de Tabuleiro",
  "Fiction": "Ficção",
  "Puzzles": "Quebra-cabeças",
  "Educational": "Educacional",
  "Outdoor": "Outdoor"
};


export function getPortugueseSubCategoryName(d) {
  return SUB_CATEGORIES_MAP_EN_PT[d] ?? d;
}

export function filterData(filters) {
  // Monta clausula WHERE quando o usuário filtra alguma informação pela UI. 

  const selectedTrafficSource = filters.traffic;
  const selectedCategory = filters.category;
  const selectedCountry = filters.country;
  const selectedPeriod = filters.period;

  const conditions = [];
  console.log(selectedTrafficSource + " " + selectedCategory + " " + selectedCountry + " " + selectedPeriod.start + " " + selectedPeriod.end)

  // Verifica se variáveis globais foram preenchidas
  if (selectedTrafficSource) {
    console.log(selectedTrafficSource)
    conditions.push(
      `Traffic_Source = '${selectedTrafficSource}'`
    );
  }

  if (selectedCategory) {
    conditions.push(
      `Product_Category = '${selectedCategory}'`
    );
  }

  if (selectedCountry) {
    conditions.push(
      `Country = '${selectedCountry}'`
    );
  }

  const initialQuarter = selectedPeriod.start;
  const finalQuarter = selectedPeriod.end;

  if (selectedPeriod?.start) {

    const start = parseQuarter(selectedPeriod.start);
    const startValue = quarterValue(start.year, start.quarter);

    if (selectedPeriod.end) {

      const end = parseQuarter(selectedPeriod.end);
      const endValue = quarterValue(end.year, end.quarter);

      conditions.push(`
        (Year * 10 + Quarter)
        BETWEEN ${startValue} AND ${endValue}
      `);

    } else {

      const startOnly = startValue;

      conditions.push(`
        (Year * 10 + Quarter) = ${startOnly}
      `);
    }
  }

  if (conditions.length === 0) {
    return "";
  }
  const WHERE_CLAUSE = `WHERE ${conditions.join(" AND ")}`;
  console.log("where clause: " + WHERE_CLAUSE);
  return WHERE_CLAUSE

}

export async function updateCharts(ecommerce, filters) {
  // Reinicia todos os gráficos
  d3.select("#time-chart").selectAll("*").remove();
  d3.select("#category-chart").selectAll("*").remove();
  d3.select("#country-chart").selectAll("*").remove();

  await Promise.all([
    renderProfitByTime(
      ecommerce, filters
    ),

    renderProfitByCategory(
      ecommerce, filters
    ),

    renderProfitByCountry(
      ecommerce, filters
    )
  ]);
}

function parseQuarter(str) {
  if (!str) return null;

  const [year, q] = str.split("-Q");

  return {
    year: +year,
    quarter: +q
  };
}

function quarterValue(year, quarter) {
  return year * 10 + quarter;
}

// define valores para as margens dos gráficos
export const margin = {
  top: 20,
  right: 100,
  bottom: 70,
  left: 100
};

// definem largura  e altura
export const width = 700;
export const height = 350;

// Define largura interna
export const innerWidth = width - margin.left - margin.right;

// Define altura interna
export const innerHeight = height - margin.top - margin.bottom;