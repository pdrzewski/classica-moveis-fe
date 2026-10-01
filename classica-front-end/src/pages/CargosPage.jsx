import { useCallback, useEffect, useState } from 'react';
import api from '../services/Api';

const IconGerenciar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconFechar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const ModalPermissoes = ({ cargo, permissoes, permissoesDoCargo, onClose, onSave, carregando }) => {
  const [permissoesSelecionadas, setPermissoesSelecionadas] = useState(permissoesDoCargo || []);

  const handleToggle = (permissaoId) => {
    setPermissoesSelecionadas((prev) =>
      prev.includes(permissaoId)
        ? prev.filter((id) => id !== permissaoId)
        : [...prev, permissaoId]
    );
  };

  const handleSave = async () => {
    try {
      await onSave(cargo.id, permissoesSelecionadas);
    } catch (err) {
      console.error('Erro ao salvar permissões:', err);
    }
  };

  const permissoesAgrupadas = permissoes.reduce((acc, p) => {
    const grupo = p.grupo || 'Outros';
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(p);
    return acc;
  }, {});

  return (
    <div className="camada-modal">
      <div className="cartao-modal modal-permissoes">
        <button type="button" className="fechar" onClick={onClose}><IconFechar /></button>
        <p className="titulo-pequeno">{cargo.nome}</p>
        <h2>Gerenciar Permissões</h2>
        <div className="permissoes-lista">
          {Object.entries(permissoesAgrupadas).map(([grupo, items]) => (
            <div key={grupo} className="permissao-grupo">
              <h3 className="permissao-grupo-titulo">{grupo}</h3>
              <div className="permissao-itens">
                {items.map((p) => (
                  <label key={p.id} className="permissao-item">
                    <input
                      type="checkbox"
                      checked={permissoesSelecionadas.includes(p.id)}
                      onChange={() => handleToggle(p.id)}
                      disabled={carregando}
                    />
                    <span className="permissao-nome">{p.nome}</span>
                    {p.descricao && <span className="permissao-descricao">{p.descricao}</span>}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="acoes-form">
          <button type="button" className="secundario" onClick={onClose} disabled={carregando}>Cancelar</button>
          <button type="button" className="primario" onClick={handleSave} disabled={carregando}>
            {carregando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CargosPage() {
  const [cargos, setCargos] = useState([]);
  const [permissoes, setPermissoes] = useState([]);
  const [query, setQuery] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [cargoSelecionado, setCargoSelecionado] = useState(null);
  const [permissoesDoCargo, setPermissoesDoCargo] = useState([]);
  const [carregandoPermissoes, setCarregandoPermissoes] = useState(false);

  const carregarCargos = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const resp = await api.get('/cargos').catch(() => api.get('/api/cargos'));
      const dados = resp?.data;
      const lista = Array.isArray(dados) ? dados : dados?.content || dados?.dados || [];
      setCargos(lista);
    } catch (err) {
      setCargos([]);
      setErro(err.response?.data?.message || 'Não foi possível carregar os cargos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarPermissoes = useCallback(async () => {
    try {
      const resp = await api.get('/permissoes').catch(() => api.get('/api/permissoes'));
      const dados = resp?.data;
      const lista = Array.isArray(dados) ? dados : dados?.content || dados?.dados || [];
      setPermissoes(lista);
    } catch {
      setPermissoes([]);
    }
  }, []);

  useEffect(() => {
    carregarCargos();
    carregarPermissoes();
  }, [carregarCargos, carregarPermissoes]);

  const abrirGerenciar = async (cargo) => {
    setCargoSelecionado(cargo);
    setCarregandoPermissoes(true);
    try {
      const resp = await api.get(`/cargos/${cargo.id}/permissoes`).catch(() => api.get(`/api/cargos/${cargo.id}/permissoes`));
      const dados = resp?.data;
      const lista = Array.isArray(dados) ? dados.map((p) => p.id) : dados?.permissoesIds || dados?.permissoes?.map((p) => p.id) || [];
      setPermissoesDoCargo(lista);
    } catch {
      setPermissoesDoCargo([]);
    } finally {
      setCarregandoPermissoes(false);
      setModalAberto(true);
    }
  };

  const salvarPermissoes = async (cargoId, permissoesIds) => {
    setCarregandoPermissoes(true);
    try {
      await api.put(`/cargos/${cargoId}/permissoes`, { permissoesIds }).catch(() => api.put(`/api/cargos/${cargoId}/permissoes`, { permissoesIds }));
      setModalAberto(false);
      setCargoSelecionado(null);
      carregarCargos();
    } catch (err) {
      throw err;
    } finally {
      setCarregandoPermissoes(false);
    }
  };

  const fecharModal = () => {
    setModalAberto(false);
    setCargoSelecionado(null);
    setPermissoesDoCargo([]);
  };

  const cargosFiltrados = cargos.filter((cargo) =>
    cargo.nome?.toLowerCase().includes(query.toLowerCase()) ||
    String(cargo.id).includes(query)
  );

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Cadastros</p>
          <h1>Cargos</h1>
          <p>Gerencie os cargos e suas permissões.</p>
        </div>
      </div>

      <div className="superficie superficie-tabela">
        <div className="barra-ferramentas-tabela">
          <div>
            <strong>{cargos.length} cargos</strong>
            <small>{carregando ? 'Carregando...' : 'Dados do banco de dados'}</small>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cargo..."
          />
        </div>

        <div className="envoltorio-tabela">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Permissões</th>
                <th className="acoes-linha">Ações</th>
              </tr>
            </thead>
            <tbody>
              {cargosFiltrados.map((cargo, index) => (
                <tr key={cargo.id ?? index}>
                  <td>{cargo.id}</td>
                  <td>{cargo.nome}</td>
                  <td>
                    <span className="badge-permissoes">{cargo.permissoes?.length || cargo.permissoesIds?.length || 0} permissões</span>
                  </td>
                  <td className="acoes-linha">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirGerenciar(cargo);
                      }}
                      title="Gerenciar permissões"
                      disabled={carregandoPermissoes}
                    >
                      <IconGerenciar />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && !erro && cargosFiltrados.length === 0 && <p className="tabela-vazia">Nenhum cargo encontrado.</p>}
          {erro && <p className="erro tabela-vazia">{erro}</p>}
        </div>
      </div>

      {modalAberto && cargoSelecionado && (
        <ModalPermissoes
          cargo={cargoSelecionado}
          permissoes={permissoes}
          permissoesDoCargo={permissoesDoCargo}
          onClose={fecharModal}
          onSave={salvarPermissoes}
          carregando={carregandoPermissoes}
        />
      )}
    </section>
  );
}