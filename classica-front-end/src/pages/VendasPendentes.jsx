import { useEffect, useState } from 'react';
import api from '../services/Api';

const listarDados = (resposta) => {
  const dados = resposta?.data;
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const formatarData = (data) => {
  if (!data) return '';
  const d = new Date(data);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatarMoeda = (valor) => {
  return Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const IconConcluir = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconDetalhes = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const ModalDetalhes = ({ venda, onClose }) => {
  if (!venda) return null;

  return (
    <div className="camada-modal">
      <div className="cartao-modal modal-detalhes" style={{ maxWidth: '700px' }}>
        <button type="button" className="fechar" onClick={onClose}><IconDetalhes /></button>
        <p className="titulo-pequeno">Venda #{venda.id}</p>
        <h2>Detalhes da venda pendente</h2>

        <div className="detalhes-grid" style={{ marginBottom: '24px' }}>
          <div className="detalhe-item">
            <span>Data/Hora</span>
            <strong>{formatarData(venda.dataHora)}</strong>
          </div>
          <div className="detalhe-item">
            <span>Status</span>
            <strong><span className={`etiqueta-estoque ${venda.status === 'CONCLUIDO' ? '' : 'baixo'}`}>{venda.status}</span></strong>
          </div>
          <div className="detalhe-item">
            <span>Forma de pagamento</span>
            <strong>{venda.formaPagamento}</strong>
          </div>
          <div className="detalhe-item">
            <span>Colaborador</span>
            <strong>{venda.colaboradorNome}</strong>
          </div>
          <div className="detalhe-item">
            <span>Loja origem</span>
            <strong>{venda.estabelecimentoOrigemNome}</strong>
          </div>
          <div className="detalhe-item">
            <span>Loja destino</span>
            <strong>{venda.estabelecimentoDestinoNome || '—'}</strong>
          </div>
          <div className="detalhe-item">
            <span>Cliente</span>
            <strong>{venda.clienteNome}</strong>
          </div>
          <div className="detalhe-item">
            <span>Valor total</span>
            <strong>R$ {formatarMoeda(venda.valorTotal)}</strong>
          </div>
          {venda.observacao && (
            <div className="detalhe-item" style={{ gridColumn: '1 / -1' }}>
              <span>Observação</span>
              <strong>{venda.observacao}</strong>
            </div>
          )}
        </div>

        <h3 style={{ marginBottom: '12px' }}>Itens</h3>
        <div className="envoltorio-tabela">
          <table className="tabela-estoque">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Vl. unit.</th>
                <th>Desc.</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {venda.itens?.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.produtoNome}</strong></td>
                  <td>{item.quantidade}</td>
                  <td>R$ {formatarMoeda(item.valorUnitario)}</td>
                  <td>R$ {formatarMoeda(item.desconto)}</td>
                  <td><strong>R$ {formatarMoeda(item.subtotal)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function VendasPendentes() {
  const [vendas, setVendas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [estabelecimentoFiltro, setEstabelecimentoFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [lojas, setLojas] = useState([]);
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [concluindo, setConcluindo] = useState(false);

  useEffect(() => {
    const carregarLojas = async () => {
      try {
        const resp = await api.get('/estabelecimentos').catch(() => api.get('/api/estabelecimentos'));
        setLojas(listarDados(resp));
      } catch {
        setLojas([]);
      }
    };
    carregarLojas();
  }, []);

  const buscarVendas = async () => {
    setCarregando(true);
    setErro('');
    try {
      const params = new URLSearchParams();
      if (estabelecimentoFiltro) params.append('estabelecimentoId', estabelecimentoFiltro);
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);

      const resp = await api.get(`/movimentacoes/vendas-pendentes?${params.toString()}`).catch(() => api.get(`/api/movimentacoes/vendas-pendentes?${params.toString()}`));
      setVendas(listarDados(resp));
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível carregar as vendas pendentes.');
      setVendas([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarVendas();
  }, [estabelecimentoFiltro, dataInicio, dataFim]);

  const handleConcluir = async (vendaId) => {
    if (!window.confirm('Marcar esta venda como concluída/entregue?')) return;
    setConcluindo(true);
    try {
      await api.patch(`/movimentacoes/${vendaId}/concluir`).catch(() => api.patch(`/api/movimentacoes/${vendaId}/concluir`));
      buscarVendas();
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao concluir venda.');
    } finally {
      setConcluindo(false);
    }
  };

  const handleVerDetalhes = (venda) => {
    setVendaSelecionada(venda);
    setDetalhesAberto(true);
  };

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Vendas</p>
          <h1>Vendas pendentes</h1>
          <p>Vendas aguardando entrega/retirada. Conclua ao entregar ao cliente.</p>
        </div>
      </div>

      <div className="superficie superficie-tabela">
        <div className="filtros" style={{ flexWrap: 'wrap', gap: '12px' }}>
          <div className="filtro-select-wrapper" style={{ minWidth: '220px' }}>
            <select value={estabelecimentoFiltro} onChange={(e) => setEstabelecimentoFiltro(e.target.value)}>
              <option value="">Todas as lojas</option>
              {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome || l.titulo}</option>)}
            </select>
          </div>
          <div className="campo" style={{ minWidth: '180px' }}>
            <label>Data início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="campo" style={{ minWidth: '180px' }}>
            <label>Data fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <button className="primario" style={{ alignSelf: 'flex-end', marginTop: '22px' }} onClick={buscarVendas}>Filtrar</button>
        </div>

        {erro && <div className="aviso" style={{ padding: '12px 24px' }}>{erro}</div>}

        <div className="envoltorio-tabela">
          <table className="tabela-estoque">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data/Hora</th>
                <th>Cliente</th>
                <th>Loja origem</th>
                <th>Loja destino</th>
                <th>Colaborador</th>
                <th>Pagamento</th>
                <th>Valor total</th>
                <th>Status</th>
                <th style={{ width: '120px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan="10" style={{ textAlign: 'center' }}>Carregando vendas pendentes...</td></tr>
              ) : vendas.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center' }}>Nenhuma venda pendente encontrada.</td></tr>
              ) : (
                vendas.map((venda) => (
                  <tr key={venda.id} style={{ cursor: 'pointer' }} onClick={() => handleVerDetalhes(venda)}>
                    <td>#{venda.id}</td>
                    <td>{formatarData(venda.dataHora)}</td>
                    <td>{venda.clienteNome}</td>
                    <td>{venda.estabelecimentoOrigemNome}</td>
                    <td>{venda.estabelecimentoDestinoNome || '—'}</td>
                    <td>{venda.colaboradorNome}</td>
                    <td>{venda.formaPagamento}</td>
                    <td><strong>R$ {formatarMoeda(venda.valorTotal)}</strong></td>
                    <td><span className={`etiqueta-estoque ${venda.status === 'CONCLUIDO' ? '' : 'baixo'}`}>{venda.status}</span></td>
                    <td>
                      {venda.status === 'CONCLUIDO' ? (
                        <span className="btn-icon concluido" title="Concluída">
                          <IconConcluir />
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={(e) => { e.stopPropagation(); handleConcluir(venda.id); }}
                          disabled={concluindo}
                          title="Concluir/Entregar"
                        >
                          <IconConcluir />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalhesAberto && (
        <ModalDetalhes
          venda={vendaSelecionada}
          onClose={() => { setDetalhesAberto(false); setVendaSelecionada(null); }}
        />
      )}
    </section>
  );
}