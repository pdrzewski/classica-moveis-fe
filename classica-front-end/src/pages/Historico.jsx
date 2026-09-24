import { useEffect, useState, useMemo } from 'react';
import api from '../services/Api';
import { movimentacaoConfigs } from './movimentacaoConfig';

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

const getTipoLabel = (tipo) => {
  const config = Object.values(movimentacaoConfigs).find((c) => c.value === tipo);
  return config?.label || tipo;
};

const getStatusClass = (status) => {
  if (status === 'CONCLUIDO') return '';
  if (status === 'CANCELADO') return 'baixo';
  return 'baixo';
};

const ModalDetalhes = ({ movimentacao, onClose }) => {
  if (!movimentacao) return null;

  const itens = movimentacao.itens || [];
  const totalItens = itens.reduce((sum, item) => sum + Number(item.quantidade || 0), 0);
  const valorTotal = itens.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);

  return (
    <div className="camada-modal">
      <div className="cartao-modal modal-detalhes" style={{ maxWidth: '700px' }}>
        <button type="button" className="fechar" onClick={onClose}><IconDetalhes /></button>
        <p className="titulo-pequeno">Movimentação #{movimentacao.id}</p>
        <h2>{getTipoLabel(movimentacao.tipoMovimentacao)}</h2>

        <div className="detalhes-grid" style={{ marginBottom: '24px' }}>
          <div className="detalhe-item">
            <span>Data/Hora</span>
            <strong>{formatarData(movimentacao.dataHora)}</strong>
          </div>
          <div className="detalhe-item">
            <span>Status</span>
            <strong><span className={`etiqueta-estoque ${getStatusClass(movimentacao.status)}`}>{movimentacao.status}</span></strong>
          </div>
          <div className="detalhe-item">
            <span>Colaborador</span>
            <strong>{movimentacao.colaboradorNome || '—'}</strong>
          </div>
          <div className="detalhe-item">
            <span>Loja origem</span>
            <strong>{movimentacao.estabelecimentoOrigemNome || '—'}</strong>
          </div>
          <div className="detalhe-item">
            <span>Loja destino</span>
            <strong>{movimentacao.estabelecimentoDestinoNome || '—'}</strong>
          </div>
          <div className="detalhe-item">
            <span>Cliente</span>
            <strong>{movimentacao.clienteNome || '—'}</strong>
          </div>
          <div className="detalhe-item">
            <span>Forma de pagamento</span>
            <strong>{movimentacao.formaPagamento || '—'}</strong>
          </div>
          <div className="detalhe-item">
            <span>Total itens</span>
            <strong>{movimentacao.itens?.reduce((s, i) => s + Number(i.quantidade || 0), 0) || 0}</strong>
          </div>
          <div className="detalhe-item">
            <span>Valor total</span>
            <strong>R$ {formatarMoeda(movimentacao.valorTotal)}</strong>
          </div>
          {movimentacao.observacao && (
            <div className="detalhe-item" style={{ gridColumn: '1 / -1' }}>
              <span>Observação</span>
              <strong>{movimentacao.observacao}</strong>
            </div>
          )}
        </div>

        <h3 style={{ marginBottom: '12px' }}>Itens ({movimentacao.itens?.length || 0})</h3>
        <div className="envoltorio-tabela">
          <table className="tabela-estoque">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Quantidade</th>
                <th>Valor unitário</th>
                <th>Desconto</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {movimentacao.itens?.map((item) => (
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', gap: '12px' }}>
          <button type="button" className="secundario" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

const IconDetalhes = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export default function Historico() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [lojas, setLojas] = useState([]);
  const [estabelecimentoFiltro, setEstabelecimentoFiltro] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [detalhesAberto, setDetalhesAberto] = useState(false);
  const [movimentacaoSelecionada, setMovimentacaoSelecionada] = useState(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  const tiposMovimentacao = Object.values(movimentacaoConfigs).map((c) => ({
    value: c.value,
    label: c.label,
  }));

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

  const carregarHistorico = async () => {
    setCarregando(true);
    setErro('');
    try {
      const resp = await api.get('/movimentacoes/historico').catch(() => api.get('/api/movimentacoes/historico'));
      setMovimentacoes(listarDados(resp));
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível carregar o histórico.');
      setMovimentacoes([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  const handleVerDetalhes = async (mov) => {
    setCarregandoDetalhes(true);
    try {
      const resp = await api.get(`/movimentacoes/${mov.id}`).catch(() => api.get(`/api/movimentacoes/${mov.id}`));
      const detalhes = listarDados(resp);
      if (detalhes.length) {
        setMovimentacaoSelecionada(detalhes[0]);
      } else {
        setMovimentacaoSelecionada(mov);
      }
      setDetalhesAberto(true);
    } catch (err) {
      setMovimentacaoSelecionada(mov);
      setDetalhesAberto(true);
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const filtradas = useMemo(() => {
    return movimentacoes.filter((mov) => {
      if (estabelecimentoFiltro && String(mov.estabelecimentoOrigemId) !== String(estabelecimentoFiltro)) {
        return false;
      }
      if (tipoFiltro && mov.tipoMovimentacao !== tipoFiltro) {
        return false;
      }
      if (dataInicio) {
        const dataMov = new Date(mov.dataHora);
        const inicio = new Date(dataInicio);
        inicio.setHours(0, 0, 0, 0);
        if (dataMov < inicio) return false;
      }
      if (dataFim) {
        const dataMov = new Date(mov.dataHora);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        if (dataMov > fim) return false;
      }
      return true;
    });
  }, [movimentacoes, estabelecimentoFiltro, tipoFiltro, dataInicio, dataFim]);

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Operação</p>
          <h1>Histórico de movimentações</h1>
          <p>Consulte todas as transações de estoque do sistema.</p>
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
          <div className="filtro-select-wrapper" style={{ minWidth: '220px' }}>
            <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.values(movimentacaoConfigs).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
        </div>

        {erro && <div className="aviso" style={{ padding: '12px 24px' }}>{erro}</div>}

        <div className="envoltorio-tabela">
          <table className="tabela-estoque">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Data</th>
                <th>Loja origem</th>
                <th>Loja destino</th>
                <th>Total itens</th>
                <th>Status</th>
                <th style={{ width: '80px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Carregando histórico...</td></tr>
              ) : filtradas.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Nenhuma movimentação encontrada.</td></tr>
              ) : (
                filtradas.map((mov) => (
                  <tr key={mov.id} style={{ cursor: 'pointer' }} onClick={() => handleVerDetalhes(mov)}>
                    <td><span className={`etiqueta-estoque`} style={{ background: 'var(--orange-light)', color: 'var(--orange-dark)', borderColor: 'var(--orange)' }}>{getTipoLabel(mov.tipoMovimentacao)}</span></td>
                    <td>{formatarData(mov.dataHora)}</td>
                    <td>{mov.estabelecimentoOrigemNome || '—'}</td>
                    <td>{mov.estabelecimentoDestinoNome || '—'}</td>
                    <td>{mov.itens?.reduce((s, i) => s + Number(i.quantidade || 0), 0) || 0}</td>
                    <td><span className={`etiqueta-estoque ${getStatusClass(mov.status)}`}>{mov.status}</span></td>
                    <td>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); handleVerDetalhes(mov); }}
                        title="Ver detalhes"
                      >
                        <IconDetalhes />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detalhesAberto && (
        <div className="camada-modal">
          {carregandoDetalhes ? (
            <div className="cartao-modal modal-detalhes" style={{ maxWidth: '700px' }}>
              <div style={{ padding: '40px', textAlign: 'center' }}>Carregando detalhes...</div>
            </div>
          ) : (
            <ModalDetalhes
              movimentacao={movimentacaoSelecionada}
              onClose={() => { setDetalhesAberto(false); setMovimentacaoSelecionada(null); }}
            />
          )}
        </div>
      )}
    </section>
  );
}