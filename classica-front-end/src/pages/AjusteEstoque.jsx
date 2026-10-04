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

const buscar = async (rota) => {
  return api.get(rota);
};

const normalizarProdutosEstoque = (resposta) => listarDados(resposta).map((produto) => ({
  ...produto,
  id: produto.produtoId || produto.id,
  saldoAtual: produto.saldoDisponivel ?? produto.quantidade ?? produto.saldo ?? 0,
}));
const normalizarBusca = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

export default function AjusteEstoque() {
  const { usuario } = useAuth();
  const colaboradorId = usuario?.colaboradorId || usuario?.colaborador?.id;

  const [lojas, setLojas] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [produtosSugeridos, setProdutosSugeridos] = useState([]);
  const [lojaSelecionada, setLojaSelecionada] = useState('');
  const [observacao, setObservacao] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [notice, setNotice] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  useEffect(() => {
    const carregarLojas = async () => {
      try {
        const resposta = await buscar('/estabelecimentos');
        setLojas(listarDados(resposta));
      } catch {
        setLojas([]);
      }
    };
    carregarLojas();
  }, []);

  useEffect(() => {
    if (!lojaSelecionada) {
      setProdutos([]);
      return;
    }
    const carregarProdutos = async () => {
      setCarregando(true);
      try {
        const [resultadoCatalogo, resultadoEstoque] = await Promise.allSettled([
          buscar('/produtos'),
          buscar(`/estoque/${lojaSelecionada}/produtos`),
        ]);
        if (resultadoCatalogo.status === 'rejected' && resultadoEstoque.status === 'rejected') {
          setProdutos([]);
          return;
        }

        const catalogo = resultadoCatalogo.status === 'fulfilled'
          ? listarDados(resultadoCatalogo.value)
          : normalizarProdutosEstoque(resultadoEstoque.value);
        const saldosPorProduto = new Map((resultadoEstoque.status === 'fulfilled'
          ? normalizarProdutosEstoque(resultadoEstoque.value)
          : []
        ).map((produto) => (
          [Number(produto.id), Number(produto.saldoAtual || 0)]
        )));
        setProdutos(catalogo.map((produto) => ({
          ...produto,
          id: produto.id || produto.produtoId,
          saldoAtual: saldosPorProduto.get(Number(produto.id || produto.produtoId)) || 0,
        })));
      } catch {
        setProdutos([]);
      } finally {
        setCarregando(false);
      }
    };
    carregarProdutos();
  }, [lojaSelecionada]);

  useEffect(() => {
    if (!buscaProduto.trim() || !lojaSelecionada) {
      setProdutosSugeridos([]);
      return;
    }
    const texto = normalizarBusca(buscaProduto);
    const sugestoes = produtos.filter((p) => {
      const camposBusca = [p?.nome, p?.sku, p?.codigoBarras, p?.codigo]
        .map(normalizarBusca);
      return camposBusca.some((campo) => campo.includes(texto));
    }).slice(0, 10);
    setProdutosSugeridos(sugestoes);
  }, [buscaProduto, produtos, lojaSelecionada]);

  const selecionarProduto = (produto) => {
    setBuscaProduto(produto.nome);
    setProdutoSelecionadoId(String(produto.id));
    setProdutosSugeridos([]);
    setQuantidade(1);
  };

  const adicionarItem = (tipo) => {
    const produto = produtos.find((p) => String(p.id) === produtoSelecionadoId)
      || produtos.find((p) => [p.nome, p.sku, p.codigoBarras, p.codigo]
        .some((campo) => normalizarBusca(campo) === normalizarBusca(buscaProduto)));
    if (!produto) {
      setNotice('Selecione um produto válido da lista.');
      return;
    }
    const qtd = Number(quantidade);
    if (!qtd || qtd <= 0) {
      setNotice('Quantidade deve ser maior que zero.');
      return;
    }
    if (tipo === 'SAIDA' && qtd > produto.saldoAtual) {
      setNotice(`Quantidade de saída não pode exceder o saldo atual (${produto.saldoAtual}).`);
      return;
    }

    setItens((prev) => {
      const existente = prev.find((i) => i.produtoId === produto.id && i.tipo === tipo);
      if (existente) {
        return prev.map((i) =>
          i.produtoId === produto.id && i.tipo === tipo
            ? { ...i, quantidade: i.quantidade + qtd }
            : i
        );
      }
      return [
        ...prev,
        {
          produtoId: produto.id,
          produtoNome: produto.nome,
          sku: produto.sku,
          saldoAtual: produto.saldoAtual,
          quantidade: qtd,
          tipo,
        },
      ];
    });

    setBuscaProduto('');
    setProdutoSelecionadoId('');
    setQuantidade(1);
    setNotice('');
  };

  const removerItem = (index) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const itensEntrada = useMemo(() => itens.filter((i) => i.tipo === 'ENTRADA'), [itens]);
  const itensSaida = useMemo(() => itens.filter((i) => i.tipo === 'SAIDA'), [itens]);

  const limparFormulario = () => {
    setLojaSelecionada('');
    setObservacao('');
    setBuscaProduto('');
    setProdutoSelecionadoId('');
    setQuantidade(1);
    setItens([]);
    setNotice('');
    setSucesso(false);
  };

  const criarPayload = (tipoMovimentacao, itensTipo) => ({
    tipoMovimentacao,
    observacao: observacao.trim(),
    estabelecimentoOrigemId: Number(lojaSelecionada),
    colaboradorId: Number(colaboradorId),
    estabelecimentoDestinoId: null,
    clienteId: null,
    fornecedorId: null,
    itens: itensTipo.map((item) => ({
      produtoId: Number(item.produtoId),
      quantidade: Number(item.quantidade),
      valorUnitario: 0,
      desconto: 0,
    })),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice('');
    setSucesso(false);

    if (!lojaSelecionada) {
      setNotice('Selecione uma loja.');
      return;
    }
    if (!colaboradorId) {
      setNotice('Colaborador não identificado na sessão.');
      return;
    }
    if (!observacao.trim()) {
      setNotice('Observação é obrigatória.');
      return;
    }
    if (itens.length === 0) {
      setNotice('Adicione ao menos um item à lista.');
      return;
    }

    setSalvando(true);
    let requisicoesEnviadas = 0;
    const totalRequisicoes = Number(itensEntrada.length > 0) + Number(itensSaida.length > 0);

    try {
      if (itensEntrada.length > 0) {
        const payloadEntrada = criarPayload('AJUSTE_ENTRADA', itensEntrada);
        await api.post('/movimentacoes', payloadEntrada);
        requisicoesEnviadas += 1;
      }

      if (itensSaida.length > 0) {
        const payloadSaida = criarPayload('AJUSTE_SAIDA', itensSaida);
        await api.post('/movimentacoes', payloadSaida);
        requisicoesEnviadas += 1;
      }
    } catch (err) {
      if (requisicoesEnviadas > 0) {
        setNotice(`Ajuste parcialmente registrado (${requisicoesEnviadas} de ${totalRequisicoes} operações). Revise o estoque antes de tentar novamente.`);
        try {
          const respostaEstoque = await buscar(`/estoque/${lojaSelecionada}/produtos`);
          setProdutos(normalizarProdutosEstoque(respostaEstoque));
        } catch {
          // Mantém a lista atual se a atualização do saldo falhar.
        }
      } else {
        setNotice(err.response?.data?.message || err.message || 'Erro ao registrar ajuste de estoque.');
      }
      setSalvando(false);
      return;
    }

    let erroAtualizacaoSaldo = false;
    try {
      const respostaEstoque = await buscar(`/estoque/${lojaSelecionada}/produtos`);
      setProdutos(normalizarProdutosEstoque(respostaEstoque));
    } catch {
      erroAtualizacaoSaldo = true;
    }
    setSucesso(true);
    setNotice(erroAtualizacaoSaldo
      ? 'Ajuste realizado. Não foi possível atualizar o saldo exibido; recarregue a loja para conferir.'
      : 'Ajuste de estoque realizado com sucesso.');
    setObservacao('');
    setBuscaProduto('');
    setProdutoSelecionadoId('');
    setQuantidade(1);
    setItens([]);
    setSalvando(false);
  };

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Operação</p>
          <h1>Ajuste de Estoque</h1>
          <p>Ajustes pontuais: pesquise, adicione à lista e salve.</p>
        </div>
      </div>

      <div className="superficie superficie-formulario">
        <form onSubmit={handleSubmit} className="form-ajuste-estoque">
          <div className="campo">
            <label>Loja <span className="obrigatorio">*</span></label>
            <select
              value={lojaSelecionada}
              onChange={(event) => {
                setLojaSelecionada(event.target.value);
                setBuscaProduto('');
                setProdutoSelecionadoId('');
                setProdutosSugeridos([]);
                setMostrarSugestoes(false);
              }}
            >
              <option value="">Selecione a loja</option>
              {lojas.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {loja.nome || loja.titulo || `Loja ${loja.id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="campo campo-observacao">
            <label>Observação <span className="obrigatorio">*</span></label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Motivo do ajuste (obrigatório)"
              rows={2}
            />
          </div>

          <div className="campo bloco-busca-produto">
            <label>Adicionar item ao ajuste</label>
            <div className="linha-busca-produto">
              <div className="campo-busca-produto campo-busca-produto-ajuste">
                <input
                  type="text"
                  value={buscaProduto}
                  onChange={(e) => {
                    setBuscaProduto(e.target.value);
                    setProdutoSelecionadoId('');
                    setMostrarSugestoes(true);
                  }}
                  onFocus={() => setMostrarSugestoes(true)}
                  onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || produtosSugeridos.length === 0) return;
                    event.preventDefault();
                    selecionarProduto(produtosSugeridos[0]);
                  }}
                  placeholder="Pesquise por nome ou SKU..."
                  disabled={!lojaSelecionada || carregando}
                  autoComplete="off"
                />
                {mostrarSugestoes && produtosSugeridos.length > 0 && (
                  <div className="lista-sugestoes-produtos" role="listbox">
                    {produtosSugeridos.map((produto) => (
                      <button
                        key={produto.id}
                        type="button"
                        className="sugestao-produto"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selecionarProduto(produto)}
                      >
                        <span>{produto.nome}</span>
                        <small>{produto.sku || produto.codigoBarras || 'Sem código'} · Saldo: {produto.saldoAtual}</small>
                      </button>
                    ))}
                  </div>
                )}
                {mostrarSugestoes && buscaProduto.trim() && produtosSugeridos.length === 0 && (
                  <div className="lista-sugestoes-produtos">
                    <div className="sugestao-produto sem-resultados">
                      {carregando ? 'Carregando produtos...' : produtos.length ? 'Nenhum produto encontrado' : 'Não há produtos disponíveis para esta loja'}
                    </div>
                  </div>
                )}
              </div>
              <div className="campo-quantidade-ajuste">
                <label>Qtd</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value) || 1)}
                  className="input-quantidade"
                />
              </div>
              <div className="acoes-adicionar-item">
                <button type="button" className="btn-entrada" onClick={() => adicionarItem('ENTRADA')} title="Entrada de produto">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Entrada de produto</span>
                </button>
                <button type="button" className="btn-saida" onClick={() => adicionarItem('SAIDA')} title="Saída de produto">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Saída de produto</span>
                </button>
              </div>
            </div>
          </div>

          {(itensEntrada.length > 0 || itensSaida.length > 0) && (
            <div className="campo bloco-lista-itens">
              <label>Itens do ajuste ({itens.length})</label>
              <div className="lista-itens-ajuste">
                {itensEntrada.length > 0 && (
                  <div className="grupo-itens">
                    <div className="grupo-titulo entrada">Entrada de produto</div>
                    {itensEntrada.map((item, idx) => (
                      <div key={idx} className="item-ajuste entrada">
                        <div className="item-info">
                          <strong>{item.produtoNome}</strong>
                          <small>{item.sku || 'Sem SKU'}</small>
                        </div>
                        <div className="item-detalhes">
                          <span className="quantidade">+{item.quantidade}</span>
                          <span className="saldo">Saldo: {item.saldoAtual}</span>
                        </div>
                        <button type="button" className="btn-remover-item" onClick={() => removerItem(itens.indexOf(item))} aria-label="Remover">×</button>
                      </div>
                    ))}
                  </div>
                )}
                {itensSaida.length > 0 && (
                  <div className="grupo-itens">
                    <div className="grupo-titulo saida">Saída de produto</div>
                    {itensSaida.map((item, idx) => (
                      <div key={idx} className="item-ajuste saida">
                        <div className="item-info">
                          <strong>{item.produtoNome}</strong>
                          <small>{item.sku || 'Sem SKU'}</small>
                        </div>
                        <div className="item-detalhes">
                          <span className="quantidade">-{item.quantidade}</span>
                          <span className="saldo">Saldo: {item.saldoAtual}</span>
                        </div>
                        <button type="button" className="btn-remover-item" onClick={() => removerItem(itens.indexOf(item))} aria-label="Remover">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {notice && <div className={`aviso ${sucesso ? 'sucesso' : ''}`}>{notice}</div>}

          <div className="acoes-ajuste">
            <button type="button" className="btn-limpar" onClick={limparFormulario}>
              Limpar tudo
            </button>
            <button type="submit" className="primario" disabled={salvando || itens.length === 0 || carregando}>
              {salvando ? 'Salvando...' : 'Salvar Ajuste'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}