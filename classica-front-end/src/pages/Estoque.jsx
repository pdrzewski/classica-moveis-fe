import { useEffect, useMemo, useState } from 'react';
import api from '../services/Api';

const listarDados = (resposta) => {
  const dados = resposta?.data;
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const valor = (item, ...chaves) => chaves.map((chave) => item?.[chave]).find((itemValor) => itemValor !== undefined && itemValor !== null);
const idDo = (item) => valor(item, 'id', 'produtoId', 'produto_id', 'fkProduto', 'fk_produto');
const produtoIdDo = (item) => valor(item, 'produtoId', 'produto_id', 'fkProduto', 'fk_produto') || item?.produto?.id || item?.produto?.produtoId || item?.id;
const nomeDaLoja = (loja) => loja?.nome || loja?.titulo || `Loja ${idDo(loja)}`;
const nomeDaCategoria = (produto) => produto?.categoria?.nome || produto?.categoriaNome || produto?.categoria || 'Sem categoria';
const formatarMoeda = (numero) => Number(numero || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const buscar = async (rota) => {
  try {
    return await api.get(rota);
  } catch {
    return api.get(`/api${rota}`);
  }
};

const statusDoEstoque = (quantidade, minimo) => {
  if (quantidade <= 0) return ['Esgotado', 'vazio'];
  if (quantidade <= minimo) return ['Estoque baixo', 'baixo'];
  return ['Disponível', ''];
};

const calcularSaldos = (produtos, lojas, movimentacoes) => {
  const saldos = new Map();
  const garantir = (produtoId, lojaId) => {
    const chave = `${produtoId}-${lojaId}`;
    if (!saldos.has(chave)) saldos.set(chave, { produtoId, lojaId, quantidade: 0 });
    return saldos.get(chave);
  };

  movimentacoes.forEach((movimentacao) => {
    const tipo = String(valor(movimentacao, 'tipoMovimentacao', 'tipo_movimentacao', 'tipo') || '').toUpperCase();
    const origem = valor(movimentacao, 'estabelecimentoOrigemId', 'estabelecimento_origem_id', 'origemId');
    const destino = valor(movimentacao, 'estabelecimentoDestinoId', 'estabelecimento_destino_id', 'destinoId');
    const itens = movimentacao.itens || movimentacao.items || movimentacao.itemMovimentacoes || [];

    itens.forEach((item) => {
      const produtoId = produtoIdDo(item);
      const quantidade = Number(valor(item, 'quantidade', 'qtd', 'quantidadeProduto') || 0);
      if (!produtoId || !quantidade) return;
      if (['COMPRA', 'DEVOLUCAO_CLIENTE', 'AJUSTE_ENTRADA'].includes(tipo) && destino) garantir(produtoId, destino).quantidade += quantidade;
      else if (['VENDA', 'QUEBRA', 'DEVOLUCAO_FORNECEDOR', 'AJUSTE_SAIDA'].includes(tipo) && origem) garantir(produtoId, origem).quantidade -= quantidade;
      else if (tipo === 'TRANSFERENCIA') {
        if (origem) garantir(produtoId, origem).quantidade -= quantidade;
        if (destino) garantir(produtoId, destino).quantidade += quantidade;
      }
    });
  });

  return produtos.flatMap((produto) => lojas.map((loja) => ({
    produto,
    loja,
    quantidade: saldos.get(`${idDo(produto)}-${idDo(loja)}`)?.quantidade || 0,
  })));
};

export default function Estoque() {
  const [produtos, setProdutos] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [estoqueApi, setEstoqueApi] = useState([]);
  const [busca, setBusca] = useState('');
  const [lojaFiltro, setLojaFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    const carregar = async () => {
      setCarregando(true);
      try {
        const respostas = await Promise.allSettled([buscar('/produtos'), buscar('/estabelecimentos'), buscar('/estoque'), buscar('/movimentacoes')]);
        const [produtosResposta, lojasResposta, estoqueResposta, movimentacoesResposta] = respostas;
        const produtosCarregados = produtosResposta.status === 'fulfilled' ? listarDados(produtosResposta.value) : [];
        const lojasCarregadas = lojasResposta.status === 'fulfilled' ? listarDados(lojasResposta.value) : [];
        const estoqueCarregado = estoqueResposta.status === 'fulfilled' ? listarDados(estoqueResposta.value) : [];
        const movimentacoesCarregadas = movimentacoesResposta.status === 'fulfilled' ? listarDados(movimentacoesResposta.value) : [];

        setProdutos(produtosCarregados);
        setLojas(lojasCarregadas);
        setEstoqueApi(estoqueCarregado);
        setMovimentacoes(movimentacoesCarregadas);
        if (!produtosCarregados.length) setErro('Não foi possível carregar os produtos.');
      } catch {
        setErro('Não foi possível carregar os dados do estoque.');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, []);

  const linhas = useMemo(() => {
    const saldosCalculados = calcularSaldos(produtos, lojas, movimentacoes);
    return saldosCalculados.map((linha) => {
      const saldoApi = estoqueApi.find((item) => Number(produtoIdDo(item)) === Number(idDo(linha.produto)) && Number(valor(item, 'lojaId', 'estabelecimentoId', 'estabelecimento_id')) === Number(idDo(linha.loja)));
      const quantidade = saldoApi ? Number(valor(saldoApi, 'quantidade', 'saldo', 'estoqueAtual', 'qtd') || 0) : linha.quantidade;
      const minimo = Number(valor(linha.produto, 'estoqueMinimo', 'estoque_minimo') || 0);
      return { ...linha, quantidade, minimo, status: statusDoEstoque(quantidade, minimo) };
    });
  }, [produtos, lojas, movimentacoes, estoqueApi]);

  const linhasFiltradas = linhas.filter(({ produto, loja, status }) => {
    const texto = busca.trim().toLowerCase();
    const correspondeBusca = !texto || [produto?.nome, produto?.sku, produto?.codigoBarras, produto?.marca].some((campo) => String(campo || '').toLowerCase().includes(texto));
    return correspondeBusca && (!lojaFiltro || String(idDo(loja)) === lojaFiltro) && (!statusFiltro || status[1] === statusFiltro);
  });
  const totalUnidades = linhas.reduce((total, linha) => total + linha.quantidade, 0);
  const baixoEstoque = linhas.filter((linha) => linha.status[1] === 'baixo' || linha.status[1] === 'vazio').length;

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div><p className="titulo-pequeno">Operação</p><h1>Estoque</h1><p>Consulte saldo, valor e nível de cada produto por loja.</p></div>
        <a className="primario" href="/movimentacao/transferencia">Transferir entre lojas</a>
      </div>

      <div className="grade-metrica estoque-metricas">
        <div className="metrica"><small>Produtos cadastrados</small><strong>{produtos.length}</strong><p>Itens no catálogo</p></div>
        <div className="metrica"><small>Unidades em estoque</small><strong>{totalUnidades}</strong><p>Saldo consolidado</p></div>
        <div className="metrica"><small>Atenção necessária</small><strong>{baixoEstoque}</strong><p>Linhas no mínimo ou zeradas</p></div>
      </div>

      {erro && <div className="aviso">{erro}</div>}
      <div className="superficie superficie-tabela">
        <div className="filtros">
          <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por produto, SKU ou marca..." />
          <select value={lojaFiltro} onChange={(event) => setLojaFiltro(event.target.value)}><option value="">Todas as lojas</option>{lojas.map((loja) => <option key={idDo(loja)} value={idDo(loja)}>{nomeDaLoja(loja)}</option>)}</select>
          <select value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)}><option value="">Todos os status</option><option value="baixo">Estoque baixo</option><option value="vazio">Esgotado</option></select>
        </div>
        <div className="envoltorio-tabela">
          <table className="tabela-estoque">
            <thead><tr><th>Produto</th><th>Categoria / marca</th><th>Loja</th><th>Saldo</th><th>Mínimo</th><th>Preço venda</th><th>Status</th></tr></thead>
            <tbody>
              {carregando ? <tr><td colSpan="7">Carregando estoque...</td></tr> : linhasFiltradas.length === 0 ? <tr><td colSpan="7">Nenhum produto encontrado para os filtros selecionados.</td></tr> : linhasFiltradas.map(({ produto, loja, quantidade, minimo, status }) => (
                <tr key={`${idDo(produto)}-${idDo(loja)}`}>
                  <td><strong>{produto?.nome || 'Produto sem nome'}</strong><small className="texto-secundario">SKU {produto?.sku || '-'} | {produto?.unidadeMedida || produto?.unidade_medida || 'UN'}</small></td>
                  <td>{nomeDaCategoria(produto)}<small className="texto-secundario">{produto?.marca || 'Marca não informada'}</small></td>
                  <td>{nomeDaLoja(loja)}</td><td><strong>{quantidade}</strong></td><td>{minimo}</td><td>{formatarMoeda(produto?.precoVenda || produto?.preco_venda)}</td>
                  <td><span className={`etiqueta-estoque ${status[1]}`}>{status[0]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
