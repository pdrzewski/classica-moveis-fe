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

const statusDoEstoque = (saldo, minimo) => {
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
          setProdutos(listarDados(resposta));
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
              const key = p.produtoId || p.id;
              if (!todosProdutos[key]) {
                todosProdutos[key] = {
                  ...p,
                  saldosPorLoja: {},
                  saldoDisponivel: 0,
                };
              }
              const qtd = p.saldoDisponivel || p.quantidade || p.saldo || 0;
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
  
  const baixoEstoque = produtosFiltrados.filter((p) => p.saldoDisponivel > 0 && p.saldoDisponivel <= p.estoqueMinimo).length;
  const esgotados = produtosFiltrados.filter((p) => p.saldoDisponivel <= 0).length;
  const totalUnidades = produtosFiltrados.reduce((t, p) => t + (p.saldoDisponivel || 0), 0);

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
    const status = statusDoEstoque(produto.saldoDisponivel, produto.estoqueMinimo);
    return (
      <tr key={produto.produtoId} className={status[1]}>
        <td>
          <strong>{produto.nome || 'Produto sem nome'}</strong>
        </td>
        <td>{produto.sku || '-'}</td>
        {mostrarTodasLojas ? (
          <>
            {lojasVisiveis.map((loja) => (
              <td key={loja.id}><strong>{produto.saldosPorLoja?.[loja.id] || 0}</strong></td>
            ))}
            <td className="total-col"><strong>{produto.saldoDisponivel}</strong></td>
          </>
        ) : (
          <td><strong>{produto.saldoDisponivel}</strong></td>
        )}
        <td>{produto.estoqueMinimo}</td>
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
          <p>Consulte saldo disponível e nível de cada produto.</p>
        </div>
        <a className="primario" href="/movimentacao/transferencia">Transferir entre lojas</a>
      </div>

      <div className="grade-metrica estoque-metricas">
        <div className="metrica"><small>Produtos listados</small><strong>{produtosFiltrados.length}</strong><p>Itens no resultado</p></div>
        <div className="metrica"><small>Unidades em estoque</small><strong>{totalUnidades}</strong><p>Saldo consolidado</p></div>
        <div className="metrica"><small>Atenção necessária</small><strong>{baixoEstoque + esgotados}</strong><p>{baixoEstoque} baixo · {esgotados} esgotados</p></div>
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
    </section>
  );
}