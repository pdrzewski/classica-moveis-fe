export const cadastroConfigs = {
  funcionario: {
    title: 'Funcionários',
    singular: 'funcionário',
    endpoint: '/colaboradores',
    relations: { cargoId: '/cargos', estabelecimentoId: '/estabelecimentos' },
    fields: ['nome', 'login', 'cargoId', 'cpf', 'dataAdmissao', 'dataNascimento', 'salario', 'carteiraTrabalho', 'comissao', 'estabelecimentoId', 'emFerias'],
  },
  categoria: {
    title: 'Categorias',
    singular: 'categoria',
    endpoint: '/categorias',
    fields: ['categoria', 'nome'],
  },
  fornecedora: {
    title: 'Fornecedoras',
    singular: 'fornecedora',
    endpoint: '/fornecedores',
    fields: ['nome', 'cnpj', 'representante', 'telefone1', 'telefone2', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'],
  },
  produto: {
    title: 'Produtos',
    singular: 'produto',
    endpoint: '/produtos',
    relations: { fornecedorId: '/fornecedores', categoriaId: '/categorias' },
    fields: ['fornecedorId', 'categoriaId', 'nome', 'sku', 'codigoBarras', 'unidadeMedida', 'marca', 'precoCusto', 'precoVenda', 'estoqueMinimo', 'ativo'],
  },
  loja: {
    title: 'Lojas',
    singular: 'loja',
    endpoint: '/estabelecimentos',
    relations: { responsavelId: '/colaboradores' },
    fields: ['nome', 'cnpj', 'telefone', 'responsavelId', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'],
  },
  estabelecimento: {
    title: 'Estabelecimentos',
    singular: 'estabelecimento',
    endpoint: '/estabelecimentos',
    relations: { responsavelId: '/colaboradores' },
    fields: ['nome', 'cnpj', 'telefone', 'responsavelId', 'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'],
  },
};