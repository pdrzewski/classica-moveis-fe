import { useEffect, useMemo, useState } from 'react';
import api from '../services/Api';
import { useAuth } from '../context/AuthContext';

const listarDados = (resposta) => {
  const dados = resposta?.data;
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

export default function VendaForm() {
  const { usuario } = useAuth();
  const colaboradorLogado = usuario?.colaborador;
  const estabelecimentoOrigemId = colaboradorLogado?.estabelecimentoId || colaboradorLogado?.fkEstabelecimento || colaboradorLogado?.estabelecimento_id;

  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [itens, setItens] = useState([]);
  const [produtoBusca, setProdutoBusca] = useState('');
  const [observacao, setObservacao] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [estoqueOrigem, setEstoqueOrigem] = useState({});
  const [carregandoEstoque, setCarregandoEstoque] = useState(false);

  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [clientesSugeridos, setClientesSugeridos] = useState([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);

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

  const buscarEstoqueOrigem = async (estabelecimentoId) => {
    if (!estabelecimentoId) {
      setEstoqueOrigem({});
      return;
    }
    setCarregandoEstoque(true);
    try {
      const resposta = await api.get(`/estoque/${estabelecimentoId}/produtos`).catch(() => api.get(`/api/estoque/${estabelecimentoId}/produtos`));
      const dados = listarDados(resposta);
      const mapaEstoque = {};
      dados.forEach((item) => {
        const produtoId = item.produtoId || item.id;
        const quantidade = item.saldoDisponivel || item.quantidade || item.saldo || item.estoqueAtual || item.qtd || 0;
        if (produtoId) {
          mapaEstoque[Number(produtoId)] = Number(quantidade);
        }
      });
      setEstoqueOrigem(mapaEstoque);
    } catch {
      setEstoqueOrigem({});
    } finally {
      setCarregandoEstoque(false);
    }
  };

  useEffect(() => {
    const carregarColaboradores = async () => {
      try {
        const resposta = await api.get('/colaboradores').catch(() => api.get('/api/colaboradores'));
        const colaboradoresCarregados = listarDados(resposta);
        setColaboradores(colaboradoresCarregados);
        if (!colaboradorId && colaboradoresCarregados.length) {
          const padrao = colaboradoresCarregados.find(c => String(c.id) === String(colaboradorLogado?.id)) || colaboradoresCarregados[0];
          setColaboradorId(String(padrao.id));
        }
      } catch {
        setColaboradores([]);
      }
    };

    buscarProdutos('');
    carregarColaboradores();
    if (estabelecimentoOrigemId) {
      buscarEstoqueOrigem(estabelecimentoOrigemId);
    }
  }, []);

  useEffect(() => {
    buscarProdutos(produtoBusca);
  }, [produtoBusca]);

  useEffect(() => {
    if (estabelecimentoOrigemId) {
      buscarEstoqueOrigem(estabelecimentoOrigemId);
    }
  }, [estabelecimentoOrigemId]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      buscarClientes(clienteBusca);
    }, 300);
    return () => clearTimeout(timeout);
  }, [clienteBusca]);

  const obterSaldoDisponivel = (produtoId) => {
    return estoqueOrigem[Number(produtoId)] || 0;
  };

  const selecionarCliente = (cliente) => {
    setClienteSelecionado(cliente);
    setClienteBusca(cliente.nome);
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
    const saldoDisponivel = obterSaldoDisponivel(produtoEncontrado.id);

    if (saldoDisponivel <= 0) {
      setNotice(`Produto "${produtoEncontrado.nome}" não possui estoque disponível na loja de origem.`);
      return;
    }

    const produtoJaAdicionado = itens.find((item) => item.produtoId === produtoId);

    if (produtoJaAdicionado) {
      const novaQuantidade = Number(produtoJaAdicionado.quantidade || 0) + 1;
      if (novaQuantidade > saldoDisponivel) {
        setNotice(`Quantidade excede o estoque disponível (${saldoDisponivel}) para "${produtoEncontrado.nome}".`);
        return;
      }
      setItens((prev) =>
        prev.map((item) =>
          item.produtoId === produtoId
            ? { ...item, quantidade: novaQuantidade }
            : item
        )
      );
    } else {
      if (1 > saldoDisponivel) {
        setNotice(`Quantidade excede o estoque disponível (${saldoDisponivel}) para "${produtoEncontrado.nome}".`);
        return;
      }
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
    const saldo = obterSaldoDisponivel(produto.id);
    if (saldo <= 0) {
      setNotice(`Produto "${produto.nome}" não possui estoque disponível na loja de origem.`);
      return;
    }
    setProdutoBusca(produto?.nome || '');
    adicionarProduto(produto);
  };

  const alterarQuantidade = (produtoId, quantidade) => {
    const valor = Number(quantidade || 0);
    const saldoDisponivel = obterSaldoDisponivel(Number(produtoId));
    const produto = produtos.find((p) => Number(p.id) === Number(produtoId));

    if (valor > saldoDisponivel) {
      setNotice(`Quantidade excede o estoque disponível (${saldoDisponivel}) para "${produto?.nome || 'produto'}".`);
      return;
    }

    if (valor <= 0) {
      setNotice('A quantidade deve ser maior que zero.');
      return;
    }

    setNotice('');
    const unitario = Number(produto?.precoVenda || produto?.preco_venda || 0);
    const subtotal = valor * unitario;

    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;
        return {
          ...item,
          quantidade: valor,
          valorUnitario: unitario,
          subtotal,
        };
      })
    );
  };

  const alterarValorUnitario = (produtoId, valorUnitario) => {
    const valor = Number(valorUnitario || 0);
    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;
        const subtotal = valor * Number(item.quantidade || 0) - Number(item.desconto || 0);
        return { ...item, valorUnitario: valor, subtotal };
      })
    );
  };

  const alterarDesconto = (produtoId, desconto) => {
    const valor = Number(desconto || 0);
    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;
        const subtotal = (Number(item.valorUnitario || 0) * Number(item.quantidade || 0)) - valor;
        return { ...item, desconto: valor, subtotal };
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
    setFormaPagamento('PIX');
    setNotice('');
  };

  const validarFormulario = () => {
    if (!estabelecimentoOrigemId) {
      setNotice('Colaborador não possui loja de origem vinculada.');
      return false;
    }
    if (!clienteSelecionado) {
      setNotice('Selecione o cliente.');
      return false;
    }
    if (!colaboradorId) {
      setNotice('Selecione o colaborador.');
      return false;
    }
    if (!formaPagamento) {
      setNotice('Selecione a forma de pagamento.');
      return false;
    }
    if (itens.length === 0) {
      setNotice('Adicione pelo menos um produto à venda.');
      return false;
    }
    for (const item of itens) {
      const saldoDisponivel = obterSaldoDisponivel(Number(item.produtoId));
      if (Number(item.quantidade) > saldoDisponivel) {
        const produto = produtos.find((p) => Number(p.id) === Number(item.produtoId));
        setNotice(`Quantidade de "${produto?.nome || 'produto'}" excede o estoque disponível (${saldoDisponivel}).`);
        return false;
      }
      if (Number(item.quantidade) <= 0) {
        const produto = produtos.find((p) => Number(p.id) === Number(item.produtoId));
        setNotice(`Quantidade inválida para "${produto?.nome || 'produto'}".`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice('');

    if (!validarFormulario()) {
      setLoading(false);
      return;
    }

    const payload = {
      tipoMovimentacao: 'VENDA',
      formaPagamento,
      observacao: observacao || 'Venda de produto',
      estabelecimentoOrigemId: Number(estabelecimentoOrigemId),
      estabelecimentoDestinoId: null,
      clienteId: Number(clienteSelecionado.id),
      fornecedorId: null,
      colaboradorId: Number(colaboradorId),
      itens: itens.map((item) => ({
        produtoId: Number(item.produtoId),
        quantidade: Number(item.quantidade || 0),
        valorUnitario: Number(item.valorUnitario || 0),
        desconto: Number(item.desconto || 0),
      })),
    };

    try {
      await api.post('/movimentacoes', payload).catch(() => api.post('/api/movimentacoes', payload));
      setNotice('Venda registrada com sucesso.');
      setItens([]);
      setObservacao('');
      setProdutoBusca('');
    } catch (err) {
      setNotice(err.response?.data?.message || err.message || 'Erro ao registrar venda.');
    } finally {
      setLoading(false);
    }
  };

  const valorTotal = useMemo(() => {
    return itens.reduce((total, item) => {
      return total + (Number(item.valorUnitario || 0) * Number(item.quantidade || 0)) - Number(item.desconto || 0);
    }, 0);
  }, [itens]);

  const quantidadeTotal = useMemo(() => {
    return itens.reduce((total, item) => total + Number(item.quantidade || 0), 0);
  }, [itens]);

  const lojaOrigemNome = colaboradorLogado?.estabelecimento?.nome || colaboradorLogado?.loja?.nome || 'Loja não identificada';

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
            Nova venda
          </button>
        </div>

        <div className="venda-header-grid">
          <div className="campo cliente-campo">
            <label>Cliente *</label>
            <div className="busca-wrapper">
              <input
                type="text"
                value={clienteBusca}
                onChange={(e) => setClienteBusca(e.target.value)}
                onFocus={() => clienteBusca && buscarClientes(clienteBusca)}
                placeholder={clienteSelecionado ? 'Cliente selecionado' : 'Digite o nome do cliente (mín. 2 letras)'}
                disabled={buscandoClientes}
                autoComplete="off"
              />
              {buscandoClientes && <span className="spinner" />}
              {clienteSelecionado && (
                <button type="button" className="btn-limpar-cliente" onClick={limparCliente} title="Remover cliente">
                  ×
                </button>
              )}
            </div>
            {clientesSugeridos.length > 0 && (
              <div className="lista-sugestoes-clientes" role="listbox" aria-label="Clientes sugeridos">
                {clientesSugeridos.map((cliente) => (
                  <button
                    key={cliente.id}
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
          </div>

          <div className="campo">
            <label>Colaborador *</label>
            <select value={colaboradorId} onChange={(e) => setColaboradorId(e.target.value)} required>
              <option value="">Selecione o colaborador</option>
              {colaboradores.map((colaborador) => (
                <option key={colaborador.id} value={colaborador.id}>
                  {colaborador.nome || colaborador.titulo || `Colaborador ${colaborador.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label>Forma de pagamento *</label>
            <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} required>
              <option value="PIX">PIX</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO">Cartão</option>
              <option value="BOLETO">Boleto</option>
              <option value="CREDITO">Crédito</option>
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
                          {saldo > 0 ? ` | Estoque: ${saldo}` : ' | Sem estoque'}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {itens.length === 0 ? (
            <div className="lista-vazia">Nenhum produto adicionado. Use a busca acima para adicionar itens.</div>
          ) : (
            <div className="tabela-itens">
              <div className="tabela-header">
                <div className="col-produto">Produto</div>
                <div className="col-qtd">Qtd</div>
                <div className="col-vl">Vl. Unit.</div>
                <div className="col-desc">Desc.</div>
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
                          Estoque na origem: {saldo} {produto?.unidadeMedida || produto?.unidade_medida || 'UN'}
                        </small>
                      </div>
                      <div className="col-qtd">
                        <input
                          type="number"
                          min="1"
                          max={saldo}
                          value={String(item.quantidade)}
                          onChange={(event) => alterarQuantidade(item.produtoId, event.target.value)}
                          title={`Máximo disponível: ${saldo}`}
                        />
                      </div>
                      <div className="col-vl">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={String(item.valorUnitario)}
                          onChange={(event) => alterarValorUnitario(item.produtoId, event.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="col-desc">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={String(item.desconto)}
                          onChange={(event) => alterarDesconto(item.produtoId, event.target.value)}
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
          )}
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

        {notice && <div className="aviso">{notice}</div>}

        <div className="acoes-movimentacao rodape-acoes">
          <button className="primario" type="submit" disabled={loading || itens.length === 0 || !clienteSelecionado || !colaboradorId || !estabelecimentoOrigemId}>
            {loading ? 'Finalizando...' : 'Finalizar venda'}
          </button>
        </div>
      </form>
    </div>
  );
}