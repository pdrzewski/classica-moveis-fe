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

export default function TransferenciaForm() {
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [itens, setItens] = useState([]);
  const [produtoBusca, setProdutoBusca] = useState('');
  const [observacao, setObservacao] = useState('');
  const [lojaOrigemId, setLojaOrigemId] = useState('');
  const [lojaDestinoId, setLojaDestinoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [estoqueOrigem, setEstoqueOrigem] = useState({});
  const [carregandoEstoque, setCarregandoEstoque] = useState(false);

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
    const carregarDados = async () => {
      try {
        const respostaLojas = await api.get('/estabelecimentos').catch(() => api.get('/api/estabelecimentos'));
        const lojasCarregadas = listarDados(respostaLojas);

        if (lojasCarregadas.length) {
          setLojas(lojasCarregadas);
          if (!lojaOrigemId) setLojaOrigemId(String(lojasCarregadas[0].id));
          if (!lojaDestinoId) setLojaDestinoId(String(lojasCarregadas[1]?.id || lojasCarregadas[0].id));
        }
      } catch {
      }
    };

    buscarProdutos('');
    carregarDados();
  }, []);

  useEffect(() => {
    buscarProdutos(produtoBusca);
  }, [produtoBusca]);

  useEffect(() => {
    if (lojaOrigemId) {
      buscarEstoqueOrigem(lojaOrigemId);
    }
  }, [lojaOrigemId]);

  const obterSaldoDisponivel = (produtoId) => {
    return estoqueOrigem[Number(produtoId)] || 0;
  };

  const valorTotal = useMemo(() => {
    return 0;
  }, []);

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
    } else if (valor <= 0) {
      setNotice('A quantidade deve ser maior que zero.');
    } else {
      setNotice('');
    }

    setItens((prev) =>
      prev.map((item) => {
        if (item.produtoId !== produtoId) return item;
        return {
          ...item,
          quantidade: valor,
          subtotal: 0,
        };
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
    setLojaOrigemId(lojas[0] ? String(lojas[0].id) : '');
    setLojaDestinoId(lojas[1] ? String(lojas[1].id) : lojas[0] ? String(lojas[0].id) : '');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice('');

    const colaboradorId = usuario?.colaborador?.id || usuario?.id || 1;

    if (!lojaOrigemId || !lojaDestinoId || lojaOrigemId === lojaDestinoId) {
      setNotice('Selecione duas lojas diferentes para realizar a transferência.');
      setLoading(false);
      return;
    }

    if (itens.length === 0) {
      setNotice('Adicione pelo menos um produto à transferência.');
      setLoading(false);
      return;
    }

    for (const item of itens) {
      const saldoDisponivel = obterSaldoDisponivel(Number(item.produtoId));
      if (Number(item.quantidade) > saldoDisponivel) {
        const produto = produtos.find((p) => Number(p.id) === Number(item.produtoId));
        setNotice(`Quantidade de "${produto?.nome || 'produto'}" excede o estoque disponível (${saldoDisponivel}).`);
        setLoading(false);
        return;
      }
    }

    const payload = {
      tipoMovimentacao: 'TRANSFERENCIA',
      formaPagamento: null,
      observacao: observacao || 'Transferência entre filiais',
      estabelecimentoOrigemId: Number(lojaOrigemId),
      estabelecimentoDestinoId: Number(lojaDestinoId),
      clienteId: null,
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
      setNotice('Transferência registrada com sucesso.');
      setItens([]);
      setObservacao('');
      setProdutoBusca('');
    } catch (err) {
      setNotice(err.response?.data?.message || err.message || 'Erro ao registrar transferência.');
    } finally {
      setLoading(false);
    }
  };

  const lojaOrigem = lojas.find((l) => String(l.id) === lojaOrigemId);
  const lojaDestino = lojas.find((l) => String(l.id) === lojaDestinoId);

  return (
    <div className="superficie superficie-formulario">
      <form onSubmit={handleSubmit} className="form-movimentacao form-transferencia">
        <div className="acoes-movimentacao topo-acoes">
          <button type="button" className="btn-limpar" onClick={limparFormulario}>
            Limpar
          </button>
        </div>

        <div className="transferencia-header">
          <div className="loja-card origem">
            <span className="loja-label">Origem</span>
            <select
              value={lojaOrigemId}
              onChange={(e) => setLojaOrigemId(e.target.value)}
              required
              disabled={carregandoEstoque}
            >
              <option value="">Selecione a loja de origem</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome || loja.titulo || `Loja ${loja.id}`}
                </option>
              ))}
            </select>
            {carregandoEstoque && <span className="loading-indicator">Carregando estoque...</span>}
            {lojaOrigem && !carregandoEstoque && <span className="loja-info">{lojaOrigem.nome || lojaOrigem.titulo}</span>}
          </div>

          <div className="transferencia-seta" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>

          <div className="loja-card destino">
            <span className="loja-label">Destino</span>
            <select
              value={lojaDestinoId}
              onChange={(e) => setLojaDestinoId(e.target.value)}
              required
            >
              <option value="">Selecione a loja de destino</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id} disabled={String(loja.id) === lojaOrigemId}>
                  {loja.nome || loja.titulo || `Loja ${loja.id}`}
                </option>
              ))}
            </select>
            {lojaDestino && <span className="loja-info">{lojaDestino.nome || lojaDestino.titulo}</span>}
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
            <div className="lista-vazia">Nenhum produto selecionado</div>
          ) : (
            <div className="lista-itens">
              {itens.map((item) => {
                const saldo = obterSaldoDisponivel(Number(item.produtoId));
                const produto = produtos.find((p) => Number(p.id) === Number(item.produtoId));
                return (
                  <div key={item.produtoId} className="item-movimentacao">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <span>{item.produtoNome}</span>
                      <small className="texto-secundario">
                        Estoque na origem: {saldo} {produto?.unidadeMedida || produto?.unidade_medida || 'UN'}
                      </small>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={saldo}
                      value={item.quantidade}
                      onChange={(event) => alterarQuantidade(item.produtoId, event.target.value)}
                      title={`Máximo disponível: ${saldo}`}
                      style={{ width: '100px' }}
                    />
                    <button type="button" className="btn-remover" onClick={() => removerProduto(item.produtoId)}>
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="campo campo-observacao">
          <label>Observação</label>
          <textarea
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            placeholder="Descreva detalhes da transferência (opcional)"
            rows={2}
          />
        </div>

        {notice && <div className="aviso">{notice}</div>}

        <div className="acoes-movimentacao rodape-acoes">
          <button className="primario" type="submit" disabled={loading || itens.length === 0 || !lojaOrigemId || !lojaDestinoId || lojaOrigemId === lojaDestinoId}>
            {loading ? 'Salvando...' : 'Salvar transferência'}
          </button>
        </div>
      </form>
    </div>
  );
}