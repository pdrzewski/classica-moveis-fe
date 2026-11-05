import { useEffect, useMemo, useState } from 'react';
import api from '../services/Api';

const listarDados = (resposta) => {
  const dados = resposta?.data;
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const buscar = async (rota) => {
  try {
    return await api.get(rota);
  } catch {
    return api.get(`/api${rota}`);
  }
};

const obterSaldo = (produto) => Number(
  produto?.saldoDisponivel ?? produto?.quantidade ?? produto?.saldo ?? produto?.estoqueAtual ?? 0
);
const normalizarProdutoEstoque = (produto) => (
  produto?.produto && typeof produto.produto === 'object'
    ? { ...produto.produto, ...produto }
    : produto
);
const formatarQuantidade = (quantidade) => Number(quantidade).toLocaleString('pt-BR', {
  maximumFractionDigits: 2,
});
const valorDo = (objeto, ...chaves) => chaves
  .map((chave) => objeto?.[chave])
  .find((valor) => valor !== undefined && valor !== null && valor !== '');
const nomeRelacionado = (valor) => {
  if (valor && typeof valor === 'object') {
    return valorDo(valor, 'nome', 'titulo', 'descricao', 'categoria', 'razaoSocial') || '—';
  }
  return valor ?? '—';
};
const formatarMoeda = (valor) => {
  const numero = Number(valor);
  return Number.isFinite(numero)
    ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '—';
};

const statusDoEstoque = (saldo, minimo) => {
  if (saldo < 0) return ['Saldo insuficiente', 'negativo'];
  if (saldo <= 0) return ['Esgotado', 'vazio'];
  if (saldo <= minimo) return ['Estoque baixo', 'baixo'];
  return ['Disponível', ''];
};

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [busca, setBusca] = useState('');
  const [lojaFiltro, setLojaFiltro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  useEffect(() => {
    if (!produtoSelecionado) return undefined;
    const fecharComEscape = (event) => {
      if (event.key === 'Escape') setProdutoSelecionado(null);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [produtoSelecionado]);

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
    const carregarEstoque = async () => {
      setCarregando(true);
      setErro('');
      try {
        if (lojaFiltro) {
          const resposta = await buscar(`/estoque/${lojaFiltro}/produtos`);
          setProdutos(listarDados(resposta).map(normalizarProdutoEstoque));
        } else {
          const lojasList = lojas.filter(l => l.id).slice(0, 3);
          const respostas = await Promise.all(
            lojasList.map((loja) => buscar(`/estoque/${loja.id}/produtos`).catch(() => ({ data: [] })))
          );
          const produtosPorLoja = respostas.map((r) => listarDados(r));
          
          const todosProdutos = {};
          produtosPorLoja.forEach((lista, idx) => {
            const loja = lojasList[idx];
            lista.forEach((p) => {
              const produto = normalizarProdutoEstoque(p);
              const key = produto.produtoId ?? produto.id;
              if (key == null) return;
              if (!todosProdutos[key]) {
                todosProdutos[key] = {
                  ...produto,
                  saldosPorLoja: {},
                  saldoDisponivel: 0,
                };
              }
              const qtd = obterSaldo(produto);
              todosProdutos[key].saldosPorLoja[loja.id] = qtd;
              todosProdutos[key].saldoDisponivel += qtd;
            });
          });
          
          const produtosCombinados = Object.values(todosProdutos);
          setProdutos(produtosCombinados);
          
          if (!produtosCombinados.length) {
            setErro('Nenhum produto em estoque.');
          }
        }
      } catch {
        setErro('Não foi possível carregar o estoque.');
        setProdutos([]);
      } finally {
        setCarregando(false);
      }
    };
    carregarEstoque();
  }, [lojaFiltro, lojas]);

  const produtosFiltrados = useMemo(() => {
    const texto = busca.trim().toLowerCase();
    if (!texto) return produtos;
    return produtos.filter((p) => {
      const nome = String(p?.nome || '').toLowerCase();
      const sku = String(p?.sku || '').toLowerCase();
      return nome.includes(texto) || sku.includes(texto);
    });
  }, [produtos, busca]);

  const mostrarTodasLojas = !lojaFiltro;
  const lojasVisiveis = lojas.filter(l => l.id).slice(0, 3);
  const saldoDoProduto = (produto) => obterSaldo(produto);
  const baixoEstoque = produtosFiltrados.filter((p) => (
    saldoDoProduto(p) > 0 && saldoDoProduto(p) <= Number(p.estoqueMinimo ?? p.estoque_minimo ?? 0)
  )).length;
  const esgotados = produtosFiltrados.filter((p) => saldoDoProduto(p) === 0).length;
  const estoqueNegativo = produtosFiltrados.filter((p) => saldoDoProduto(p) < 0).length;
  const totalUnidades = produtosFiltrados.reduce((total, produto) => (
    total + Math.max(0, saldoDoProduto(produto))
  ), 0);
  const produtoDetalhes = produtoSelecionado ? normalizarProdutoEstoque(produtoSelecionado) : null;
  const unidadeProduto = valorDo(produtoDetalhes, 'unidadeMedida', 'unidade_medida', 'unidade') || 'unidades';
  const saldoProdutoDetalhes = produtoDetalhes ? saldoDoProduto(produtoDetalhes) : 0;
  const detalhesProduto = produtoDetalhes ? [
    ['SKU', valorDo(produtoDetalhes, 'sku') || '—'],
    ['Código de barras', valorDo(produtoDetalhes, 'codigoBarras', 'codigo_barras', 'codigo') || '—'],
    ['Categoria', nomeRelacionado(valorDo(produtoDetalhes, 'categoria', 'categoriaNome', 'categoria_nome'))],
    ['Fornecedor', nomeRelacionado(valorDo(produtoDetalhes, 'fornecedor', 'fornecedorNome', 'fornecedor_nome'))],
    ['Marca', valorDo(produtoDetalhes, 'marca') || '—'],
    ['Unidade de medida', unidadeProduto],
    ['Preço de custo', formatarMoeda(valorDo(produtoDetalhes, 'precoCusto', 'preco_custo'))],
    ['Preço de venda', formatarMoeda(valorDo(produtoDetalhes, 'precoVenda', 'preco_venda'))],
    [`Estoque mínimo (${unidadeProduto})`, formatarQuantidade(Number(valorDo(produtoDetalhes, 'estoqueMinimo', 'estoque_minimo') ?? 0))],
    ['Status', statusDoEstoque(saldoProdutoDetalhes, Number(valorDo(produtoDetalhes, 'estoqueMinimo', 'estoque_minimo') ?? 0))[0]],
  ] : [];
  const obterTextoSaldo = (saldo, unidade = unidadeProduto) => (
    saldo < 0
      ? `Faltam ${formatarQuantidade(Math.abs(saldo))} ${unidade}`
      : formatarQuantidade(saldo)
  );

  const renderCabecalho = () => (
    <tr>
      <th>Produto</th>
      <th>SKU</th>
      {mostrarTodasLojas ? (
        <>
          {lojasVisiveis.map((loja) => (
            <th key={loja.id}>{loja.nome || loja.titulo || `Loja ${loja.id}`}</th>
          ))}
          <th className="total-col">Total</th>
        </>
      ) : (
        <th>Saldo disponível</th>
      )}
      <th>Estoque mínimo</th>
      <th>Status</th>
    </tr>
  );

  const renderLinha = (produto) => {
    const saldo = saldoDoProduto(produto);
    const minimo = Number(produto.estoqueMinimo ?? produto.estoque_minimo ?? 0);
    const unidade = valorDo(produto, 'unidadeMedida', 'unidade_medida', 'unidade') || 'unidades';
    const status = statusDoEstoque(saldo, minimo);
    return (
      <tr key={produto.produtoId ?? produto.id} className={status[1]}>
        <td>
          <button
            type="button"
            className="produto-estoque-detalhes"
            onClick={() => setProdutoSelecionado(produto)}
            aria-label={`Ver informações de ${produto.nome || 'produto sem nome'}`}
          >
            {produto.nome || 'Produto sem nome'}
          </button>
        </td>
        <td>{produto.sku || '-'}</td>
        {mostrarTodasLojas ? (
          <>
            {lojasVisiveis.map((loja) => (
              <td key={loja.id}>
                <strong className={Number(produto.saldosPorLoja?.[loja.id] || 0) < 0 ? 'saldo-negativo' : ''}>
                  {obterTextoSaldo(Number(produto.saldosPorLoja?.[loja.id] ?? 0), unidade)}
                </strong>
              </td>
            ))}
            <td className="total-col">
              <strong className={saldo < 0 ? 'saldo-negativo' : ''}>{obterTextoSaldo(saldo, unidade)}</strong>
            </td>
          </>
        ) : (
          <td>
            <strong className={saldo < 0 ? 'saldo-negativo' : ''}>{obterTextoSaldo(saldo, unidade)}</strong>
          </td>
        )}
        <td>{formatarQuantidade(minimo)}</td>
        <td><span className={`etiqueta-estoque ${status[1]}`}>{status[0]}</span></td>
      </tr>
    );
  };

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Operação</p>
          <h1>Estoque</h1>
          <p>Consulte os saldos por loja. Clique no nome do produto para ver mais informações.</p>
        </div>
        <a className="primario" href="/movimentacao/transferencia">Transferir entre lojas</a>
      </div>

      <div className="grade-metrica estoque-metricas">
        <div className="metrica"><small>Produtos listados</small><strong>{produtosFiltrados.length}</strong><p>Itens no resultado</p></div>
        <div className="metrica"><small>Unidades em estoque</small><strong>{formatarQuantidade(totalUnidades)}</strong><p>Soma dos saldos positivos</p></div>
        <div className="metrica"><small>Atenção necessária</small><strong>{baixoEstoque + esgotados + estoqueNegativo}</strong><p>{baixoEstoque} baixo · {esgotados} esgotados · {estoqueNegativo} com saldo insuficiente</p></div>
      </div>

      {erro && <div className="aviso">{erro}</div>}

      <div className="superficie superficie-tabela">
        <div className="filtros">
          <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por nome ou SKU..." />
          <select value={lojaFiltro} onChange={(event) => setLojaFiltro(event.target.value)}>
            <option value="">Todas as lojas (estoque geral)</option>
            {lojas.map((loja) => (
              <option key={loja.id} value={loja.id}>{loja.nome || loja.titulo || `Loja ${loja.id}`}</option>
            ))}
          </select>
        </div>
        <div className="envoltorio-tabela">
          <table className="tabela-estoque">
            <thead>
              {renderCabecalho()}
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan={mostrarTodasLojas ? 3 + lojasVisiveis.length + 1 : 5}>Carregando estoque...</td></tr>
              ) : produtosFiltrados.length === 0 ? (
                <tr><td colSpan={mostrarTodasLojas ? 3 + lojasVisiveis.length + 1 : 5}>Nenhum produto encontrado para os filtros selecionados.</td></tr>
              ) : (
                produtosFiltrados.map(renderLinha)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {produtoDetalhes && (
        <div
          className="camada-modal estoque-produto-camada"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setProdutoSelecionado(null);
          }}
        >
          <section
            className="cartao-modal estoque-produto-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalhes-produto"
          >
            <button
              type="button"
              className="fechar"
              onClick={() => setProdutoSelecionado(null)}
              aria-label="Fechar detalhes do produto"
            >
              ×
            </button>
            <p className="titulo-pequeno">Informações do produto</p>
            <h2 id="titulo-detalhes-produto">{produtoDetalhes.nome || 'Produto sem nome'}</h2>
            <div className="detalhes-grid">
              {detalhesProduto.map(([rotulo, valor]) => (
                <div className="detalhe-item" key={rotulo}>
                  <span>{rotulo}</span>
                  <strong>{valor}</strong>
                </div>
              ))}
            </div>
            <div className="estoque-produto-lojas">
              <h3>Saldo por loja</h3>
              {mostrarTodasLojas ? lojasVisiveis.map((loja) => {
                const saldo = Number(produtoDetalhes.saldosPorLoja?.[loja.id] ?? 0);
                return (
                  <div key={loja.id}>
                    <span>{loja.nome || loja.titulo || `Loja ${loja.id}`}</span>
                    <strong className={saldo < 0 ? 'saldo-negativo' : ''}>{obterTextoSaldo(saldo, unidadeProduto)}</strong>
                  </div>
                );
              }) : (
                <div>
                  <span>{lojas.find((loja) => String(loja.id) === String(lojaFiltro))?.nome || 'Loja selecionada'}</span>
                  <strong className={saldoProdutoDetalhes < 0 ? 'saldo-negativo' : ''}>
                    {obterTextoSaldo(saldoProdutoDetalhes, unidadeProduto)}
                  </strong>
                </div>
              )}
              {saldoProdutoDetalhes < 0 && (
                <p className="estoque-produto-explicacao">
                  O saldo está abaixo de zero. Isso significa que faltam {formatarQuantidade(Math.abs(saldoProdutoDetalhes))} {unidadeProduto} em relação ao registrado.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}