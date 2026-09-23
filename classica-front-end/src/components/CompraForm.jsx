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

export default function CompraForm() {
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [itens, setItens] = useState([]);
  const [produtoBusca, setProdutoBusca] = useState('');
  const [observacao, setObservacao] = useState('');
  const [lojaDestinoId, setLojaDestinoId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [estoqueDestino, setEstoqueDestino] = useState({});
  const [carregandoEstoque, setCarregandoEstoque] = useState(false);
  const [carregandoProdutos, setCarregandoProdutos] = useState(false);

  const dataAtual = useMemo(() => new Date().toLocaleDateString('pt-BR'), []);

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

  const buscarFornecedores = async () => {
    try {
      const resposta = await api.get('/fornecedores').catch(() => api.get('/api/fornecedores'));
      setFornecedores(listarDados(resposta));
    } catch {
      setFornecedores([]);
    }
  };

  const buscarLojas = async () => {
    try {
      const resposta = await api.get('/estabelecimentos').catch(() => api.get('/api/estabelecimentos'));
      const lojasCarregadas = listarDados(resposta);
      setLojas(lojasCarregadas);
      if (lojasCarregadas.length && !lojaDestinoId) {
        setLojaDestinoId(String(lojasCarregadas[0].id));
      }
    } catch {
      setLojas([]);
    }
  };

  const buscarProdutosDoFornecedor = async (idFornecedor) => {
    if (!idFornecedor) {
      setProdutos([]);
      setProdutosFiltrados([]);
      return;
    }
    setCarregandoProdutos(true);
    try {
      const resposta = await api.get(`/api/produtos/fornecedor/${idFornecedor}`).catch(() => api.get(`/produtos/fornecedor/${idFornecedor}`));
      const lista = listarDados(resposta);
      setProdutos(lista);
      setProdutosFiltrados(lista);
    } catch {
      setProdutos([]);
      setProdutosFiltrados([]);
    } finally {
      setCarregandoProdutos(false);
    }
  };

  const buscarEstoqueLoja = async (estabelecimentoId) => {
    if (!estabelecimentoId) {
      setEstoqueDestino({});
      return;
    }
    setCarregandoEstoque(true);
    try {
      const resposta = await api.get(`/estoque/${estabelecimentoId}`).catch(() => api.get(`/api/estoque/${estabelecimentoId}`));
      const dados = listarDados(resposta);
      const mapa = {};
      dados.forEach((item) => {
        const produtoId = item.produtoId || item.produto_id || item.fkProduto || item.fk_produto || item.id;
        const quantidade = item.quantidade || item.saldo || item.estoqueAtual || item.qtd || 0;
        if (produtoId) mapa[Number(produtoId)] = Number(quantidade);
      });
      setEstoqueDestino(mapa);
    } catch {
      setEstoqueDestino({});
    } finally {
      setCarregandoEstoque(false);
    }
  };

  useEffect(() => {
    buscarFornecedores();
    buscarLojas();
  }, []);

  useEffect(() => {
    if (fornecedorId) {
      buscarProdutosDoFornecedor(fornecedorId);
    } else {
      setProdutos([]);
      setProdutosFiltrados([]);
    }
  }, [fornecedorId]);

  useEffect(() => {
    buscarProdutosDoFornecedor(fornecedorId);
  }, [produtoBusca]);

  useEffect(() => {
    if (lojaDestinoId) {
      buscarEstoqueLoja(lojaDestinoId);
    }
  }, [lojaDestinoId]);

  const obterSaldoDisponivel = (produtoId) => {
    return estoqueDestino[Number(produtoId)] || 0;
  };

  const valorTotal = useMemo(() => {
    return itens.reduce((total, item) => {
      return total + (Number(item.valorUnitario || 0) * Number(item.quantidade || 0)) - Number(item.desconto || 0);
    }, 0);
  }, [itens]);

  const quantidadeTotal = useMemo(() => {
    return itens.reduce((total, item) => total + Number(item.quantidade || 0), 0);
  }, [itens]);

  const adicionarProduto = (produtoInformado = null) => {
    const candidatos = produtosFiltrados.length > 0 ? produtosFiltrados : produtos;
    const produtoEncontrado = produtoInformado || candidatos.find((produto) => {
      const nome = String(produto?.nome || '').toLowerCase();
      const busca = produtoBusca.trim().toLowerCase();
      return nome === busca || nome.includes(busca);
    });

    if (!produtoEncontrado) return;

    if (fornecedorId && Number(produtoEncontrado.fornecedorId) !== Number(fornecedorId)) {
      setNotice('Produto não pertence ao fornecedor selecionado.');
      return;
    }

    const produtoId = String(produtoEncontrado.id);
    const jaExiste = itens.find((item) => item.produtoId === produtoId);
    if (jaExiste) {
      setNotice('Produto já adicionado nesta compra.');
      return;
    }

    const saldo = obterSaldoDisponivel(produtoEncontrado.id);

    setItens((prev) => [
      ...prev,
      {
        produtoId,
        produtoNome: produtoEncontrado.nome,
        produtoSku: produtoEncontrado.sku || produtoEncontrado.codigoBarras || '',
        unidade: produtoEncontrado.unidadeMedida || produtoEncontrado.unidade_medida || 'UN',
        quantidade: 1,
        valorUnitario: Number(produtoEncontrado.precoCusto || produtoEncontrado.preco_custo || produtoEncontrado.precoVenda || produtoEncontrado.preco_venda || 0),
        desconto: 0,
        subtotal: Number(produtoEncontrado.precoCusto || produtoEncontrado.preco_custo || produtoEncontrado.precoVenda || produtoEncontrado.preco_venda || 0),
        saldoDisponivel: saldo,
      },
    ]);

    setProdutoBusca('');
    setNotice('');
  };

  const aoClicarSugestao = (produto) => {
    if (fornecedorId && Number(produto.fornecedorId) !== Number(fornecedorId)) {
      setNotice('Produto não pertence ao fornecedor selecionado.');
      return;
    }
    const jaExiste = itens.find((item) => item.produtoId === String(produto.id));
    if (jaExiste) {
      setNotice('Produto já adicionado nesta compra.');
      return;
    }
    setProdutoBusca(produto?.nome || '');
    adicionarProduto(produto);
  };

  const alterarQuantidade = (produtoId, quantidade) => {
    const valor = Number(quantidade);
    if (isNaN(valor) || valor <= 0) {
      setNotice('Quantidade deve ser maior que zero.');
      return;
    }
    const saldo = obterSaldoDisponivel(Number(produtoId));
    if (saldo > 0 && valor > saldo) {
      setNotice(`Quantidade excede o estoque disponível (${saldo}).`);
      return;
    }
    setNotice('');
    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;
        const subtotal = valor * Number(item.valorUnitario || 0) - Number(item.desconto || 0);
        return { ...item, quantidade: valor, subtotal };
      })
    );
  };

  const alterarValorUnitario = (produtoId, valorUnitario) => {
    const valor = Number(valorUnitario);
    if (isNaN(valor) || valor < 0) return;
    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;
        const subtotal = valor * Number(item.quantidade || 0) - Number(item.desconto || 0);
        return { ...item, valorUnitario: valor, subtotal };
      })
    );
  };

  const alterarDesconto = (produtoId, desconto) => {
    const valor = Number(desconto);
    if (isNaN(valor) || valor < 0) return;
    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;
        const subtotal = Number(item.valorUnitario || 0) * Number(item.quantidade || 0) - valor;
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
    setFornecedorId('');
    setLojaDestinoId(lojas[0] ? String(lojas[0].id) : '');
    setFormaPagamento('PIX');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice('');

    const colaboradorId = usuario?.colaborador?.id || usuario?.id || 1;

    if (!fornecedorId) {
      setNotice('Selecione o fornecedor.');
      setLoading(false);
      return;
    }
    if (!lojaDestinoId) {
      setNotice('Selecione a loja de destino.');
      setLoading(false);
      return;
    }
    if (itens.length === 0) {
      setNotice('Adicione pelo menos um produto à compra.');
      setLoading(false);
      return;
    }
    for (const item of itens) {
      if (Number(item.quantidade) <= 0) {
        setNotice('Quantidade deve ser maior que zero para todos os itens.');
        setLoading(false);
        return;
      }
    }

    const payload = {
      tipoMovimentacao: 'COMPRA',
      formaPagamento,
      observacao: observacao || 'Compra de mercadoria',
      estabelecimentoOrigemId: null,
      estabelecimentoDestinoId: Number(lojaDestinoId),
      clienteId: null,
      fornecedorId: Number(fornecedorId),
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
      setNotice('Compra registrada com sucesso (status: CONCLUÍDO).');
      setItens([]);
      setObservacao('');
      setProdutoBusca('');
      setFornecedorId('');
    } catch (err) {
      setNotice(err.response?.data?.message || err.message || 'Erro ao registrar compra.');
    } finally {
      setLoading(false);
    }
  };

  const lojaDestino = lojas.find((l) => String(l.id) === lojaDestinoId);
  const fornecedor = fornecedores.find((f) => String(f.id) === fornecedorId);
  const colaboradorNome = usuario?.colaborador?.nome || usuario?.nome || usuario?.login || 'Colaborador';

  return (
    <div className="superficie superficie-formulario">
      <form onSubmit={handleSubmit} className="form-movimentacao form-compra">
        <div className="acoes-movimentacao topo-acoes">
          <button type="button" className="btn-limpar" onClick={limparFormulario}>
            Limpar
          </button>
        </div>

        <div className="movimentacao-grid tres-colunas">
          <div className="campo">
            <label>Loja de destino *</label>
            <select value={lojaDestinoId} onChange={(e) => setLojaDestinoId(e.target.value)} required disabled={carregandoEstoque}>
              <option value="">Selecione a loja</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>{loja.nome || loja.titulo || `Loja ${loja.id}`}</option>
              ))}
            </select>
            {carregandoEstoque && <span className="loading-indicator">Carregando estoque...</span>}
            {lojaDestino && !carregandoEstoque && <span className="info-value">{lojaDestino.nome || lojaDestino.titulo}</span>}
          </div>

          <div className="campo">
            <label>Fornecedor *</label>
            <select value={fornecedorId} onChange={(e) => { setFornecedorId(e.target.value); setProdutoBusca(''); }} required disabled={carregandoProdutos}>
              <option value="">Selecione o fornecedor</option>
              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>{f.nome || f.razaoSocial || f.titulo || `Fornecedor ${f.id}`}</option>
              ))}
            </select>
            {carregandoProdutos && <span className="loading-indicator">Carregando produtos...</span>}
            {fornecedor && !carregandoProdutos && <span className="info-value">{fornecedor.nome || fornecedor.razaoSocial || fornecedor.titulo}</span>}
          </div>

          <div className="campo">
            <label>Forma de pagamento *</label>
            <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} required>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO">Cartão</option>
              <option value="PIX">PIX</option>
              <option value="BOLETO">Boleto</option>
              <option value="CREDITO">Crédito</option>
            </select>
          </div>
        </div>

        <div className="campo bloco-produtos">
          <label>Produtos do fornecedor</label>
          <div className="linha-selecao-produto">
            <div className="campo-busca-produto">
              <input
                value={produtoBusca}
                onChange={(event) => setProdutoBusca(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  event.preventDefault();
                  const candidatos = produtosSugeridos.length > 0 ? produtosSugeridos : produtosFiltrados.length > 0 ? produtosFiltrados : produtos;
                  const busca = produtoBusca.trim().toLowerCase();
                  const produtoCorreto = candidatos.find((produto) => {
                    const nome = String(produto?.nome || '').toLowerCase();
                    return nome === busca || nome.includes(busca);
                  });
                  if (produtoCorreto) { adicionarProduto(produtoCorreto); return; }
                  if (candidatos.length === 1) { adicionarProduto(candidatos[0]); }
                }}
                placeholder={fornecedorId ? "Digite o nome, SKU ou código de barras" : "Selecione um fornecedor primeiro"}
                disabled={!fornecedorId}
              />

              {produtoBusca.trim() && produtosSugeridos.length > 0 && (
                <div className="lista-sugestoes-produtos" role="listbox" aria-label="Produtos sugeridos">
                  {produtosSugeridos.map((produto) => (
                    <button
                      key={produto.id}
                      type="button"
                      className="sugestao-produto"
                      onClick={() => aoClicarSugestao(produto)}
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
            <div className="lista-vazia">{fornecedorId ? 'Nenhum produto selecionado' : 'Selecione um fornecedor para ver os produtos'}</div>
          ) : (
            <>
              <div className="tabela-itens-header">
                <div className="col-produto">Produto</div>
                <div className="col-qtd">Qtd</div>
                <div className="col-vl">Vl. Unit.</div>
                <div className="col-desc">Desc.</div>
                <div className="col-sub">Subtotal</div>
                <div className="col-saldo">Saldo</div>
                <div className="col-acoes"></div>
              </div>
              <div className="lista-itens">
                {itens.map((item) => {
                  const saldo = obterSaldoDisponivel(Number(item.produtoId));
                  return (
                    <div key={item.produtoId} className="item-movimentacao">
                      <div className="col-produto">
                        <span>{item.produtoNome}</span>
                        <small className="texto-secundario">{item.produtoSku} • {item.unidade}</small>
                      </div>
                      <div className="col-qtd">
                        <input
                          type="number"
                          min="1"
                          max={saldo > 0 ? saldo : undefined}
                          value={item.quantidade}
                          onChange={(event) => alterarQuantidade(item.produtoId, event.target.value)}
                          title={saldo > 0 ? `Máximo disponível: ${saldo}` : ''}
                        />
                      </div>
                      <div className="col-vl">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valorUnitario}
                          onChange={(event) => alterarValorUnitario(item.produtoId, event.target.value)}
                        />
                      </div>
                      <div className="col-desc">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.desconto}
                          onChange={(event) => alterarDesconto(item.produtoId, event.target.value)}
                        />
                      </div>
                      <div className="col-sub">
                        <strong>R$ {Number(item.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                      <div className="col-saldo">
                        {saldo > 0 ? <span className="texto-secundario">{saldo} {item.unidade}</span> : <span className="texto-secundario">—</span>}
                      </div>
                      <div className="col-acoes">
                        <button type="button" className="btn-remover" onClick={() => removerProduto(item.produtoId)} title="Remover">×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="campo campo-observacao">
          <label>Observação</label>
          <textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            placeholder="Detalhes da compra (opcional)"
            rows={2}
          />
        </div>

        <div className="resumo-compra">
          <div className="resumo-grid">
            <div className="resumo-item">
              <span className="resumo-label">Total de itens</span>
              <span className="resumo-valor">{itens.length}</span>
            </div>
            <div className="resumo-item">
              <span className="resumo-label">Quantidade total</span>
              <span className="resumo-valor">{quantidadeTotal}</span>
            </div>
            <div className="resumo-item">
              <span className="resumo-label">Valor total</span>
              <span className="resumo-valor destaque">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="resumo-item">
              <span className="resumo-label">Fornecedor</span>
              <span className="resumo-valor">{fornecedor?.nome || fornecedor?.razaoSocial || fornecedor?.titulo || '—'}</span>
            </div>
            <div className="resumo-item">
              <span className="resumo-label">Loja destino</span>
              <span className="resumo-valor">{lojaDestino?.nome || lojaDestino?.titulo || '—'}</span>
            </div>
            <div className="resumo-item">
              <span className="resumo-label">Responsável</span>
              <span className="resumo-valor">{colaboradorNome}</span>
            </div>
            <div className="resumo-item">
              <span className="resumo-label">Data</span>
              <span className="resumo-valor">{dataAtual}</span>
            </div>
          </div>
        </div>

        {notice && <div className="aviso">{notice}</div>}

        <div className="acoes-movimentacao rodape-acoes">
          <button className="primario" type="submit" disabled={loading || itens.length === 0 || !fornecedorId || !lojaDestinoId}>
            {loading ? 'Salvando...' : 'Salvar compra'}
          </button>
        </div>
      </form>
    </div>
  );
}