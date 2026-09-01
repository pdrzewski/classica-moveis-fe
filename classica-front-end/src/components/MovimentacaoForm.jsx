import { useEffect, useMemo, useState } from 'react';
import api from '../services/Api';

const listarDados = (resposta) => {
  const dados = resposta?.data;

  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const tiposPorDirecao = {
  ENTRADA: [
    { value: 'COMPRA', label: 'Compra' },
    { value: 'DEVOLUCAO_CLIENTE', label: 'Devolução do cliente' },
    { value: 'AJUSTE_ENTRADA', label: 'Ajuste de entrada' },
  ],
  SAIDA: [
    { value: 'VENDA', label: 'Venda' },
    { value: 'QUEBRA', label: 'Quebra' },
    { value: 'DEVOLUCAO_FORNECEDOR', label: 'Devolução ao fornecedor' },
    { value: 'AJUSTE_SAIDA', label: 'Ajuste de saída' },
  ],
};

export default function MovimentacaoForm() {
  const [direcao, setDirecao] = useState('ENTRADA');
  const [tipoMovimentacao, setTipoMovimentacao] = useState('COMPRA');
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [itens, setItens] = useState([]);
  const [produtoBusca, setProdutoBusca] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [dataMovimentacao, setDataMovimentacao] = useState('');
  const [lojaSelecionada, setLojaSelecionada] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [status, setStatus] = useState('PENDENTE');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  const tiposDisponiveis = tiposPorDirecao[direcao] || tiposPorDirecao.ENTRADA;

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

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const [respostaLojas, respostaColaboradores] = await Promise.all([
          api.get('/estabelecimentos').catch(() => api.get('/api/estabelecimentos')),
          api.get('/colaboradores').catch(() => api.get('/api/colaboradores')),
        ]);

        const lojasCarregadas = listarDados(respostaLojas);
        const colaboradoresCarregados = listarDados(respostaColaboradores);

        if (lojasCarregadas.length) {
          setLojas(lojasCarregadas);
          if (!lojaSelecionada) {
            setLojaSelecionada(String(lojasCarregadas[0].id));
          }
        }

        if (colaboradoresCarregados.length) {
          setColaboradores(colaboradoresCarregados);
          if (!colaboradorId) {
            setColaboradorId(String(colaboradoresCarregados[0].id));
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

  const selecionarDirecao = (novaDirecao) => {
    setDirecao(novaDirecao);
    const opcaoPadrao = tiposPorDirecao[novaDirecao]?.[0]?.value;
    if (opcaoPadrao) {
      setTipoMovimentacao(opcaoPadrao);
    }
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
    setDirecao('ENTRADA');
    setTipoMovimentacao('COMPRA');
    setItens([]);
    setProdutoBusca('');
    setMotivo('');
    setObservacao('');
    setDataMovimentacao('');
    setLojaSelecionada(lojas[0] ? String(lojas[0].id) : '');
    setColaboradorId(colaboradores[0] ? String(colaboradores[0].id) : '');
    setFormaPagamento('DINHEIRO');
    setStatus('PENDENTE');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setNotice('');

    const colaboradorSelecionado = colaboradores.find((colaborador) => Number(colaborador.id) === Number(colaboradorId));
    const lojaAtual = lojas.find((loja) => Number(loja.id) === Number(lojaSelecionada));

    const payload = {
      id: Date.now(),
      dataHora: dataMovimentacao ? new Date(`${dataMovimentacao}T00:00:00`).toISOString() : new Date().toISOString(),
      tipoMovimentacao,
      status: 'PENDENTE',
      formaPagamento,
      observacao,
      valorTotal: Number(valorTotal.toFixed(2)),
      colaboradorId: Number(colaboradorId || colaboradorSelecionado?.id || 1),
      colaboradorNome: colaboradorSelecionado?.nome || 'Usuário atual',
      estabelecimentoOrigemId: direcao === 'SAIDA' ? Number(lojaSelecionada || lojaAtual?.id || 1) : 1,
      estabelecimentoOrigemNome: direcao === 'SAIDA' ? (lojaAtual?.nome || 'Loja atual') : 'Estoque principal',
      estabelecimentoDestinoId: direcao === 'ENTRADA' ? Number(lojaSelecionada || lojaAtual?.id || 1) : 1,
      estabelecimentoDestinoNome: direcao === 'ENTRADA' ? (lojaAtual?.nome || 'Loja atual') : 'Estoque principal',
      clienteId: null,
      clienteNome: '',
      fornecedorId: null,
      fornecedorNome: '',
      itens: itens.map((item) => ({
        id: Date.now() + Math.random(),
        produtoId: Number(item.produtoId),
        produtoNome: item.produtoNome,
        quantidade: Number(item.quantidade || 0),
        valorUnitario: Number(item.valorUnitario || 0),
        desconto: Number(item.desconto || 0),
        subtotal: Number(item.subtotal || 0),
      })),
    };

    try {
      await api.post('/movimentacoes', payload).catch(() => api.post('/api/movimentacoes', payload));
      setNotice('Registro salvo com sucesso.');
      setItens([]);
      setMotivo('');
      setObservacao('');
      setDataMovimentacao('');
      setLojaSelecionada('');
      setProdutoBusca('');
      setStatus('PENDENTE');
      setFormaPagamento('DINHEIRO');
    } catch (err) {
      setNotice(err.response?.data?.message || err.message || 'Erro ao registrar movimentação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="superficie superficie-formulario">
      <form onSubmit={handleSubmit} className="form-movimentacao">
        <div className="acoes-movimentacao topo-acoes">
          <button type="button" className="btn-limpar" onClick={limparFormulario}>
            Limpar campos
          </button>
        </div>

        <div className="direcao" aria-label="Tipo de movimentação">
          <button
            type="button"
            className={direcao === 'ENTRADA' ? 'selecionado' : ''}
            onClick={() => selecionarDirecao('ENTRADA')}
          >
            ↑ Entrada
          </button>
          <button
            type="button"
            className={direcao === 'SAIDA' ? 'selecionado' : ''}
            onClick={() => selecionarDirecao('SAIDA')}
          >
            ↓ Saída
          </button>
        </div>

        <div className="movimentacao-grid duas-colunas">
          <div className="campo">
            <label>Tipo</label>
            <select value={tipoMovimentacao} onChange={(event) => setTipoMovimentacao(event.target.value)}>
              {tiposDisponiveis.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
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
        </div>

        <div className="movimentacao-grid duas-colunas">
          <div className="campo">
            <label>Loja</label>
            <select value={lojaSelecionada} onChange={(event) => setLojaSelecionada(event.target.value)}>
              <option value="">Selecione a loja</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome || loja.titulo || `Loja ${loja.id}`}
                </option>
              ))}
            </select>
          </div>

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

        <div className="resumo-movimentacao">
          <strong>Total:</strong>
          <span>R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {notice && <div className="aviso">{notice}</div>}

        <div className="acoes-movimentacao rodape-acoes">
          <button className="primario" type="submit" disabled={loading || itens.length === 0}>
            {loading ? 'Salvando...' : 'Salvar movimentação'}
          </button>
        </div>
      </form>
    </div>
  );
}
