export const cadastroConfigs = {
  funcionario: {
    title: 'Funcionários', singular: 'funcionário',
    fields: ['Nome completo', 'E-mail', 'Cargo', 'Telefone'],
    rows: [['Mariana Costa', 'mariana@classica.com', 'Vendedora', '(11) 99999-1100'], ['Rafael Mendes', 'rafael@classica.com', 'Estoquista', '(11) 99999-2200'], ['Ana Oliveira', 'ana@classica.com', 'Gerente', '(11) 99999-3300']],
  },
  categoria: {
    title: 'Categorias', singular: 'categoria', fields: ['Nome da categoria', 'Descrição'],
    rows: [['Sala de estar', 'Sofás e racks'], ['Quarto', 'Camas e armários'], ['Escritório', 'Mesas e cadeiras']],
  },
  fornecedora: {
    title: 'Fornecedoras', singular: 'fornecedora', fields: ['Razão social', 'CNPJ', 'Contato'],
    rows: [['Madeira Forte Ltda.', '12.345.678/0001-90', 'contato@madeiraforte.com'], ['Casa do Estofado', '98.765.432/0001-10', 'vendas@casaestofado.com']],
  },
  produto: {
    title: 'Produtos', singular: 'produto', fields: ['Nome do produto', 'Categoria', 'Preço de venda', 'Estoque'],
    rows: [['Sofá Viena 3 lugares', 'Sala de estar', 'R$ 2.490,00', '24'], ['Mesa Oslo 6 lugares', 'Sala de jantar', 'R$ 1.890,00', '7'], ['Cama Aurora queen', 'Quarto', 'R$ 2.190,00', '0']],
  },
  loja: {
    title: 'Lojas', singular: 'loja', fields: ['Nome da loja', 'Endereço', 'Responsável'],
    rows: [['Clássica Centro', 'Av. Paulista, 1000', 'Ana Oliveira'], ['Clássica Norte', 'Rua das Flores, 220', 'Carlos Lima']],
  },
};