export const cadastroConfigs = {
  funcionario: {
    title: 'Funcionários', singular: 'funcionário',
    fields: ['Nome completo', 'E-mail', 'Cargo', 'Telefone'],
  },
  categoria: {
    title: 'Categorias', singular: 'categoria', fields: ['Nome da categoria', 'Descrição'],
  },
  fornecedora: {
    title: 'Fornecedoras', singular: 'fornecedora', fields: ['Razão social', 'CNPJ', 'Contato'],
  },
  produto: {
    title: 'Produtos', singular: 'produto', fields: ['Nome do produto', 'Categoria', 'Preço de venda', 'Estoque'],
  },
  loja: {
    title: 'Lojas', singular: 'loja', fields: ['Nome da loja', 'Endereço', 'Responsável'],
  },
};