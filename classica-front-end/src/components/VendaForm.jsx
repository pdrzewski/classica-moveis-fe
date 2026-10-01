import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/Api';
import { useAuth } from '../context/AuthContext';

const listarDados = (resposta) => {
  const dados = resposta?.data;
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const valorDo = (item, ...chaves) => chaves.map((chave) => item?.[chave]).find((valor) => valor !== undefined && valor !== null);
const idDaLoja = (loja) => valorDo(loja, 'id', 'estabelecimentoId', 'estabelecimento_id');
const idDoColaborador = (colaborador) => valorDo(colaborador, 'id', 'colaboradorId', 'colaborador_id');
const nomeDoColaborador = (colaborador) => colaborador?.nome || colaborador?.titulo || colaborador?.login || `Funcionário ${idDoColaborador(colaborador)}`;
const nomeDaLoja = (loja) => loja?.nome || loja?.titulo || loja?.descricao || `Loja ${idDaLoja(loja)}`;
const formasPagamento = [
  ['PIX', 'PIX'],
  ['DINHEIRO', 'Dinheiro'],
  ['CARTAO', 'Cartão'],
  ['CREDITO', 'Crédito'],
  ['BOLETO', 'Boleto'],
];
const formatarMoeda = (valor) => Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const resumirParcelas = (valores) => {
  const grupos = valores.reduce((acumulado, valor) => {
    const valorCentavos = Math.round(valor * 100);
    const grupo = acumulado.find((item) => item.valorCentavos === valorCentavos);
    if (grupo) grupo.quantidade += 1;
    else acumulado.push({ valorCentavos, quantidade: 1 });
    return acumulado;
  }, []);
  return grupos.map((grupo) => (
    `${grupo.quantidade}x R$ ${formatarMoeda(grupo.valorCentavos / 100)}`
  )).join(' + ');
};
const novoPagamento = () => ({ id: `${Date.now()}-${Math.random()}`, formaPagamento: 'PIX', valor: 0, parcelas: 1 });
const paraNumero = (valor) => {
  const numero = Number(String(valor ?? '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : 0;
};
const selecionarConteudoInput = (event) => event.currentTarget.select();
const identificarMatriz = (lojas) => lojas.find((loja) => (
  loja?.matriz === true
  || loja?.isMatriz === true
  || loja?.principal === true
  || /matriz/i.test(String(loja?.nome || loja?.titulo || loja?.descricao || ''))
)) || lojas.find((loja) => Number(idDaLoja(loja)) === 1);
const normalizarDocumento = (documento) => String(documento || '').replace(/\D/g, '');
const normalizarChave = (chave) => String(chave)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');
const idDiretoDoCliente = (cliente) => {
  if (!cliente || typeof cliente !== 'object') return null;
  const id = Object.entries(cliente).find(([chave, valor]) => (
    ['id', 'clienteid'].includes(normalizarChave(chave)) && valor !== undefined && valor !== null
  ))?.[1];
  return id ?? null;
};
const enderecoIdDoCliente = (cliente) => {
  const idDireto = Object.entries(cliente || {}).find(([chave, valor]) => (
    ['enderecoid', 'fk_endereco', 'fkEndereco'].map(normalizarChave).includes(normalizarChave(chave))
    && valor !== undefined && valor !== null && typeof valor !== 'object'
  ))?.[1];
  if (idDireto != null) return idDireto;
  const endereco = Object.entries(cliente || {}).find(([chave, valor]) => (
    ['endereco', 'address', 'enderecoCliente', 'fkEndereco', 'enderecoDTO', 'enderecoEntrega']
      .map(normalizarChave).includes(normalizarChave(chave))
    && valor && typeof valor === 'object'
  ))?.[1];
  return endereco ? idDiretoDoCliente(endereco) : null;
};
const camposClienteVazios = {
  nome: '', documento: '', ie: '', telefone1: '', telefone2: '', email: '', observacao: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
};
const valorDeCliente = (objeto, ...chaves) => {
  if (!objeto || typeof objeto !== 'object') return undefined;
  const nomesBuscados = new Set(chaves.map(normalizarChave));
  const fila = [objeto];
  const visitados = new WeakSet();
  while (fila.length) {
    const atual = fila.shift();
    if (!atual || typeof atual !== 'object' || visitados.has(atual)) continue;
    visitados.add(atual);
    for (const [nome, valor] of Object.entries(atual)) {
      if (nomesBuscados.has(normalizarChave(nome)) && valor !== undefined && valor !== null && typeof valor !== 'object') {
        return valor;
      }
    }
    for (const valor of Object.values(atual)) {
      if (valor && typeof valor === 'object') fila.push(valor);
    }
  }
  return undefined;
};
const extrairClientesResposta = (dados, profundidade = 0) => {
  if (profundidade > 4 || dados == null) return [];
  if (Array.isArray(dados)) return dados.flatMap((item) => extrairClientesResposta(item, profundidade + 1));
  if (typeof dados !== 'object') return [];
  const chavesDocumento = new Set(['documento', 'cpf', 'documentoCliente', 'cpfCliente', 'cpfCnpj'].map(normalizarChave));
  if (Object.entries(dados).some(([chave, valor]) => chavesDocumento.has(normalizarChave(chave)) && valor)) return [dados];
  return Object.values(dados).flatMap((valor) => (
    valor && typeof valor === 'object' ? extrairClientesResposta(valor, profundidade + 1) : []
  ));
};

export default function VendaForm() {
  const { usuario } = useAuth();
  const colaboradorLogado = usuario?.colaborador;
  const colaboradorLogadoId = usuario?.colaboradorId || colaboradorLogado?.id;

  const [produtos, setProdutos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorSelecionadoId, setColaboradorSelecionadoId] = useState('');
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [itens, setItens] = useState([]);
  const [produtoBusca, setProdutoBusca] = useState('');
  const [observacao, setObservacao] = useState('');
  const [pagamentos, setPagamentos] = useState([{ id: 'pagamento-inicial', formaPagamento: 'PIX', valor: 0, parcelas: 1 }]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [estoqueOrigem, setEstoqueOrigem] = useState({});
  const [carregandoEstoque, setCarregandoEstoque] = useState(false);
  const [lojas, setLojas] = useState([]);
  const [estoquesLojas, setEstoquesLojas] = useState({});
  const [estoqueCarregado, setEstoqueCarregado] = useState(false);
  const [distribuicaoVenda, setDistribuicaoVenda] = useState(null);
  const [quantidadesOutrasLojas, setQuantidadesOutrasLojas] = useState({});
  const [erroDistribuicao, setErroDistribuicao] = useState('');

  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [clienteForm, setClienteForm] = useState(camposClienteVazios);
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [estadoBuscaCliente, setEstadoBuscaCliente] = useState('inicial');
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [buscandoCepCliente, setBuscandoCepCliente] = useState(false);
  const [erroCliente, setErroCliente] = useState('');
  const consultaClienteAtual = useRef(0);
  const lojaMatriz = identificarMatriz(lojas);
  const colaboradorSelecionado = colaboradores.find((colaborador) => (
    Number(idDoColaborador(colaborador)) === Number(colaboradorSelecionadoId)
  ));

  const produtosSugeridos = useMemo(() => {
    const texto = produtoBusca.trim().toLowerCase();
    if (!texto) return [];
    const base = produtosFiltrados.length > 0 ? produtosFiltrados : produtos;
    return base.filter((produto) => {
      const nome = String(produto?.nome || '').toLowerCase();
      const sku = String(produto?.sku || '').toLowerCase();
      const codigo = String(produto?.codigoBarras || '').toLowerCase();
      return nome.includes(texto) || sku.includes(texto) || codigo.includes(texto);
    }).slice(0, 8);
  }, [produtos, produtosFiltrados, produtoBusca]);

  const buscarProdutos = async (termo = '') => {
    try {
      const resposta = await api.get('/produtos').catch(() => api.get('/api/produtos'));
      const lista = listarDados(resposta);
      const texto = termo.trim().toLowerCase();
      setProdutos(lista);
      setProdutosFiltrados(
        !texto
          ? lista
          : lista.filter((produto) => {
              const nome = String(produto?.nome || '').toLowerCase();
              const sku = String(produto?.sku || '').toLowerCase();
              const codigo = String(produto?.codigoBarras || '').toLowerCase();
              return nome.includes(texto) || sku.includes(texto) || codigo.includes(texto);
            })
      );
    } catch {
      setProdutos([]);
      setProdutosFiltrados([]);
    }
  };

  const buscarClientes = async (nome) => {
    if (!nome.trim() || nome.trim().length < 2) {
      setClientesSugeridos([]);
      return;
    }
    setBuscandoClientes(true);
    try {
      const resposta = await api.get(`/clientes/nome/${encodeURIComponent(nome.trim())}`).catch(() => api.get(`/api/clientes/nome/${encodeURIComponent(nome.trim())}`));
      setClientesSugeridos(listarDados(resposta));
    } catch {
      setClientesSugeridos([]);
    } finally {
      setBuscandoClientes(false);
    }
  };

  const buscarEstoqueLojas = async (lojasCarregadas) => {
    setCarregandoEstoque(true);
    try {
      const saldos = await Promise.all(lojasCarregadas.map(async (loja) => {
        const lojaId = idDaLoja(loja);
        const resposta = await api.get(`/estoque/${lojaId}/produtos`)
          .catch(() => api.get(`/api/estoque/${lojaId}/produtos`));
        const mapa = {};
        listarDados(resposta).forEach((item) => {
          const produtoId = valorDo(item, 'produtoId', 'produto_id') ?? item?.produto?.id ?? item?.id;
          const quantidade = valorDo(item, 'saldoDisponivel', 'quantidade', 'saldo', 'estoqueAtual', 'qtd') || 0;
          if (produtoId != null) mapa[Number(produtoId)] = Number(quantidade);
        });
        return [String(lojaId), mapa];
      }));
      const mapasPorLoja = Object.fromEntries(saldos);
      setEstoquesLojas(mapasPorLoja);
      setEstoqueOrigem(mapasPorLoja[String(idDaLoja(identificarMatriz(lojasCarregadas)))] || {});
      setEstoqueCarregado(true);
    } catch {
      setEstoquesLojas({});
      setEstoqueOrigem({});
      setEstoqueCarregado(false);
    } finally {
      setCarregandoEstoque(false);
    }
  };

  useEffect(() => {
    buscarProdutos('');
    const carregarColaboradores = async () => {
      try {
        const resposta = await api.get('/colaboradores').catch(() => api.get('/api/colaboradores'));
        const lista = listarDados(resposta);
        const logado = lista.find((colaborador) => Number(idDoColaborador(colaborador)) === Number(colaboradorLogadoId));
        const listaComLogado = logado || !colaboradorLogadoId
          ? lista
          : [{ ...colaboradorLogado, id: colaboradorLogadoId }, ...lista];
        setColaboradores(listaComLogado);
        setColaboradorSelecionadoId((atual) => atual || String(
          idDoColaborador(logado || listaComLogado[0]) || ''
        ));
      } catch {
        if (colaboradorLogadoId) {
          const colaboradorAtual = { ...colaboradorLogado, id: colaboradorLogadoId };
          setColaboradores([colaboradorAtual]);
          setColaboradorSelecionadoId((atual) => atual || String(colaboradorLogadoId));
        }
      }
    };
    const carregarLojas = async () => {
      try {
        const resposta = await api.get('/estabelecimentos').catch(() => api.get('/api/estabelecimentos'));
        const lojasCarregadas = listarDados(resposta);
        setLojas(lojasCarregadas);
        await buscarEstoqueLojas(lojasCarregadas);
      } catch {
        setLojas([]);
        setEstoquesLojas({});
        setEstoqueOrigem({});
        setEstoqueCarregado(false);
      }
    };
    carregarColaboradores();
    carregarLojas();
  }, []);

  useEffect(() => {
    if (colaboradorLogadoId) {
      setColaboradorSelecionadoId((atual) => atual || String(colaboradorLogadoId));
    }
  }, [colaboradorLogadoId]);

  useEffect(() => {
    buscarProdutos(produtoBusca);
  }, [produtoBusca]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      buscarClientes(clienteBusca);
    }, 300);
    return () => clearTimeout(timeout);
  }, [clienteBusca]);

  const obterSaldoDisponivel = (produtoId) => {
    return estoqueOrigem[Number(produtoId)] || 0;
  };

  const obterSaldoLoja = (produtoId, lojaId) => (
    Number(estoquesLojas[String(lojaId)]?.[Number(produtoId)] || 0)
  );

  const iniciarCadastroCliente = () => {
    setClienteForm(camposClienteVazios);
    setClienteEncontrado(null);
    setEstadoBuscaCliente('inicial');
    setErroCliente('');
    setModalClienteAberto(true);
  };

  const buscarClientePorDocumento = async (documentoInformado) => {
    const documento = normalizarDocumento(documentoInformado);
    if (documento.length !== 11) return;
    const consultaId = ++consultaClienteAtual.current;
    setBuscandoCliente(true);
    setErroCliente('');
    setEstadoBuscaCliente('buscando');
    try {
      let resposta;
      try {
        resposta = await api.get('/clientes', { params: { documento } });
      } catch {
        resposta = await api.get('/api/clientes', { params: { documento } });
      }
      const cliente = extrairClientesResposta(resposta?.data).find((item) => (
        normalizarDocumento(valorDeCliente(item, 'documento', 'cpf', 'documentoCliente', 'cpfCliente', 'cpfCnpj')) === documento
      ));
      if (consultaId !== consultaClienteAtual.current) return;
      if (!cliente) {
        setClienteEncontrado(null);
        setClienteForm({ ...camposClienteVazios, documento });
        setEstadoBuscaCliente('novo');
        return;
      }

      const endereco = ['endereco', 'address', 'enderecoCliente', 'fkEndereco', 'enderecoDTO', 'enderecoEntrega']
        .map((chave) => valorDeCliente(cliente, chave))
        .find((valor) => valor && typeof valor === 'object') || cliente;
      setClienteEncontrado(cliente);
      setClienteForm({
        ...camposClienteVazios,
        nome: valorDeCliente(cliente, 'nome', 'nomeCliente', 'nomeCompleto', 'razaoSocial') || '',
        documento: valorDeCliente(cliente, 'documento', 'cpf', 'documentoCliente', 'cpfCliente', 'cpfCnpj') || documento,
        ie: valorDeCliente(cliente, 'ie', 'inscricaoEstadual', 'ieCliente') || '',
        telefone1: valorDeCliente(cliente, 'telefone1', 'telefone_1', 'telefone', 'celular', 'numeroTelefone', 'phoneNumber') || '',
        telefone2: valorDeCliente(cliente, 'telefone2', 'telefone_2', 'telefoneAlternativo', 'telefoneSecundario') || '',
        email: valorDeCliente(cliente, 'email', 'eMail', 'emailCliente') || '',
        observacao: valorDeCliente(cliente, 'observacao', 'observacaoCliente', 'observacoes') || '',
        cep: valorDeCliente(endereco, 'cep', 'codigoPostal', 'postalCode', 'zipCode') || '',
        logradouro: valorDeCliente(endereco, 'logradouro', 'rua', 'addressLine', 'street') || '',
        numero: String(valorDeCliente(endereco, 'numero', 'numeroEndereco', 'numero_endereco', 'streetNumber') || ''),
        complemento: valorDeCliente(endereco, 'complemento', 'complement', 'complementoEndereco') || '',
        bairro: valorDeCliente(endereco, 'bairro', 'district', 'neighborhood') || '',
        cidade: valorDeCliente(endereco, 'cidade', 'localidade', 'city') || '',
        estado: valorDeCliente(endereco, 'estado', 'uf', 'state') || '',
      });
      setEstadoBuscaCliente('encontrado');
    } catch (err) {
      if (consultaId !== consultaClienteAtual.current) return;
      setEstadoBuscaCliente('inicial');
      setErroCliente(err.response?.data?.message || 'Não foi possível consultar o cliente. Tente novamente.');
    } finally {
      if (consultaId === consultaClienteAtual.current) setBuscandoCliente(false);
    }
  };

  const alterarCampoCliente = (event) => {
    const { name, value } = event.target;
    const valor = name === 'documento'
      ? value.replace(/\D/g, '').slice(0, 11)
      : name === 'cep'
        ? value.replace(/\D/g, '').slice(0, 8)
        : name === 'numero'
          ? value.replace(/\D/g, '')
          : value;
    setClienteForm((formAtual) => ({ ...formAtual, [name]: valor }));
    if (name === 'documento') {
      consultaClienteAtual.current += 1;
      setBuscandoCliente(false);
      setClienteEncontrado(null);
      setEstadoBuscaCliente('inicial');
      setErroCliente('');
      if (valor.length === 11) buscarClientePorDocumento(valor);
    }
    if (name === 'cep' && valor.length === 8) buscarEnderecoClientePorCep(valor);
  };

  const buscarEnderecoClientePorCep = async (cep) => {
    const cepNumerico = String(cep || '').replace(/\D/g, '');
    if (cepNumerico.length !== 8) return;
    setBuscandoCepCliente(true);
    setErroCliente('');
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`);
      const endereco = await resposta.json();
      if (endereco.erro) {
        setErroCliente('CEP não encontrado. Verifique o valor informado.');
        return;
      }
      setClienteForm((formAtual) => ({
        ...formAtual,
        cep: cepNumerico,
        logradouro: endereco.logradouro || '',
        bairro: endereco.bairro || '',
        cidade: endereco.localidade || '',
        estado: endereco.uf || '',
      }));
    } catch {
      setErroCliente('Não foi possível buscar o endereço do CEP informado.');
    } finally {
      setBuscandoCepCliente(false);
    }
  };

  const salvarClienteDaVenda = async (event) => {
    event.preventDefault();
    if (!['novo', 'encontrado'].includes(estadoBuscaCliente) || salvandoCliente || buscandoCliente) return;
    setSalvandoCliente(true);
    setErroCliente('');
    const payload = {
      nome: clienteForm.nome,
      documento: normalizarDocumento(clienteForm.documento),
      telefone1: clienteForm.telefone1,
      telefone2: clienteForm.telefone2 || null,
      email: clienteForm.email || null,
      observacao: clienteForm.observacao || null,
      ie: clienteForm.ie || null,
      endereco: {
        cep: clienteForm.cep,
        logradouro: clienteForm.logradouro,
        numero: clienteForm.numero,
        complemento: clienteForm.complemento || '',
        bairro: clienteForm.bairro,
        cidade: clienteForm.cidade,
        estado: clienteForm.estado,
      },
    };
    try {
      let resposta;
      if (estadoBuscaCliente === 'encontrado' && clienteEncontrado) {
        const id = idDiretoDoCliente(clienteEncontrado);
        if (!id) throw new Error('O cliente foi localizado, mas a consulta não retornou seu identificador. Consulte novamente antes de salvar.');
        const enderecoId = enderecoIdDoCliente(clienteEncontrado);
        resposta = await api.put(`/clientes/${id}`, {
          ...payload,
          id: Number(id),
          enderecoId: enderecoId == null || enderecoId === '' ? null : Number(enderecoId),
        });
      } else if (estadoBuscaCliente === 'novo' && !clienteEncontrado) {
        resposta = await api.post('/clientes', payload);
      } else {
        throw new Error('Confira o CPF antes de salvar os dados do cliente.');
      }
      const dadosSalvos = resposta?.data?.cliente || resposta?.data?.data?.cliente || resposta?.data;
      const clienteSalvo = { ...clienteEncontrado, ...payload, ...(dadosSalvos && typeof dadosSalvos === 'object' ? dadosSalvos : {}) };
      const idSalvo = idDiretoDoCliente(clienteSalvo) || idDiretoDoCliente(clienteEncontrado);
      if (!idSalvo) {
        throw new Error('O cliente foi salvo, mas a API não retornou seu identificador para associá-lo à venda.');
      }
      selecionarCliente({ ...clienteSalvo, id: idSalvo });
      setModalClienteAberto(false);
    } catch (err) {
      setErroCliente(err.response?.data?.message || err.message || 'Não foi possível salvar o cliente.');
    } finally {
      setSalvandoCliente(false);
    }
  };

  const selecionarCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setClienteBusca(cliente.nome || '');
    setClientesSugeridos([]);
  };

  const limparCliente = () => {
    setClienteSelecionado(null);
    setClienteBusca('');
  };

  const adicionarProduto = (produtoInformado = null) => {
    const candidatos = produtosFiltrados.length > 0 ? produtosFiltrados : produtos;
    const produtoEncontrado = produtoInformado || candidatos.find((produto) => {
      const nome = String(produto?.nome || '').toLowerCase();
      const busca = produtoBusca.trim().toLowerCase();
      return nome === busca || nome.includes(busca);
    });

    if (!produtoEncontrado) return;

    const produtoId = String(produtoEncontrado.id);
    const produtoJaAdicionado = itens.find((item) => item.produtoId === produtoId);

    if (produtoJaAdicionado) {
      const novaQuantidade = Number(produtoJaAdicionado.quantidade || 0) + 1;
      setItens((prev) =>
        prev.map((item) =>
          item.produtoId === produtoId
            ? { ...item, quantidade: novaQuantidade }
            : item
        )
      );
    } else {
      setItens((prev) => [
        ...prev,
        {
          produtoId,
          produtoNome: produtoEncontrado.nome,
          quantidade: 1,
          valorUnitario: Number(produtoEncontrado.precoVenda || produtoEncontrado.preco_venda || 0),
          desconto: 0,
          subtotal: Number(produtoEncontrado.precoVenda || produtoEncontrado.preco_venda || 0),
        },
      ]);
    }

    setProdutoBusca('');
    setNotice('');
  };

  const aoClicarSugestao = (produto) => {
    setProdutoBusca(produto?.nome || '');
    adicionarProduto(produto);
  };

  const alterarQuantidade = (produtoId, quantidade) => {
    const itemAtual = itens.find((item) => item.produtoId === produtoId);
    const valor = paraNumero(quantidade);
    const subtotal = (valor * paraNumero(itemAtual?.valorUnitario)) - paraNumero(itemAtual?.desconto);
    setNotice(valor <= 0 ? 'A quantidade deve ser maior que zero.' : '');

    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;
        return {
          ...item,
          quantidade,
          subtotal,
        };
      })
    );
  };

  const alterarDesconto = (produtoId, desconto) => {
    const valor = paraNumero(desconto);
    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;
        const subtotal = (paraNumero(item.valorUnitario) * paraNumero(item.quantidade)) - valor;
        return { ...item, desconto, subtotal };
      })
    );
  };

  const removerProduto = (produtoId) => {
    setItens((prev) => prev.filter((item) => item.produtoId !== produtoId));
  };

  const limparFormulario = () => {
    setItens([]);
    setProdutoBusca('');
    setObservacao('');
    setClienteSelecionado(null);
    setClienteBusca('');
    setPagamentos([{ id: 'pagamento-inicial', formaPagamento: 'PIX', valor: 0, parcelas: 1 }]);
    setNotice('');
    setDistribuicaoVenda(null);
    setQuantidadesOutrasLojas({});
    setErroDistribuicao('');
  };

  const validarFormulario = () => {
    if (!lojaMatriz || !idDaLoja(lojaMatriz)) {
      setNotice('Não foi possível identificar a matriz. Confira o estabelecimento cadastrado.');
      return false;
    }
    if (!estoqueCarregado) {
      setNotice('Não foi possível consultar o estoque das lojas. Tente novamente mais tarde.');
      return false;
    }
    if (!clienteSelecionado) {
      setNotice('Selecione o cliente.');
      return false;
    }
    if (!colaboradorSelecionadoId || !colaboradorSelecionado) {
      setNotice('Selecione o funcionário responsável pela venda.');
      return false;
    }
    const valorPagamentos = pagamentos.reduce((total, pagamento) => (
      total + Math.round(obterValorPagamento(pagamento) * 100)
    ), 0);
    const totalCentavos = Math.round(valorTotal * 100);
    if (pagamentos.length === 0 || pagamentos.some((pagamento) => obterValorPagamento(pagamento) <= 0)) {
      setNotice('Informe um valor maior que zero para cada forma de pagamento.');
      return false;
    }
    if (valorPagamentos !== totalCentavos) {
      setNotice('A soma das formas de pagamento deve ser igual ao total da venda.');
      return false;
    }
    if (itens.length === 0) {
      setNotice('Adicione pelo menos um produto à venda.');
      return false;
    }
    for (const item of itens) {
      if (paraNumero(item.quantidade) <= 0) {
        const produto = produtos.find((p) => Number(p.id) === Number(item.produtoId));
        setNotice(`Quantidade inválida para "${produto?.nome || 'produto'}".`);
        return false;
      }
    }
    return true;
  };

  const adicionarPagamento = () => {
    setPagamentos((atuais) => {
      const lista = atuais.map((pagamento) => ({
        ...pagamento,
        valor: atuais.length === 1 ? valorTotal : pagamento.valor,
      }));
      return [...lista, novoPagamento()];
    });
  };

  const alterarPagamento = (id, campo, valor) => {
    setPagamentos((atuais) => {
      let atualizados = atuais.map((pagamento) => {
        if (pagamento.id !== id) return pagamento;
        if (campo === 'formaPagamento') {
          return { ...pagamento, formaPagamento: valor, parcelas: ['CREDITO', 'BOLETO'].includes(valor) ? pagamento.parcelas || 1 : 1 };
        }
        return { ...pagamento, [campo]: valor };
      });

      if (campo === 'valor' && atualizados.length > 1) {
        const indiceEditado = atualizados.findIndex((pagamento) => pagamento.id === id);
        let indiceBalanceado = -1;
        for (let indice = atualizados.length - 1; indice >= 0; indice -= 1) {
          if (atualizados[indice].id !== id) {
            indiceBalanceado = indice;
            break;
          }
        }
        if (indiceEditado >= 0 && indiceBalanceado >= 0) {
          const centavosEditados = Math.round(paraNumero(valor) * 100);
          const centavosFixos = atualizados.reduce((total, pagamento, indice) => (
            indice !== indiceEditado && indice !== indiceBalanceado
              ? total + Math.round(paraNumero(pagamento.valor) * 100)
              : total
          ), 0);
          const restanteCentavos = Math.max(0, Math.round(valorTotal * 100) - centavosEditados - centavosFixos);
          atualizados = atualizados.map((pagamento, indice) => (
            indice === indiceBalanceado
              ? { ...pagamento, valor: (restanteCentavos / 100).toFixed(2) }
              : pagamento
          ));
        }
      }

      return atualizados;
    });
  };

  const removerPagamento = (id) => {
    setPagamentos((atuais) => atuais.filter((pagamento) => pagamento.id !== id));
  };

  const obterValorPagamento = (pagamento) => (
    pagamentos.length === 1 ? valorTotal : paraNumero(pagamento.valor)
  );

  const dividirPagamentosPorOrigem = (grupos) => {
    const totaisGrupos = grupos.map(({ itens: itensGrupo }) => (
      itensGrupo.reduce((total, item) => total + Number(item.subtotal || 0), 0)
    ));
    const totalGrupos = totaisGrupos.reduce((total, valor) => total + valor, 0);
    const alocacoesPorGrupo = grupos.map(() => []);

    pagamentos.forEach((pagamento) => {
      const valorOriginal = obterValorPagamento(pagamento);
      const quantidadeParcelas = Math.max(1, Number(pagamento.parcelas || 1));
      let alocadoCentavos = 0;
      totaisGrupos.forEach((totalGrupo, indice) => {
        const valorCentavos = indice === totaisGrupos.length - 1
          ? Math.round(valorOriginal * 100) - alocadoCentavos
          : Math.round(valorOriginal * 100 * (totalGrupo / totalGrupos));
        alocadoCentavos += valorCentavos;
        if (valorCentavos <= 0) return;
        const centavosParcelaBase = Math.floor(valorCentavos / quantidadeParcelas);
        const restoCentavos = valorCentavos - (centavosParcelaBase * quantidadeParcelas);
        const valoresParcelas = Array.from({ length: quantidadeParcelas }, (_, parcelaIndice) => (
          (centavosParcelaBase + (parcelaIndice < restoCentavos ? 1 : 0)) / 100
        ));
        alocacoesPorGrupo[indice].push({
          formaPagamento: pagamento.formaPagamento,
          valor: valorCentavos / 100,
          parcelas: quantidadeParcelas,
          valorParcela: valoresParcelas[0],
          valoresParcelas,
        });
      });
    });

    return grupos.map((grupo, indice) => ({ ...grupo, pagamentos: alocacoesPorGrupo[indice] }));
  };

  const salvarVendasPorOrigem = async (grupos) => {
    setLoading(true);
    let salvos = 0;
    try {
      const gruposComPagamentos = dividirPagamentosPorOrigem(grupos);
      for (const { loja, itens: itensDaLoja, pagamentos: pagamentosDaOrigem } of gruposComPagamentos) {
        const payload = {
          tipoMovimentacao: 'VENDA',
          formaPagamento: pagamentos[0]?.formaPagamento || 'PIX',
          pagamentos: pagamentosDaOrigem,
          observacao: observacao || 'Venda de produto',
          estabelecimentoOrigemId: Number(idDaLoja(loja)),
          estabelecimentoDestinoId: null,
          clienteId: Number(clienteSelecionado.id || clienteSelecionado.clienteId || clienteSelecionado.cliente_id),
          fornecedorId: null,
          colaboradorId: Number(colaboradorSelecionadoId),
          colaboradorNome: nomeDoColaborador(colaboradorSelecionado),
          itens: itensDaLoja.map((item) => ({
            produtoId: Number(item.produtoId),
            quantidade: paraNumero(item.quantidade),
            valorUnitario: paraNumero(item.valorUnitario),
            desconto: paraNumero(item.desconto),
          })),
        };
        await api.post('/movimentacoes', payload).catch(() => api.post('/api/movimentacoes', payload));
        salvos += 1;
      }
      await buscarEstoqueLojas(lojas);
      setNotice('Venda registrada com sucesso.');
      setItens([]);
      setObservacao('');
      setProdutoBusca('');
      setClienteSelecionado(null);
      setClienteBusca('');
      setClientesSugeridos([]);
      setPagamentos([{ id: 'pagamento-inicial', formaPagamento: 'PIX', valor: 0, parcelas: 1 }]);
      setColaboradorSelecionadoId(String(colaboradorLogadoId || ''));
      setDistribuicaoVenda(null);
      setQuantidadesOutrasLojas({});
      setErroDistribuicao('');
    } catch (err) {
      if (salvos > 0) await buscarEstoqueLojas(lojas);
      setNotice(salvos > 0
        ? `Venda parcialmente registrada (${salvos} de ${grupos.length} lojas). Verifique o histórico antes de tentar novamente.`
        : err.response?.data?.message || err.message || 'Erro ao registrar venda.');
    } finally {
      setLoading(false);
    }
  };

  const iniciarDistribuicaoVenda = () => {
    setNotice('');
    const faltas = itens.map((item) => {
      const disponivelMatriz = obterSaldoDisponivel(item.produtoId);
      const quantidadeDesejada = Number(item.quantidade || 0);
      return {
        ...item,
        quantidadeDesejada,
        disponivelMatriz,
        faltante: Math.max(0, quantidadeDesejada - disponivelMatriz),
        saldosLojas: lojas
          .filter((loja) => Number(idDaLoja(loja)) !== Number(idDaLoja(lojaMatriz)))
          .map((loja) => ({ loja, disponivel: obterSaldoLoja(item.produtoId, idDaLoja(loja)) })),
      };
    }).filter((item) => item.faltante > 0);

    if (!faltas.length) {
      void salvarVendasPorOrigem([{ loja: lojaMatriz, itens }]);
      return;
    }
    setDistribuicaoVenda(faltas);
    setQuantidadesOutrasLojas(Object.fromEntries(faltas.map((item) => [item.produtoId, {}])));
    setErroDistribuicao('');
  };

  const alterarQuantidadeOrigem = (produtoId, lojaId, valor, saldoMaximo, faltante) => {
    setQuantidadesOutrasLojas((atuais) => {
      const alocacoes = atuais[produtoId] || {};
      const totalOutrasLojas = Object.entries(alocacoes)
        .filter(([id]) => Number(id) !== Number(lojaId))
        .reduce((total, [, quantidade]) => total + Number(quantidade || 0), 0);
      const maximo = Math.max(0, Math.min(saldoMaximo, faltante - totalOutrasLojas));
      const quantidade = valor === '' ? 0 : Math.max(0, Math.min(Number(valor) || 0, maximo));
      return { ...atuais, [produtoId]: { ...alocacoes, [lojaId]: quantidade } };
    });
  };

  const confirmarDistribuicaoVenda = async () => {
    const invalida = distribuicaoVenda?.some((item) => {
      const alocacoes = quantidadesOutrasLojas[item.produtoId] || {};
      const total = Object.values(alocacoes).reduce((soma, quantidade) => soma + Number(quantidade || 0), 0);
      return total !== item.faltante || item.saldosLojas.some(({ loja, disponivel }) => (
        Number(alocacoes[idDaLoja(loja)] || 0) > disponivel
      ));
    });
    if (invalida) {
      setErroDistribuicao('Distribua exatamente a quantidade que falta, respeitando o saldo de cada loja.');
      return;
    }

    const grupos = new Map();
    const incluirItem = (loja, item, quantidade) => {
      if (!quantidade) return;
      const lojaId = String(idDaLoja(loja));
      if (!grupos.has(lojaId)) grupos.set(lojaId, { loja, itens: [] });
      const proporcao = quantidade / Number(item.quantidade || 1);
      grupos.get(lojaId).itens.push({
        ...item,
        quantidade,
        desconto: Number((paraNumero(item.desconto) * proporcao).toFixed(2)),
      });
    };

    itens.forEach((item) => {
      const saldoMatriz = obterSaldoDisponivel(item.produtoId);
      incluirItem(lojaMatriz, item, Math.min(Number(item.quantidade || 0), saldoMatriz));
      Object.entries(quantidadesOutrasLojas[item.produtoId] || {}).forEach(([lojaId, quantidade]) => {
        const loja = lojas.find((itemLoja) => Number(idDaLoja(itemLoja)) === Number(lojaId));
        incluirItem(loja, item, Number(quantidade || 0));
      });
    });
    setErroDistribuicao('');
    await salvarVendasPorOrigem(Array.from(grupos.values()));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validarFormulario()) return;
    iniciarDistribuicaoVenda();
  };

  const valorTotal = useMemo(() => {
    return itens.reduce((total, item) => {
      return total + (paraNumero(item.valorUnitario) * paraNumero(item.quantidade)) - paraNumero(item.desconto);
    }, 0);
  }, [itens]);

  const quantidadeTotal = useMemo(() => {
    return itens.reduce((total, item) => total + paraNumero(item.quantidade), 0);
  }, [itens]);

  const lojaOrigemNome = lojaMatriz ? nomeDaLoja(lojaMatriz) : 'Matriz não identificada';

  return (
    <div className="superficie superficie-formulario venda-form">
      <form onSubmit={handleSubmit} className="form-movimentacao form-venda">
        <div className="venda-topbar">
          <div className="venda-loja-info">
            <span className="loja-label">Loja de origem</span>
            <span className="loja-nome">{lojaOrigemNome}</span>
            {carregandoEstoque && <span className="loading-indicator">Carregando estoque...</span>}
          </div>
          <button type="button" className="btn-limpar" onClick={limparFormulario}>
            Limpar campos
          </button>
        </div>

        <div className="venda-header-grid">
          <div className="campo cliente-campo">
            <label>Cliente *</label>
            <div className="busca-wrapper busca-cliente-venda-wrapper">
              <input
                type="text"
                value={clienteBusca}
                onChange={(e) => setClienteBusca(e.target.value)}
                onFocus={() => clienteBusca && buscarClientes(clienteBusca)}
                placeholder={clienteSelecionado ? 'Cliente selecionado' : 'Digite o nome do cliente (mín. 2 letras)'}
                disabled={buscandoClientes}
                autoComplete="off"
              />
              {clienteSelecionado && (
                <button type="button" className="btn-limpar-cliente" onClick={limparCliente} title="Remover cliente">
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Remover cliente selecionado</span>
                </button>
              )}
              {buscandoClientes && <span className="indicador-busca-cliente" role="status">Buscando...</span>}
              {clientesSugeridos.length > 0 && (
                <div className="lista-sugestoes-clientes" role="listbox" aria-label="Clientes sugeridos">
                  {clientesSugeridos.map((cliente) => (
                    <button
                      key={cliente.id || cliente.clienteId || cliente.cliente_id}
                      type="button"
                      className="sugestao-cliente"
                      onClick={() => selecionarCliente(cliente)}
                    >
                      <span className="cliente-nome">{cliente.nome}</span>
                      <span className="cliente-detalhes">
                        {cliente.documento ? `CPF/CNPJ: ${cliente.documento}` : ''}
                        {cliente.telefone1 ? ` | Tel: ${cliente.telefone1}` : ''}
                        {cliente.email ? ` | ${cliente.email}` : ''}
                        {cliente.cidade && cliente.estado ? ` | ${cliente.cidade}/${cliente.estado}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {clienteSelecionado && (
              <div className="cliente-selecionado-card">
                <strong>{clienteSelecionado.nome}</strong>
                <div className="cliente-infos">
                  {clienteSelecionado.documento && <span>📄 {clienteSelecionado.documento}</span>}
                  {clienteSelecionado.telefone1 && <span>📞 {clienteSelecionado.telefone1}</span>}
                  {clienteSelecionado.email && <span>✉️ {clienteSelecionado.email}</span>}
                  {clienteSelecionado.logradouro && <span>📍 {clienteSelecionado.logradouro}, {clienteSelecionado.numero || ''} {clienteSelecionado.complemento ? `- ${clienteSelecionado.complemento}` : ''} - {clienteSelecionado.bairro || ''}, {clienteSelecionado.cidade || ''}/{clienteSelecionado.estado || ''} - CEP: {clienteSelecionado.cep || ''}</span>}
                </div>
              </div>
            )}
            <button type="button" className="btn-adicionar-cliente-venda" onClick={iniciarCadastroCliente}>
              + Adicionar cliente
            </button>
          </div>

          <div className="campo">
            <label htmlFor="funcionario-venda">Funcionário responsável *</label>
            <select
              id="funcionario-venda"
              value={colaboradorSelecionadoId}
              onChange={(event) => setColaboradorSelecionadoId(event.target.value)}
              required
            >
              <option value="">Selecione o funcionário</option>
              {colaboradores.map((colaborador) => {
                const id = idDoColaborador(colaborador);
                return <option key={id} value={id}>{nomeDoColaborador(colaborador)}</option>;
              })}
            </select>
          </div>
        </div>

        <div className="campo bloco-produtos">
          <label>Produtos</label>
          <div className="linha-selecao-produto">
            <div className="campo-busca-produto">
              <input
                value={produtoBusca}
                onChange={(event) => setProdutoBusca(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  const candidatos = produtosSugeridos.length > 0
                    ? produtosSugeridos
                    : produtosFiltrados.length > 0
                      ? produtosFiltrados
                      : produtos;
                  const busca = produtoBusca.trim().toLowerCase();
                  const produtoCorreto = candidatos.find((produto) => {
                    const nome = String(produto?.nome || '').toLowerCase();
                    return nome === busca || nome.includes(busca);
                  });
                  if (produtoCorreto) {
                    adicionarProduto(produtoCorreto);
                    return;
                  }
                  if (candidatos.length === 1) {
                    adicionarProduto(candidatos[0]);
                  }
                }}
                placeholder="Digite o nome, SKU ou código de barras"
                autoComplete="off"
              />

              {produtoBusca.trim() && produtosSugeridos.length > 0 && (
                <div className="lista-sugestoes-produtos" role="listbox" aria-label="Produtos sugeridos">
                  {produtosSugeridos.map((produto) => {
                    const saldo = obterSaldoDisponivel(produto.id);
                    const semEstoque = saldo <= 0;
                    return (
                      <button
                        key={produto.id}
                        type="button"
                        className={`sugestao-produto ${semEstoque ? 'sem-estoque' : ''}`}
                        onClick={() => aoClicarSugestao(produto)}
                      >
                        <span>{produto.nome}</span>
                        <small>
                          {produto.sku || produto.codigoBarras || 'Produto'}
                          {saldo > 0 ? ` | Matriz: ${saldo}` : ' | Sem estoque na matriz'}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="campo campo-observacao">
          <label>Observação</label>
          <textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            placeholder="Descreva detalhes da venda (opcional)"
            rows={2}
          />
        </div>

        <section className="detalhes-venda" aria-labelledby="titulo-detalhes-venda">
          <div className="detalhes-venda-cabecalho">
            <div>
              <p className="titulo-pequeno">Conferência</p>
              <h2 id="titulo-detalhes-venda">Detalhes da venda</h2>
            </div>
            <span>{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
          </div>
          {itens.length === 0 ? (
            <div className="lista-vazia">Os produtos adicionados aparecerão aqui para conferência.</div>
          ) : (
            <div className="tabela-itens-scroll">
              <div className="tabela-itens">
                <div className="tabela-header">
                  <div className="col-produto">Produto</div>
                  <div className="col-qtd">Qtd</div>
                  <div className="col-vl">Vl. Unit.</div>
                  <div className="col-desc">Desconto</div>
                  <div className="col-sub">Subtotal</div>
                  <div className="col-estoque">Estoque</div>
                  <div className="col-acoes"></div>
                </div>
                <div className="lista-itens">
                  {itens.map((item) => {
                    const saldo = obterSaldoDisponivel(Number(item.produtoId));
                    const produto = produtos.find((p) => Number(p.id) === Number(item.produtoId));
                    return (
                      <div key={item.produtoId} className="item-movimentacao">
                        <div className="col-produto">
                          <span>{item.produtoNome}</span>
                          <small className="texto-secundario">
                            Estoque na matriz: {saldo} {produto?.unidadeMedida || produto?.unidade_medida || 'UN'}
                          </small>
                        </div>
                        <div className="col-qtd">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={String(item.quantidade)}
                            onChange={(event) => alterarQuantidade(item.produtoId, event.target.value)}
                            onFocus={selecionarConteudoInput}
                            title="Se o saldo da matriz for insuficiente, escolha outras lojas ao finalizar."
                          />
                        </div>
                        <div className="col-vl">
                          <input
                            type="number"
                            value={String(item.valorUnitario)}
                            readOnly
                            aria-label={`Valor unitário de ${item.produtoNome}`}
                          />
                        </div>
                        <div className="col-desc">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={String(item.desconto)}
                            onChange={(event) => alterarDesconto(item.produtoId, event.target.value)}
                            onFocus={selecionarConteudoInput}
                            placeholder="0,00"
                          />
                        </div>
                        <div className="col-sub">
                          <strong>R$ {Number(item.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="col-estoque">
                          <span className={saldo > 0 ? '' : 'sem-estoque'}>
                            {saldo > 0 ? `${saldo} disp.` : 'Sem estoque'}
                          </span>
                        </div>
                        <div className="col-acoes">
                          <button type="button" className="btn-remover" onClick={() => removerProduto(item.produtoId)} title="Remover">
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="venda-resumo">
          <div className="resumo-grid">
            <div className="resumo-item">
              <span className="resumo-label">Itens</span>
              <span className="resumo-valor">{itens.length}</span>
            </div>
            <div className="resumo-item">
              <span className="resumo-label">Qtd total</span>
              <span className="resumo-valor">{quantidadeTotal}</span>
            </div>
            <div className="resumo-item total">
              <span className="resumo-label">Total</span>
              <span className="resumo-valor destaque">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="campo campo-pagamento-venda">
          <div className="pagamentos-titulo">
            <div>
              <label>Formas de pagamento *</label>
              <small>Divida o total entre as formas escolhidas pelo cliente.</small>
            </div>
            <button type="button" className="btn-adicionar-pagamento" onClick={adicionarPagamento}>
              + Adicionar forma
            </button>
          </div>
          <div className="lista-pagamentos-venda">
            {pagamentos.map((pagamento, indice) => {
              const valor = obterValorPagamento(pagamento);
              const parcelas = Math.max(1, Number(pagamento.parcelas || 1));
              const valorEmCentavos = Math.round(valor * 100);
              const parcelaBaseCentavos = Math.floor(valorEmCentavos / parcelas);
              const restoCentavos = valorEmCentavos - (parcelaBaseCentavos * parcelas);
              const valoresParcelas = Array.from({ length: parcelas }, (_, parcelaIndice) => (
                (parcelaBaseCentavos + (parcelaIndice < restoCentavos ? 1 : 0)) / 100
              ));
              const aceitaParcelas = ['CREDITO', 'BOLETO'].includes(pagamento.formaPagamento);
              const resumoParcelas = parcelas > 1 ? resumirParcelas(valoresParcelas) : '';
              return (
                <div className="linha-pagamento-venda" key={pagamento.id}>
                  <div className="campo-pagamento-metodo">
                    <label htmlFor={`forma-pagamento-${pagamento.id}`}>Forma {indice + 1}</label>
                    <select
                      id={`forma-pagamento-${pagamento.id}`}
                      value={pagamento.formaPagamento}
                      onChange={(event) => alterarPagamento(pagamento.id, 'formaPagamento', event.target.value)}
                    >
                      {formasPagamento.map(([valorForma, rotulo]) => <option key={valorForma} value={valorForma}>{rotulo}</option>)}
                    </select>
                  </div>
                  <div className="campo-pagamento-valor">
                    <label htmlFor={`valor-pagamento-${pagamento.id}`}>Valor</label>
                    <input
                      id={`valor-pagamento-${pagamento.id}`}
                      type="text"
                      inputMode="decimal"
                      value={pagamentos.length === 1 ? valor : pagamento.valor}
                      onChange={(event) => alterarPagamento(pagamento.id, 'valor', event.target.value)}
                      onFocus={selecionarConteudoInput}
                      readOnly={pagamentos.length === 1}
                    />
                  </div>
                  {aceitaParcelas && (
                    <div className="campo-pagamento-parcelas">
                      <label htmlFor={`parcelas-pagamento-${pagamento.id}`}>Parcelas</label>
                      <select
                        id={`parcelas-pagamento-${pagamento.id}`}
                        value={parcelas}
                        onChange={(event) => alterarPagamento(pagamento.id, 'parcelas', Number(event.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, posicao) => posicao + 1).map((quantidade) => (
                          <option key={quantidade} value={quantidade}>{quantidade}x</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {pagamentos.length > 1 && (
                    <button
                      type="button"
                      className="btn-remover-pagamento"
                      onClick={() => removerPagamento(pagamento.id)}
                      aria-label={`Remover forma de pagamento ${indice + 1}`}
                      title="Remover forma de pagamento"
                    >
                      ×
                    </button>
                  )}
                  {resumoParcelas && <small className="resumo-parcelas-venda">{resumoParcelas}</small>}
                </div>
              );
            })}
          </div>
          <div className={`conferencia-pagamentos ${Math.round(pagamentos.reduce((soma, pagamento) => soma + obterValorPagamento(pagamento), 0) * 100) === Math.round(valorTotal * 100) ? 'conferencia-pagamentos-ok' : ''}`}>
            <span>Distribuído: R$ {formatarMoeda(pagamentos.reduce((soma, pagamento) => soma + obterValorPagamento(pagamento), 0))}</span>
            <span>Total da venda: R$ {formatarMoeda(valorTotal)}</span>
          </div>
        </div>

        {notice && <div className="aviso">{notice}</div>}

        <div className="acoes-movimentacao rodape-acoes">
          <button className="primario" type="submit" disabled={loading || itens.length === 0 || !clienteSelecionado || !colaboradorSelecionadoId || !lojaMatriz || carregandoEstoque}>
            {loading ? 'Finalizando...' : 'Finalizar venda'}
          </button>
        </div>
      </form>

      {distribuicaoVenda && (
        <div className="camada-modal modal-distribuicao-venda" role="presentation">
          <section className="cartao-modal modal-estoque-venda" role="dialog" aria-modal="true" aria-labelledby="titulo-distribuicao-venda">
            <p className="titulo-pequeno">Estoque da matriz insuficiente</p>
            <h2 id="titulo-distribuicao-venda">Escolha de quais lojas retirar</h2>
            <p className="texto-modal-venda">A venda usará primeiro o saldo da matriz. Distribua apenas o que está faltando.</p>
            <div className="lista-distribuicao-venda">
              {distribuicaoVenda.map((item) => {
                const alocacoes = quantidadesOutrasLojas[item.produtoId] || {};
                const totalAlocado = Object.values(alocacoes).reduce((total, quantidade) => total + Number(quantidade || 0), 0);
                const totalDisponivel = item.saldosLojas.reduce((total, saldo) => total + saldo.disponivel, 0);
                return (
                  <section key={item.produtoId} className="linha-distribuicao-venda">
                    <div className="resumo-produto-venda">
                      <strong>{item.produtoNome}</strong>
                      <span>Solicitado: {item.quantidadeDesejada} | Matriz: {item.disponivelMatriz} | Faltam: {item.faltante}</span>
                    </div>
                    {item.saldosLojas.map(({ loja, disponivel }) => (
                      <label key={idDaLoja(loja)} className="origem-loja-venda">
                        <span>{nomeDaLoja(loja)} <small>Disponível: {disponivel}</small></span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={alocacoes[idDaLoja(loja)] || 0}
                          disabled={disponivel <= 0}
                          onChange={(event) => alterarQuantidadeOrigem(item.produtoId, idDaLoja(loja), event.target.value, disponivel, item.faltante)}
                          onFocus={selecionarConteudoInput}
                          aria-label={`Quantidade de ${item.produtoNome} retirada de ${nomeDaLoja(loja)}`}
                        />
                      </label>
                    ))}
                    <div className="cobertura-venda">
                      <span>Quantidade distribuída</span>
                      <strong>{totalAlocado} / {item.faltante}</strong>
                      {totalDisponivel < item.faltante && <small>Estoque das outras lojas insuficiente para cobrir a falta.</small>}
                    </div>
                  </section>
                );
              })}
            </div>
            {erroDistribuicao && <div className="aviso erro-distribuicao-venda">{erroDistribuicao}</div>}
            <div className="acoes-distribuicao-venda">
              <button type="button" className="btn-cancelar" onClick={() => setDistribuicaoVenda(null)} disabled={loading}>Voltar à venda</button>
              <button type="button" className="primario" onClick={confirmarDistribuicaoVenda} disabled={loading}>
                {loading ? 'Salvando...' : 'Confirmar distribuição'}
              </button>
            </div>
          </section>
        </div>
      )}

      {modalClienteAberto && (
        <div className="camada-modal modal-cliente-venda">
          <section className="cartao-modal cartao-cliente-venda" role="dialog" aria-modal="true" aria-labelledby="titulo-cliente-venda">
            <button type="button" className="fechar" aria-label="Fechar cadastro de cliente" onClick={() => setModalClienteAberto(false)} disabled={salvandoCliente}>×</button>
            <p className="titulo-pequeno">Venda</p>
            <h2 id="titulo-cliente-venda">Adicionar cliente</h2>
            <form onSubmit={salvarClienteDaVenda} className="form-cliente-venda">
              <div className="grade-cliente-venda">
                <label className="campo-cpf-cliente-venda">
                  CPF
                  <span className="linha-busca-cpf-venda">
                    <input autoFocus type="text" name="documento" value={clienteForm.documento} onChange={alterarCampoCliente} placeholder="Digite o CPF" inputMode="numeric" maxLength={11} required />
                  </span>
                  {buscandoCliente && <small>Consultando CPF...</small>}
                </label>
                {estadoBuscaCliente === 'novo' && <p className="resultado-busca-cliente-venda">CPF não cadastrado. Preencha os dados para cadastrar.</p>}
                {estadoBuscaCliente === 'encontrado' && <p className="resultado-busca-cliente-venda">Cliente localizado. Revise ou altere os dados antes de salvar.</p>}
                {Object.entries({
                  ie: 'IE', nome: 'Nome', telefone1: 'Telefone 1', telefone2: 'Telefone 2', email: 'E-mail',
                  observacao: 'Observação', cep: 'CEP', logradouro: 'Logradouro', numero: 'Número', complemento: 'Complemento',
                  bairro: 'Bairro', cidade: 'Cidade', estado: 'Estado',
                }).map(([name, label]) => (
                  <label key={name} className={name === 'observacao' ? 'campo-largo-cliente-venda' : ''}>
                    {label}
                    {name === 'observacao' ? (
                      <textarea name={name} value={clienteForm[name]} onChange={alterarCampoCliente} rows={3} disabled={!['novo', 'encontrado'].includes(estadoBuscaCliente)} />
                    ) : (
                      <input
                        type={name === 'email' ? 'email' : 'text'}
                        name={name}
                        value={clienteForm[name]}
                        onChange={alterarCampoCliente}
                        onBlur={name === 'cep' ? () => buscarEnderecoClientePorCep(clienteForm.cep) : undefined}
                        inputMode={name === 'numero' ? 'numeric' : undefined}
                        pattern={name === 'numero' ? '[0-9]*' : undefined}
                        required={['nome', 'telefone1', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'].includes(name)}
                        disabled={!['novo', 'encontrado'].includes(estadoBuscaCliente)}
                      />
                    )}
                    {name === 'cep' && buscandoCepCliente && <small>Buscando endereço...</small>}
                  </label>
                ))}
              </div>
              {erroCliente && <p className="erro erro-cliente-venda">{erroCliente}</p>}
              <div className="acoes-cliente-venda">
                <button type="button" className="btn-cancelar" onClick={() => setModalClienteAberto(false)} disabled={salvandoCliente}>Cancelar</button>
                <button type="submit" className="primario" disabled={salvandoCliente || buscandoCliente || !['novo', 'encontrado'].includes(estadoBuscaCliente)}>
                  {salvandoCliente ? 'Salvando...' : clienteEncontrado ? 'Salvar alterações' : 'Cadastrar cliente'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}