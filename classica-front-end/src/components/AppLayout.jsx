import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logo from '../assets/Clássica(1).png';
import api from '../services/Api';
import { criarMovimentacaoItems, movimentacaoConfigs, movimentacaoItems } from '../pages/movimentacaoConfig';
import { useAuth } from '../context/AuthContext';

const cadastroItems = [
  ['funcionario', 'Funcionários'],
  ['categoria', 'Categorias'],
  ['fornecedora', 'Fornecedoras'],
  ['cliente', 'Clientes'],
  ['produto', 'Produtos'],
  ['loja', 'Lojas'],
];
const menuItems = [
  ['/home', 'Início'],
  ['/estoque', 'Estoque'],
  ['/movimentacao', 'Movimentação'],
  ['/historico', 'Histórico'],
  ['/relatorios', 'Relatórios'],
];

export default function AppLayout() {
  const { usuario } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cadastroOpen, setCadastroOpen] = useState(true);
  const [movimentacaoOpen, setMovimentacaoOpen] = useState(true);
  const [tiposMovimentacao, setTiposMovimentacao] = useState(movimentacaoItems);
  const [notificacoes, setNotificacoes] = useState([]);
  const [notificacoesAbertas, setNotificacoesAbertas] = useState(false);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);
  const notificacoesRef = useRef(null);
  const location = useLocation();
  const current = location.pathname.split('/').filter(Boolean).pop();
  const labels = {
    home: 'Início', estoque: 'Estoque', movimentacao: 'Movimentação',
    historico: 'Histórico', relatorios: 'Relatórios',
    ...Object.fromEntries(cadastroItems),
    ...Object.fromEntries(tiposMovimentacao),
  };
  const title = labels[current] || 'Início';

  useEffect(() => {
    const carregarTiposMovimentacao = async () => {
      try {
        const resposta = await api.get('/movimentacoes').catch(() => api.get('/api/movimentacoes'));
        const dados = resposta?.data;
        const registros = Array.isArray(dados) ? dados : dados?.content || dados?.dados || [];
        const tiposDoBanco = criarMovimentacaoItems(registros);

        if (tiposDoBanco.length) setTiposMovimentacao(tiposDoBanco);
      } catch {
        // Mantém os tipos conhecidos se a API não estiver disponível.
      }
    };

    carregarTiposMovimentacao();
  }, []);

  const carregarNotificacoes = async () => {
    if (carregandoNotificacoes) return;
    setCarregandoNotificacoes(true);
    try {
      const resp = await api.get('/produtos/estoque-baixo').catch(() => api.get('/api/produtos/estoque-baixo'));
      const dados = Array.isArray(resp?.data) ? resp.data : resp?.data?.content || resp?.data?.dados || resp?.data || [];
      setNotificacoes(dados.slice(0, 10));
    } catch {
      setNotificacoes([]);
    } finally {
      setCarregandoNotificacoes(false);
    }
  };

  useEffect(() => {
    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificacoesRef.current && !notificacoesRef.current.contains(event.target)) {
        setNotificacoesAbertas(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nomeUsuario = usuario?.nome || usuario?.login || 'Administrador';
  const iniciais = nomeUsuario.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const IconHome = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconPackage = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconFolder = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><line x1="18" y1="13" x2="18" y2="13"/><line x1="6" y1="13" x2="6" y2="13"/><line x1="10" y1="13" x2="10" y2="13"/></svg>;
const IconRepeat = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
const IconClock = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconBarChart = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const IconTruck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/><path d="M5 17h14v-6.5a2.5 2.5 0 0 0-5 0V17"/></svg>;
const IconShoppingCart = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
const IconArrowUp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;
const IconArrowDown = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
const IconShoppingBag = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4"/><line x1="3" y1="6" x2="21" y2="6"/></svg>;

  const sidebarItems = [
    { key: 'home', icon: <IconHome />, label: 'Início', path: '/home' },
    { key: 'estoque', icon: <IconPackage />, label: 'Estoque', path: '/estoque' },
    { key: 'ajuste-estoque', icon: <IconRepeat />, label: 'Ajuste de Estoque', path: '/ajuste-estoque' },
    { key: 'vendas-pendentes', icon: <IconTruck />, label: 'Vendas pendentes', path: '/vendas-pendentes' },
    { key: 'transferencia', icon: <IconRepeat />, label: 'Transferência entre lojas', path: '/movimentacao/transferencia' },
    { key: 'compra', icon: <IconShoppingCart />, label: 'Compra', path: '/movimentacao/compra' },
    { key: 'ajuste-entrada', icon: <IconArrowUp />, label: 'Ajuste de entrada', path: '/movimentacao/ajuste-entrada' },
    { key: 'venda', icon: <IconShoppingBag />, label: 'Venda', path: '/movimentacao/venda' },
    { key: 'ajuste-saida', icon: <IconArrowDown />, label: 'Ajuste de saída', path: '/movimentacao/ajuste-saida' },
    { key: 'historico', icon: <IconClock />, label: 'Histórico', path: '/historico' },
    { key: 'relatorios', icon: <IconBarChart />, label: 'Relatórios', path: '/relatorios' },
    { key: 'cadastros', icon: <IconFolder />, label: 'Cadastros', path: '/cadastros', children: [
      { label: 'Cadastros', items: cadastroItems.map(([key, label]) => ({ key, label, path: `/cadastro/${key}` })) },
    ]},
  ];

  return (
    <div className="shell-aplicacao">
      <header className="barra-topo">
        <button 
          className={`alternador-menu ${sidebarOpen ? 'aberto' : ''}`} 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={sidebarOpen}
        >
          <span /><span /><span />
        </button>
        <NavLink to="/home" className="marca" aria-label="Clássica Móveis - Início">
          <img src={logo} alt="" className="marca-logo" />
          <span className="marca-nome">Clássica Móveis</span>
        </NavLink>
        <div className="breadcrumb" aria-label="Localização atual">
          <span className="breadcrumb-atual">{title}</span>
          <span className="breadcrumb-separador" aria-hidden="true">/</span>
          <span className="breadcrumb-app">Clássica Móveis</span>
        </div>
        <div className="acoes-topo">
          <div className="notificacoes-wrapper" ref={notificacoesRef}>
            <button 
              className={`btn-notificacoes ${notificacoes.length > 0 ? 'tem-notificacao' : ''}`}
              aria-label="Notificações" 
              title="Notificações"
              onClick={() => setNotificacoesAbertas((prev) => !prev)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {notificacoes.length > 0 && <span className="badge-notificacao">{notificacoes.length > 9 ? '9+' : notificacoes.length}</span>}
            </button>
            {notificacoesAbertas && (
              <div className="dropdown-notificacoes" role="menu">
                <div className="dropdown-cabecalho">
                  <h3>Alertas de Estoque</h3>
                  <button className="btn-atualizar" onClick={carregarNotificacoes} disabled={carregandoNotificacoes} aria-label="Atualizar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={carregandoNotificacoes ? 'girando' : ''}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                  </button>
                </div>
                <div className="dropdown-conteudo">
                  {carregandoNotificacoes ? (
                    <div className="dropdown-carregando">Carregando...</div>
                  ) : notificacoes.length === 0 ? (
                    <div className="dropdown-vazio">Nenhum produto com estoque baixo.</div>
                  ) : (
                    <ul className="dropdown-lista" role="list">
                      {notificacoes.map((item) => (
                        <li key={item.produto.id} className="dropdown-item" role="menuitem">
                          <div className="dropdown-item-info">
                            <strong>{item.produto.nome}</strong>
                            <span>SKU: {item.produto.sku}</span>
                          </div>
                          <div className="dropdown-item-estoque">
                            <span className="estoque-atual">{item.estoqueAtual}</span>
                            <span className="estoque-minimo">Mín: {item.produto.estoqueMinimo}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="dropdown-rodape">
                  <a href="/estoque" onClick={() => setNotificacoesAbertas(false)}>Ver todos no Estoque</a>
                </div>
              </div>
            )}
          </div>
          <div className="usuario-pilula">
            <span className="avatar">{iniciais || 'CM'}</span>
            <div className="usuario-info">
              <span className="usuario-nome">{nomeUsuario}</span>
              <span className="usuario-role">Administrador</span>
            </div>
          </div>
        </div>
      </header>
      
      <aside 
        className={`barra-lateral ${sidebarOpen ? 'aberta' : ''}`} 
        aria-label="Menu de navegação principal"
        role="navigation"
      >
        <nav className="sidebar-nav">
          <div className="sidebar-header">
            <span className="sidebar-titulo">Navegação</span>
            <button 
              className="sidebar-fechar" 
              onClick={() => setSidebarOpen(false)} 
              aria-label="Fechar menu lateral"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          
          <ul className="sidebar-lista" role="list">
            {sidebarItems.map((item) => (
              <li key={item.key} className="sidebar-item">
                {item.children ? (
                  <>
                    <button 
                      className={`sidebar-link sidebar-pai ${cadastroOpen || movimentacaoOpen ? 'expandido' : ''}`}
                      onClick={() => {
                        if (item.key === 'cadastros') setCadastroOpen(!cadastroOpen);
                        if (item.key === 'movimentacao') setMovimentacaoOpen(!movimentacaoOpen);
                      }}
                      aria-expanded={item.key === 'cadastros' ? cadastroOpen : movimentacaoOpen}
                    >
                      <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                      <span className="sidebar-label">{item.label}</span>
                      <svg className="sidebar-seta" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <ul className={`sidebar-sublista ${(item.key === 'cadastros' ? cadastroOpen : movimentacaoOpen) ? 'expandida' : ''}`} role="list">
                      {item.children.map((grupo) => (
                        <li key={grupo.label} className="sidebar-grupo">
                          <span className="sidebar-grupo-titulo">{grupo.label}</span>
                          {grupo.items.map((subItem) => (
                            <NavLink 
                              key={subItem.key} 
                              to={subItem.path} 
                              onClick={() => setSidebarOpen(false)}
                              className={({ isActive }) => `sidebar-sublink ${isActive ? 'ativo' : ''}`}
                            >
                              {subItem.label}
                            </NavLink>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <NavLink 
                    to={item.path} 
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'ativo' : ''}`}
                  >
                    <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
          
          <div className="sidebar-rodape">
            <div className="sidebar-status">
              <span className="ponto-status" aria-hidden="true" />
              <span>Sistema online</span>
            </div>
            <div className="sidebar-versao">v1.0.0</div>
          </div>
        </nav>
      </aside>
      
      {sidebarOpen && <button className="overlay" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />}
      <main className="conteudo-pagina"><Outlet /></main>
    </div>
  );
}