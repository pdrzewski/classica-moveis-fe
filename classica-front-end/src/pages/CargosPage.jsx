import { useCallback, useEffect, useState } from 'react';
import api from '../services/Api';

const rotulosPermissoes = {
  ADMIN_TOTAL: 'Acesso administrativo total',
  GERENCIAR_ESTOQUE: 'Gerenciar estoque',
  REGISTRAR_VENDA: 'Registrar vendas',
  VISUALIZAR_RELATORIOS: 'Visualizar relatórios',
};

const rotulosTermos = {
  ADMIN: 'administração',
  RELATORIO: 'relatório',
  RELATORIOS: 'relatórios',
  PERMISSAO: 'permissão',
  PERMISSOES: 'permissões',
  ESTOQUE: 'estoque',
  VENDA: 'venda',
  VENDAS: 'vendas',
  USUARIO: 'usuário',
  USUARIOS: 'usuários',
  PRODUTO: 'produto',
  PRODUTOS: 'produtos',
  CATEGORIA: 'categoria',
  CATEGORIAS: 'categorias',
  CLIENTE: 'cliente',
  CLIENTES: 'clientes',
  FORNECEDOR: 'fornecedor',
  FORNECEDORES: 'fornecedores',
  FUNCIONARIO: 'funcionário',
  FUNCIONARIOS: 'funcionários',
  MOVIMENTACAO: 'movimentação',
  MOVIMENTACOES: 'movimentações',
  LOJA: 'loja',
  LOJAS: 'lojas',
  CARGO: 'cargo',
  CARGOS: 'cargos',
};

const obterNomePermissao = (permissao) => {
  if (typeof permissao === 'string') return permissao;
  return permissao?.nome || permissao?.permissao || permissao?.codigo || '';
};

const formatarRotulo = (valor) => {
  const original = String(valor || '').trim();
  if (!original) return 'Outros';
  if (rotulosPermissoes[original.toUpperCase()]) return rotulosPermissoes[original.toUpperCase()];

  const palavras = original
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((palavra, indice) => !(indice === 0 && ['ROLE', 'PERMISSION', 'PERMISSAO'].includes(palavra.toUpperCase())))
    .map((palavra) => rotulosTermos[palavra.toUpperCase()] || palavra.toLocaleLowerCase('pt-BR'));

  if (!palavras.length) return 'Outros';
  return palavras[0].charAt(0).toLocaleUpperCase('pt-BR') + palavras[0].slice(1) + (palavras.length > 1 ? ` ${palavras.slice(1).join(' ')}` : '');
};

const normalizarBusca = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR');

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
  const [filtro, setFiltro] = useState('');

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

  const termoBusca = normalizarBusca(filtro);
  const permissoesFiltradas = permissoes.filter((permissao) => {
    const nome = obterNomePermissao(permissao);
    const grupo = permissao.grupo || permissao.modulo || permissao.categoria || 'Outros';
    return !termoBusca || normalizarBusca(`${nome} ${formatarRotulo(nome)} ${grupo} ${permissao.descricao || ''}`).includes(termoBusca);
  });

  const permissoesAgrupadas = permissoesFiltradas.reduce((acc, permissao) => {
    const grupo = permissao.grupo || permissao.modulo || permissao.categoria || 'Outros';
    if (!acc[grupo]) acc[grupo] = [];
    acc[grupo].push(permissao);
    return acc;
  }, {});
  const gruposOrdenados = Object.entries(permissoesAgrupadas)
    .sort(([grupoA], [grupoB]) => formatarRotulo(grupoA).localeCompare(formatarRotulo(grupoB), 'pt-BR'))
    .map(([grupo, items]) => [
      grupo,
      items.sort((itemA, itemB) => formatarRotulo(obterNomePermissao(itemA)).localeCompare(formatarRotulo(obterNomePermissao(itemB)), 'pt-BR')),
    ]);

  return (
    <div className="camada-modal">
      <div className="cartao-modal modal-permissoes">
        <button type="button" className="fechar" onClick={onClose}><IconFechar /></button>
        <p className="titulo-pequeno">{cargo.nome}</p>
        <h2>Gerenciar Permissões</h2>
        <div className="permissoes-controles">
          <input
            type="search"
            value={filtro}
            onChange={(event) => setFiltro(event.target.value)}
            placeholder="Filtrar permissões..."
            aria-label="Filtrar permissões"
          />
          <span>{permissoesFiltradas.length} de {permissoes.length}</span>
          <span>{permissoesSelecionadas.length} selecionadas</span>
        </div>
        <div className="permissoes-lista">
          {gruposOrdenados.map(([grupo, items]) => (
            <div key={grupo} className="permissao-grupo">
              <h3 className="permissao-grupo-titulo">{formatarRotulo(grupo)}</h3>
              <div className="permissao-itens">
                {items.map((permissao) => (
                  <label key={permissao.id} className="permissao-item">
                    <input
                      type="checkbox"
                      checked={permissoesSelecionadas.includes(permissao.id)}
                      onChange={() => handleToggle(permissao.id)}
                      disabled={carregando}
                    />
                    <span className="permissao-conteudo">
                      <strong className="permissao-nome">{formatarRotulo(obterNomePermissao(permissao))}</strong>
                      {permissao.descricao && <span className="permissao-descricao">{permissao.descricao}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {gruposOrdenados.length === 0 && <p className="permissoes-vazias">Nenhuma permissão encontrada.</p>}
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
              </tr>
            </thead>
            <tbody>
              {cargosFiltrados.map((cargo, index) => (
                <tr key={cargo.id ?? index} style={{ cursor: 'pointer' }} onClick={() => abrirGerenciar(cargo)}>
                  <td>{cargo.id}</td>
                  <td>{cargo.nome}</td>
                  <td>
                    <span className="badge-permissoes">{cargo.permissoes?.length || cargo.permissoesIds?.length || 0} permissões</span>
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