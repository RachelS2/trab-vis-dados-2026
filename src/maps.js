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