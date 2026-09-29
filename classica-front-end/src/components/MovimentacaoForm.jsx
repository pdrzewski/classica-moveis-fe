import { useEffect, useMemo, useState } from 'react';
import api from '../services/Api';

const listarDados = (resposta) => {
  const dados = resposta?.data;

  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const valorDo = (item, ...chaves) => chaves.map((chave) => item?.[chave]).find((valor) => valor !== undefined && valor !== null);
const idDaLoja = (loja) => valorDo(loja, 'id', 'estabelecimentoId', 'estabelecimento_id');
const nomeDaLoja = (loja) => loja?.nome || loja?.titulo || loja?.descricao || `Loja ${idDaLoja(loja)}`;
const dataLocalHoje = () => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};
const camposClienteVazios = {
  nome: '',
  documento: '',
  ie: '',
  telefone1: '',
  telefone2: '',
  email: '',
  observacao: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
};
const documentoNormalizado = (documento) => String(documento || '').replace(/\D/g, '');
const enderecoDoCliente = (cliente) => cliente?.endereco || cliente?.address || cliente || {};
const identificarMatriz = (lojas) => lojas.find((loja) => (
  loja?.matriz === true
  || loja?.isMatriz === true
  || loja?.principal === true
  || /matriz/i.test(String(loja?.nome || loja?.titulo || loja?.descricao || ''))
)) || lojas.find((loja) => Number(idDaLoja(loja)) === 1);

export default function MovimentacaoForm({ tipoInicial = 'COMPRA', tipoLabel = tipoInicial, direcaoInicial = 'ENTRADA', transferencia = false }) {
  const [direcao, setDirecao] = useState(direcaoInicial);
  const [tipoMovimentacao, setTipoMovimentacao] = useState(tipoInicial);
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [estoqueApi, setEstoqueApi] = useState(null);
  const [movimentacoesEstoque, setMovimentacoesEstoque] = useState(null);
  const [estoqueCarregado, setEstoqueCarregado] = useState(false);
  const [distribuicaoVenda, setDistribuicaoVenda] = useState(null);
  const [quantidadesOutrasLojas, setQuantidadesOutrasLojas] = useState({});
  const [erroDistribuicao, setErroDistribuicao] = useState('');
  const [colaboradores, setColaboradores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [modalClienteAberto, setModalClienteAberto] = useState(false);
  const [clienteForm, setClienteForm] = useState(camposClienteVazios);
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [estadoBuscaCliente, setEstadoBuscaCliente] = useState('inicial');
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [buscandoCepCliente, setBuscandoCepCliente] = useState(false);
  const [erroCliente, setErroCliente] = useState('');
  const [itens, setItens] = useState([]);
  const [produtoBusca, setProdutoBusca] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dataMovimentacao, setDataMovimentacao] = useState(dataLocalHoje);
  const [lojaSelecionada, setLojaSelecionada] = useState('');
  const [lojaOrigemId, setLojaOrigemId] = useState('');
  const [lojaDestinoId, setLojaDestinoId] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [status, setStatus] = useState('PENDENTE');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

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

  const lojaMatriz = identificarMatriz(lojas);
  const venda = tipoMovimentacao === 'VENDA';

  const obterSaldo = (produtoId, lojaId) => {
    const saldoApi = estoqueApi?.find((saldo) => (
      Number(valorDo(saldo, 'produtoId', 'produto_id', 'fkProduto', 'fk_produto') ?? saldo?.produto?.id)
        === Number(produtoId)
      && Number(valorDo(saldo, 'lojaId', 'estabelecimentoId', 'estabelecimento_id')) === Number(lojaId)
    ));

    if (saldoApi) return Math.max(0, Number(valorDo(saldoApi, 'quantidade', 'saldo', 'estoqueAtual', 'qtd') || 0));

    return Math.max(0, (movimentacoesEstoque || []).reduce((saldo, movimentacao) => {
      const tipo = String(valorDo(movimentacao, 'tipoMovimentacao', 'tipo_movimentacao', 'tipo') || '').toUpperCase();
      const origemId = valorDo(movimentacao, 'estabelecimentoOrigemId', 'estabelecimento_origem_id', 'origemId');
      const destinoId = valorDo(movimentacao, 'estabelecimentoDestinoId', 'estabelecimento_destino_id', 'destinoId');
      const itensMovimentacao = movimentacao.itens || movimentacao.items || movimentacao.itemMovimentacoes || [];
      const quantidade = itensMovimentacao.reduce((total, item) => {
        const idItem = valorDo(item, 'produtoId', 'produto_id', 'fkProduto', 'fk_produto') ?? item?.produto?.id;
        return Number(idItem) === Number(produtoId)
          ? total + Number(valorDo(item, 'quantidade', 'qtd', 'quantidadeProduto') || 0)
          : total;
      }, 0);

      if (['COMPRA', 'DEVOLUCAO_CLIENTE', 'AJUSTE_ENTRADA'].includes(tipo) && Number(destinoId) === Number(lojaId)) {
        return saldo + quantidade;
      }
      if (['VENDA', 'QUEBRA', 'DEVOLUCAO_FORNECEDOR', 'AJUSTE_SAIDA'].includes(tipo) && Number(origemId) === Number(lojaId)) {
        return saldo - quantidade;
      }
      if (tipo === 'TRANSFERENCIA') {
        if (Number(origemId) === Number(lojaId)) return saldo - quantidade;
        if (Number(destinoId) === Number(lojaId)) return saldo + quantidade;
      }
      return saldo;
    }, 0));
  };

  const iniciarCadastroCliente = () => {
    setClienteForm(camposClienteVazios);
    setClienteEncontrado(null);
    setEstadoBuscaCliente('inicial');
    setErroCliente('');
    setModalClienteAberto(true);
  };

  const buscarClientePorDocumento = async () => {
    const documento = documentoNormalizado(clienteForm.documento);
    if (documento.length !== 11) {
      setErroCliente('Informe um CPF válido com 11 números para pesquisar.');
      return;
    }

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

      const dados = resposta?.data;
      const lista = listarDados(resposta);
      const candidatoDireto = dados?.cliente || (dados && !Array.isArray(dados) && !dados.content && !dados.dados ? dados : null);
      const cliente = [candidatoDireto, ...lista].find((item) => (
        documentoNormalizado(item?.documento || item?.cpf) === documento
      ));

      if (!cliente) {
        setClienteEncontrado(null);
        setClienteForm({ ...camposClienteVazios, documento });
        setEstadoBuscaCliente('novo');
        return;
      }

      const endereco = enderecoDoCliente(cliente);
      setClienteEncontrado(cliente);
      setClienteForm({
        ...camposClienteVazios,
        nome: cliente.nome || '',
        documento: cliente.documento || cliente.cpf || documento,
        ie: cliente.ie || cliente.inscricaoEstadual || '',
        telefone1: cliente.telefone1 || cliente.telefone || '',
        telefone2: cliente.telefone2 || '',
        email: cliente.email || '',
        observacao: cliente.observacao || '',
        cep: endereco.cep || '',
        logradouro: endereco.logradouro || '',
        numero: String(endereco.numero || ''),
        complemento: endereco.complemento || '',
        bairro: endereco.bairro || '',
        cidade: endereco.cidade || '',
        estado: endereco.estado || endereco.uf || '',
      });
      setEstadoBuscaCliente('encontrado');
    } catch (err) {
      setEstadoBuscaCliente('inicial');
      setErroCliente(err.response?.data?.message || 'Não foi possível consultar o cliente. Tente novamente.');
    } finally {
      setBuscandoCliente(false);
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
    if (name === 'documento' && estadoBuscaCliente !== 'inicial') {
      setEstadoBuscaCliente('inicial');
      setClienteEncontrado(null);
    }
    if (name === 'cep' && valor.length === 8) buscarEnderecoClientePorCep(valor);
  };

  const buscarEnderecoClientePorCep = async (cep) => {
    if (cep.length !== 8) return;
    setBuscandoCepCliente(true);
    setErroCliente('');
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const endereco = await resposta.json();
      if (endereco.erro) {
        setErroCliente('CEP não encontrado. Verifique o valor informado.');
        return;
      }
      setClienteForm((formAtual) => ({
        ...formAtual,
        cep,
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
    if (estadoBuscaCliente !== 'novo' && estadoBuscaCliente !== 'encontrado') return;
    setSalvandoCliente(true);
    setErroCliente('');

    const payload = {
      nome: clienteForm.nome,
      documento: documentoNormalizado(clienteForm.documento),
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
      let clienteSalvo;
      if (clienteEncontrado) {
        const clienteIdExistente = clienteEncontrado.id || clienteEncontrado.clienteId || clienteEncontrado.cliente_id;
        const resposta = await api.put(`/clientes/${clienteIdExistente}`, payload)
          .catch(() => api.put(`/api/clientes/${clienteIdExistente}`, payload));
        clienteSalvo = resposta?.data?.cliente || resposta?.data || { ...clienteEncontrado, ...payload };
        clienteSalvo = { ...clienteEncontrado, ...clienteSalvo, ...payload, id: clienteIdExistente };
      } else {
        let resposta;
        try {
          resposta = await api.post('/clientes', payload);
        } catch {
          resposta = await api.post('/api/clientes', payload);
        }
        clienteSalvo = resposta?.data?.cliente || resposta?.data;
        const clienteIdNovo = clienteSalvo?.id || clienteSalvo?.clienteId || clienteSalvo?.cliente_id;
        if (!clienteIdNovo) {
          throw new Error('Cliente cadastrado, mas a API não retornou o identificador para associá-lo à venda.');
        }
        clienteSalvo = { ...payload, ...clienteSalvo, id: clienteIdNovo };
      }

      const idSalvo = clienteSalvo.id || clienteSalvo.clienteId || clienteSalvo.cliente_id;
      setClientes((listaAtual) => [
        clienteSalvo,
        ...listaAtual.filter((cliente) => Number(cliente.id || cliente.clienteId || cliente.cliente_id) !== Number(idSalvo)),
      ]);
      setClienteId(String(idSalvo));
      setModalClienteAberto(false);
    } catch (err) {
      setErroCliente(err.response?.data?.message || err.message || 'Não foi possível salvar o cliente.');
    } finally {
      setSalvandoCliente(false);
    }
  };

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

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [respostaLojas, respostaColaboradores, respostaClientes] = await Promise.all([
          api.get('/estabelecimentos').catch(() => api.get('/api/estabelecimentos')),
          api.get('/colaboradores').catch(() => api.get('/api/colaboradores')),
          api.get('/clientes').catch(() => api.get('/api/clientes')),
        ]);
        const [respostaEstoque, respostaMovimentacoes] = await Promise.allSettled([
          api.get('/estoque').catch(() => api.get('/api/estoque')),
          api.get('/movimentacoes').catch(() => api.get('/api/movimentacoes')),
        ]);

        const lojasCarregadas = listarDados(respostaLojas);
        const colaboradoresCarregados = listarDados(respostaColaboradores);
        const clientesCarregados = listarDados(respostaClientes);
        const matriz = identificarMatriz(lojasCarregadas);

        if (lojasCarregadas.length) {
          setLojas(lojasCarregadas);
          if (!lojaSelecionada) {
            const lojaPadrao = tipoMovimentacao === 'VENDA' ? matriz : lojasCarregadas[0];
            if (lojaPadrao) setLojaSelecionada(String(idDaLoja(lojaPadrao)));
          }
          if (!lojaOrigemId) setLojaOrigemId(String(idDaLoja(lojasCarregadas[0])));
          if (!lojaDestinoId) setLojaDestinoId(String(idDaLoja(lojasCarregadas[1] || lojasCarregadas[0])));
        }

        setEstoqueApi(respostaEstoque.status === 'fulfilled' ? listarDados(respostaEstoque.value) : null);
        setMovimentacoesEstoque(respostaMovimentacoes.status === 'fulfilled' ? listarDados(respostaMovimentacoes.value) : null);
        setEstoqueCarregado(respostaEstoque.status === 'fulfilled' || respostaMovimentacoes.status === 'fulfilled');

        if (colaboradoresCarregados.length) {
          setColaboradores(colaboradoresCarregados);
          if (!colaboradorId) {
            setColaboradorId(String(colaboradoresCarregados[0].id));
          }
        }

        if (clientesCarregados.length) {
          setClientes(clientesCarregados);
          if (!clienteId && tipoMovimentacao === 'COMPRA') {
            setClienteId(String(clientesCarregados[0].id));
          }
        }
      } catch {
        // Mantém valores padrão caso a API não esteja disponível.
      }
    };

    buscarProdutos('');
    carregarDados();
  }, []);

  useEffect(() => {
    buscarProdutos(produtoBusca);
  }, [produtoBusca]);

  const valorTotal = useMemo(() => {
    return itens.reduce((total, item) => {
      const produto = produtos.find((produtoAtual) => produtoAtual.id === Number(item.produtoId));
      return total + (Number(produto?.precoVenda || 0) * Number(item.quantidade || 0));
    }, 0);
  }, [itens, produtos]);

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
      setItens((prev) =>
        prev.map((item) =>
          item.produtoId === produtoId
            ? { ...item, quantidade: Number(item.quantidade || 0) + 1 }
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
          valorUnitario: Number(produtoEncontrado.precoVenda || 0),
          desconto: 0,
          subtotal: Number(produtoEncontrado.precoVenda || 0),
        },
      ]);
    }

    setProdutoBusca('');
  };

  const alterarQuantidade = (produtoId, quantidade) => {
    const valor = Number(quantidade || 0);

    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;

        const produto = produtos.find((produtoAtual) => produtoAtual.id === Number(produtoId));
        const unitario = Number(produto?.precoVenda || 0);
        const subtotal = valor * unitario;

        return {
          ...item,
          quantidade: valor,
          valorUnitario: unitario,
          subtotal,
        };
      })
    );
  };

  const removerProduto = (produtoId) => {
    setItens((prev) => prev.filter((item) => item.produtoId !== produtoId));
  };

  const limparFormulario = () => {
    setDirecao(direcaoInicial);
    setTipoMovimentacao(tipoInicial);
    setItens([]);
    setProdutoBusca('');
    setMotivo('');
    setObservacao('');
    setDataMovimentacao(dataLocalHoje());
    setLojaSelecionada(venda ? String(idDaLoja(lojaMatriz) || '') : lojas[0] ? String(idDaLoja(lojas[0])) : '');
    setLojaOrigemId(lojas[0] ? String(idDaLoja(lojas[0])) : '');
    setLojaDestinoId(lojas[1] ? String(idDaLoja(lojas[1])) : lojas[0] ? String(idDaLoja(lojas[0])) : '');
    setColaboradorId(colaboradores[0] ? String(colaboradores[0].id) : '');
    setClienteId(clientes[0] ? String(clientes[0].id) : '');
    setFormaPagamento('DINHEIRO');
    setStatus('PENDENTE');
    setNotice('');
    setDistribuicaoVenda(null);
    setQuantidadesOutrasLojas({});
    setErroDistribuicao('');
  };

  const criarPayload = (itensDaOrigem, lojaOrigemVenda = null) => {
    const colaboradorSelecionado = colaboradores.find((colaborador) => Number(colaborador.id) === Number(colaboradorId));
    const clienteSelecionado = clientes.find((cliente) => Number(cliente.id || cliente.clienteId || cliente.cliente_id) === Number(clienteId));
    const lojaAtual = lojas.find((loja) => Number(idDaLoja(loja)) === Number(lojaSelecionada));
    const lojaOrigem = lojas.find((loja) => Number(idDaLoja(loja)) === Number(lojaOrigemId));
    const lojaDestino = lojas.find((loja) => Number(idDaLoja(loja)) === Number(lojaDestinoId));
    const origemVenda = lojaOrigemVenda || lojaMatriz;

    return {
      id: Date.now() + Math.floor(Math.random() * 100000),
      dataHora: dataMovimentacao ? new Date(`${dataMovimentacao}T00:00:00`).toISOString() : new Date().toISOString(),
      tipoMovimentacao,
      status: 'PENDENTE',
      formaPagamento: tipoMovimentacao === 'COMPRA' ? formaPagamento : 'NAO_APLICAVEL',
      observacao,
      valorTotal: Number(itensDaOrigem.reduce((total, item) => total + Number(item.subtotal || 0), 0).toFixed(2)),
      colaboradorId: Number(colaboradorId || colaboradorSelecionado?.id || 1),
      colaboradorNome: colaboradorSelecionado?.nome || 'Usuário atual',
      estabelecimentoOrigemId: transferencia
        ? Number(lojaOrigemId)
        : venda
          ? Number(idDaLoja(origemVenda))
          : direcao === 'SAIDA'
            ? Number(lojaSelecionada || idDaLoja(lojaAtual) || 1)
            : 1,
      estabelecimentoOrigemNome: transferencia
        ? (nomeDaLoja(lojaOrigem) || 'Loja de origem')
        : venda
          ? nomeDaLoja(origemVenda)
          : direcao === 'SAIDA'
            ? (lojaAtual?.nome || lojaAtual?.titulo || 'Loja atual')
            : 'Estoque principal',
      estabelecimentoDestinoId: transferencia
        ? Number(lojaDestinoId)
        : direcao === 'ENTRADA'
          ? Number(lojaSelecionada || idDaLoja(lojaAtual) || 1)
          : 1,
      estabelecimentoDestinoNome: transferencia
        ? (nomeDaLoja(lojaDestino) || 'Loja de destino')
        : direcao === 'ENTRADA'
          ? (lojaAtual?.nome || lojaAtual?.titulo || 'Loja atual')
          : 'Estoque principal',
      clienteId: ['COMPRA', 'VENDA'].includes(tipoMovimentacao) && (clienteId || clienteSelecionado?.id || clienteSelecionado?.clienteId || clienteSelecionado?.cliente_id)
        ? Number(clienteId || clienteSelecionado?.id || clienteSelecionado?.clienteId || clienteSelecionado?.cliente_id)
        : null,
      clienteNome: ['COMPRA', 'VENDA'].includes(tipoMovimentacao) ? (clienteSelecionado?.nome || '') : '',
      fornecedorId: null,
      fornecedorNome: '',
      itens: itensDaOrigem.map((item) => ({
        id: Date.now() + Math.floor(Math.random() * 100000),
        produtoId: Number(item.produtoId),
        produtoNome: item.produtoNome,
        quantidade: Number(item.quantidade || 0),
        valorUnitario: Number(item.valorUnitario || 0),
        desconto: Number(item.desconto || 0),
        subtotal: Number(item.subtotal || 0),
      })),
    };
  };

  const salvarPayloads = async (payloads) => {
    setLoading(true);
    let salvos = 0;
    try {
      for (const payload of payloads) {
        await api.post('/movimentacoes', payload).catch(() => api.post('/api/movimentacoes', payload));
        salvos += 1;
      }

      setNotice('Registro salvo com sucesso.');
      setItens([]);
      setMotivo('');
      setObservacao('');
      setDataMovimentacao(dataLocalHoje());
      setLojaSelecionada(venda ? String(idDaLoja(lojaMatriz) || '') : '');
      setProdutoBusca('');
      setStatus('PENDENTE');
      setFormaPagamento('DINHEIRO');
      setDistribuicaoVenda(null);
      setQuantidadesOutrasLojas({});
    } catch (err) {
      setNotice(salvos > 0
        ? `Venda parcialmente registrada (${salvos} de ${payloads.length} origens). Verifique o histórico antes de tentar novamente.`
        : err.response?.data?.message || err.message || 'Erro ao registrar movimentação.');
      if (salvos > 0) setItens([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirDistribuicaoVenda = () => {
    setNotice('');
    if (!lojaMatriz) {
      setNotice('Não foi possível identificar a matriz. Confira o nome do estabelecimento cadastrado.');
      return;
    }
    if (!estoqueCarregado) {
      setNotice('Não foi possível consultar o estoque das lojas. Tente novamente mais tarde.');
      return;
    }

    const faltas = itens.map((item) => {
      const disponivelMatriz = obterSaldo(item.produtoId, idDaLoja(lojaMatriz));
      const quantidadeDesejada = Number(item.quantidade || 0);
      return {
        ...item,
        quantidadeDesejada,
        disponivelMatriz,
        faltante: Math.max(0, quantidadeDesejada - disponivelMatriz),
        saldosLojas: lojas
          .filter((loja) => Number(idDaLoja(loja)) !== Number(idDaLoja(lojaMatriz)))
          .map((loja) => ({ loja, disponivel: obterSaldo(item.produtoId, idDaLoja(loja)) })),
      };
    }).filter((item) => item.faltante > 0);

    if (faltas.length === 0) {
      void salvarPayloads([criarPayload(itens, lojaMatriz)]);
      return;
    }

    setDistribuicaoVenda(faltas);
    setQuantidadesOutrasLojas(Object.fromEntries(faltas.map((item) => [item.produtoId, {}])));
    setErroDistribuicao('');
  };

  const alterarQuantidadeOrigem = (produtoId, lojaId, valor, saldoMaximo, faltante) => {
    setQuantidadesOutrasLojas((atuais) => {
      const produtoAtual = atuais[produtoId] || {};
      const totalOutrasLojas = Object.entries(produtoAtual)
        .filter(([id]) => Number(id) !== Number(lojaId))
        .reduce((total, [, quantidade]) => total + Number(quantidade || 0), 0);
      const maximoPermitido = Math.max(0, Math.min(saldoMaximo, faltante - totalOutrasLojas));
      const quantidade = valor === '' ? 0 : Math.max(0, Math.min(Number(valor) || 0, maximoPermitido));

      return { ...atuais, [produtoId]: { ...produtoAtual, [lojaId]: quantidade } };
    });
  };

  const confirmarDistribuicaoVenda = async () => {
    const distribuicaoInvalida = distribuicaoVenda?.some((item) => {
      const alocacoes = quantidadesOutrasLojas[item.produtoId] || {};
      const totalAlocado = Object.values(alocacoes).reduce((total, quantidade) => total + Number(quantidade || 0), 0);
      return totalAlocado !== item.faltante || item.saldosLojas.some(({ loja, disponivel }) => (
        Number(alocacoes[idDaLoja(loja)] || 0) > disponivel
      ));
    });

    if (distribuicaoInvalida) {
      setErroDistribuicao('Distribua exatamente a quantidade que falta, respeitando o saldo de cada loja.');
      return;
    }

    const grupos = new Map();
    const adicionarAoGrupo = (loja, item, quantidade) => {
      if (!quantidade) return;
      const lojaId = String(idDaLoja(loja));
      if (!grupos.has(lojaId)) grupos.set(lojaId, { loja, itens: [] });
      const proporcao = quantidade / Number(item.quantidade || 1);
      grupos.get(lojaId).itens.push({
        ...item,
        quantidade,
        subtotal: Number((Number(item.subtotal || 0) * proporcao).toFixed(2)),
        desconto: Number((Number(item.desconto || 0) * proporcao).toFixed(2)),
      });
    };

    itens.forEach((item) => {
      const saldoMatriz = obterSaldo(item.produtoId, idDaLoja(lojaMatriz));
      const quantidadeMatriz = Math.min(Number(item.quantidade || 0), saldoMatriz);
      adicionarAoGrupo(lojaMatriz, item, quantidadeMatriz);

      const alocacoes = quantidadesOutrasLojas[item.produtoId] || {};
      Object.entries(alocacoes).forEach(([lojaId, quantidade]) => {
        const loja = lojas.find((itemLoja) => Number(idDaLoja(itemLoja)) === Number(lojaId));
        adicionarAoGrupo(loja, item, Number(quantidade || 0));
      });
    });

    setDistribuicaoVenda(null);
    setErroDistribuicao('');
    await salvarPayloads(Array.from(grupos.values()).map(({ loja, itens: itensDaLoja }) => criarPayload(itensDaLoja, loja)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice('');

    if (transferencia && (!lojaOrigemId || !lojaDestinoId || lojaOrigemId === lojaDestinoId)) {
      setNotice('Selecione duas lojas diferentes para realizar a transferência.');
      return;
    }

    if (venda) {
      abrirDistribuicaoVenda();
      return;
    }

    await salvarPayloads([criarPayload(itens)]);
  };

  return (
    <div className="superficie superficie-formulario">
      <form onSubmit={handleSubmit} className="form-movimentacao">
        <div className="acoes-movimentacao topo-acoes">
          <button type="button" className="btn-limpar" onClick={limparFormulario}>
            Limpar campos
          </button>
        </div>

        <div className="movimentacao-grid duas-colunas">
          <div className="campo">
            <label>Tipo de movimentação</label>
            <input value={tipoLabel} readOnly />
          </div>

          <div className="campo">
            <label>Colaborador</label>
            <select value={colaboradorId} onChange={(event) => setColaboradorId(event.target.value)}>
              <option value="">Selecione o colaborador</option>
              {colaboradores.map((colaborador) => (
                <option key={colaborador.id} value={colaborador.id}>
                  {colaborador.nome || colaborador.titulo || `Colaborador ${colaborador.id}`}
                </option>
              ))}
            </select>
          </div>

          {['COMPRA', 'VENDA'].includes(tipoMovimentacao) && (
            <div className="campo">
              <label>Cliente</label>
              <select value={clienteId} onChange={(event) => setClienteId(event.target.value)}>
                <option value="">{venda ? 'Selecione ou cadastre um cliente' : 'Selecione o cliente'}</option>
                {clientes.map((cliente) => {
                  const id = cliente.id || cliente.clienteId || cliente.cliente_id;
                  return (
                  <option key={id} value={id}>
                    {cliente.nome || cliente.titulo || `Cliente ${id}`}
                  </option>
                  );
                })}
              </select>
              {venda && (
                <button type="button" className="btn-adicionar-cliente-venda" onClick={iniciarCadastroCliente}>
                  + Adicionar cliente
                </button>
              )}
            </div>
          )}
        </div>

        <div className="movimentacao-grid duas-colunas">
          {transferencia ? (
            <>
              <div className="campo">
                <label>Loja de origem</label>
                <select value={lojaOrigemId} onChange={(event) => setLojaOrigemId(event.target.value)}>
                  <option value="">Selecione a loja de origem</option>
                  {lojas.map((loja) => <option key={loja.id} value={loja.id}>{loja.nome || loja.titulo || `Loja ${loja.id}`}</option>)}
                </select>
              </div>
              <div className="campo">
                <label>Loja de destino</label>
                <select value={lojaDestinoId} onChange={(event) => setLojaDestinoId(event.target.value)}>
                  <option value="">Selecione a loja de destino</option>
                  {lojas.map((loja) => <option key={loja.id} value={loja.id}>{loja.nome || loja.titulo || `Loja ${loja.id}`}</option>)}
                </select>
              </div>
            </>
          ) : venda ? (
            <div className="campo">
              <label>Loja de origem</label>
              <input value={lojaMatriz ? `${nomeDaLoja(lojaMatriz)} (Matriz)` : 'Matriz não identificada'} readOnly />
            </div>
          ) : (
            <div className="campo">
              <label>Loja</label>
              <select value={lojaSelecionada} onChange={(event) => setLojaSelecionada(event.target.value)}>
                <option value="">Selecione a loja</option>
                {lojas.map((loja) => <option key={idDaLoja(loja)} value={idDaLoja(loja)}>{nomeDaLoja(loja)}</option>)}
              </select>
            </div>
          )}

          <div className="campo">
            <label>Data</label>
            <input
              type="date"
              value={dataMovimentacao}
              onChange={(event) => setDataMovimentacao(event.target.value)}
            />
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
              />

              {produtoBusca.trim() && produtosSugeridos.length > 0 && (
                <div className="lista-sugestoes-produtos" role="listbox" aria-label="Produtos sugeridos">
                  {produtosSugeridos.map((produto) => (
                    <button
                      key={produto.id}
                      type="button"
                      className="sugestao-produto"
                      onClick={() => {
                        setProdutoBusca(produto?.nome || '');
                        adicionarProduto(produto);
                      }}
                    >
                      <span>{produto.nome}</span>
                      <small>{produto.sku || produto.codigoBarras || 'Produto'}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {itens.length === 0 ? (
            <div className="lista-vazia">Nenhum produto selecionado</div>
          ) : (
            <div className="lista-itens">
              {itens.map((item) => (
                <div key={item.produtoId} className="item-movimentacao">
                  <span>{item.produtoNome}</span>
                  <input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(event) => alterarQuantidade(item.produtoId, event.target.value)}
                  />
                  <button type="button" className="btn-remover" onClick={() => removerProduto(item.produtoId)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="movimentacao-grid duas-colunas">
          <div className="campo">
            <label>Motivo</label>
            <input
              type="text"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ex.: Compra, Venda, Ajuste"
            />
          </div>

          {tipoMovimentacao === 'COMPRA' && (
            <div className="campo">
              <label>Forma de pagamento</label>
              <select value={formaPagamento} onChange={(event) => setFormaPagamento(event.target.value)}>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="CARTAO">Cartão</option>
                <option value="PIX">PIX</option>
                <option value="BOLETO">Boleto</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>
          )}
        </div>

        <div className="campo campo-observacao">
          <label>Observação</label>
          <textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            placeholder="Descreva detalhes da movimentação"
          />
        </div>

        <div className="movimentacao-grid duas-colunas">
          <div className="campo">
            <label>Status</label>
            <select value={status} disabled>
              <option value="PENDENTE">Pendente</option>
            </select>
          </div>

          <div className="campo">
            <label>&nbsp;</label>
            <div className="espaco-vazio" />
          </div>
        </div>

        {tipoMovimentacao === 'COMPRA' && (
          <div className="resumo-movimentacao">
            <strong>Total:</strong>
            <span>R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        )}

        {notice && <div className="aviso">{notice}</div>}

        <div className="acoes-movimentacao rodape-acoes">
          <button className="primario" type="submit" disabled={loading || itens.length === 0}>
            {loading ? 'Salvando...' : 'Salvar movimentação'}
          </button>
        </div>
      </form>

      {distribuicaoVenda && (
        <div className="camada-modal modal-distribuicao-venda" role="presentation">
          <section className="cartao-modal modal-estoque-venda" role="dialog" aria-modal="true" aria-labelledby="titulo-distribuicao-venda">
            <p className="titulo-pequeno">Estoque da matriz insuficiente</p>
            <h2 id="titulo-distribuicao-venda">Escolha de quais lojas retirar</h2>
            <p className="texto-modal-venda">A quantidade disponível na matriz será usada primeiro. Distribua apenas o que está faltando.</p>

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
                          type="number"
                          min="0"
                          max={disponivel}
                          step="1"
                          value={alocacoes[idDaLoja(loja)] || 0}
                          disabled={disponivel <= 0}
                          onChange={(event) => alterarQuantidadeOrigem(
                            item.produtoId,
                            idDaLoja(loja),
                            event.target.value,
                            disponivel,
                            item.faltante
                          )}
                          aria-label={`Quantidade de ${item.produtoNome} retirada de ${nomeDaLoja(loja)}`}
                        />
                      </label>
                    ))}

                    <div className="cobertura-venda">
                      <span>Quantidade distribuída</span>
                      <strong>{totalAlocado} / {item.faltante}</strong>
                      {totalDisponivel < item.faltante && <small>Estoque das demais lojas insuficiente para cobrir a falta.</small>}
                    </div>
                  </section>
                );
              })}
            </div>

            {erroDistribuicao && <div className="aviso erro-distribuicao-venda">{erroDistribuicao}</div>}

            <div className="acoes-distribuicao-venda">
              <button type="button" className="btn-cancelar" onClick={() => setDistribuicaoVenda(null)} disabled={loading}>
                Voltar à venda
              </button>
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
            <button
              type="button"
              className="fechar"
              aria-label="Fechar cadastro de cliente"
              onClick={() => setModalClienteAberto(false)}
              disabled={salvandoCliente}
            >
              ×
            </button>
            <p className="titulo-pequeno">Venda</p>
            <h2 id="titulo-cliente-venda">Adicionar cliente</h2>

            <form onSubmit={salvarClienteDaVenda} className="form-cliente-venda">
              <div className="grade-cliente-venda">
                <label className="campo-cpf-cliente-venda">
                  CPF
                  <span className="linha-busca-cpf-venda">
                    <input
                      autoFocus
                      type="text"
                      name="documento"
                      value={clienteForm.documento}
                      onChange={alterarCampoCliente}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && estadoBuscaCliente !== 'novo' && estadoBuscaCliente !== 'encontrado') {
                          event.preventDefault();
                          buscarClientePorDocumento();
                        }
                      }}
                      placeholder="Digite o CPF"
                      inputMode="numeric"
                      required
                    />
                    <button
                      type="button"
                      className="btn-buscar-cliente-venda"
                      onClick={buscarClientePorDocumento}
                      disabled={buscandoCliente || documentoNormalizado(clienteForm.documento).length !== 11}
                      title="Consultar cliente pelo CPF"
                    >
                      {buscandoCliente ? 'Consultando...' : 'Consultar'}
                    </button>
                  </span>
                </label>

                {estadoBuscaCliente === 'novo' && <p className="resultado-busca-cliente-venda">CPF não cadastrado. Preencha os dados para cadastrar.</p>}
                {estadoBuscaCliente === 'encontrado' && <p className="resultado-busca-cliente-venda">Cliente localizado. Revise ou altere os dados antes de salvar.</p>}

                {Object.entries({
                  ie: 'IE',
                  nome: 'Nome',
                  telefone1: 'Telefone 1',
                  telefone2: 'Telefone 2',
                  email: 'E-mail',
                  observacao: 'Observação',
                  cep: 'CEP',
                  logradouro: 'Logradouro',
                  numero: 'Número',
                  complemento: 'Complemento',
                  bairro: 'Bairro',
                  cidade: 'Cidade',
                  estado: 'Estado',
                }).map(([name, label]) => (
                  <label key={name} className={name === 'observacao' ? 'campo-largo-cliente-venda' : ''}>
                    {label}
                    {name === 'observacao' ? (
                      <textarea
                        name={name}
                        value={clienteForm[name]}
                        onChange={alterarCampoCliente}
                        rows={3}
                        disabled={estadoBuscaCliente !== 'novo' && estadoBuscaCliente !== 'encontrado'}
                      />
                    ) : (
                      <input
                        type={name === 'email' ? 'email' : 'text'}
                        name={name}
                        value={clienteForm[name]}
                        onChange={alterarCampoCliente}
                        onBlur={name === 'cep' ? () => buscarEnderecoClientePorCep(clienteForm.cep) : undefined}
                        inputMode={name === 'numero' ? 'numeric' : undefined}
                        required={['nome', 'telefone1', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado'].includes(name)}
                        disabled={estadoBuscaCliente !== 'novo' && estadoBuscaCliente !== 'encontrado'}
                      />
                    )}
                    {name === 'cep' && buscandoCepCliente && <small>Buscando endereço...</small>}
                  </label>
                ))}
              </div>

              {erroCliente && <p className="erro erro-cliente-venda">{erroCliente}</p>}

              <div className="acoes-cliente-venda">
                <button type="button" className="btn-cancelar" onClick={() => setModalClienteAberto(false)} disabled={salvandoCliente}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primario"
                  disabled={salvandoCliente || buscandoCliente || (estadoBuscaCliente !== 'novo' && estadoBuscaCliente !== 'encontrado')}
                >
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
