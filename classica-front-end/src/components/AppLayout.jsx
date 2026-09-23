import { useEffect, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const [cadastroOpen, setCadastroOpen] = useState(true);
  const [movimentacaoOpen, setMovimentacaoOpen] = useState(true);
  const [tiposMovimentacao, setTiposMovimentacao] = useState(movimentacaoItems);
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

  const movimentacaoEntradas = tiposMovimentacao.filter(([key]) => movimentacaoConfigs[key]?.direcao === 'ENTRADA');
  const movimentacaoSaidas = tiposMovimentacao.filter(([key]) => movimentacaoConfigs[key]?.direcao === 'SAIDA');

  const nomeUsuario = usuario?.nome || usuario?.login || 'Administrador';
  const iniciais = nomeUsuario.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="shell-aplicacao">
      <header className="barra-topo">
        <button className={`alternador-menu ${open ? 'aberto' : ''}`} onClick={() => setOpen(!open)} aria-label="Abrir menu">
          <span /><span /><span />
        </button>
        <img src={logo} alt="Clássica Móveis" className="marca-logo" />
        <div className="migalha"><strong>{title}</strong><span>Clássica Móveis / {title}</span></div>
        <div className="usuario-pilula"><span className="avatar">{iniciais || 'CM'}</span><span>{nomeUsuario}</span></div>
      </header>
      <aside className={`barra-lateral ${open ? 'aberto' : ''}`}>
        <div className="titulo-barra-lateral">Navegação</div>
        <NavLink to="/home" onClick={() => setOpen(false)} className={({ isActive }) => `link-lateral ${isActive ? 'ativo' : ''}`}>
          <span>⌂</span> Início
        </NavLink>
        <button className="link-lateral botao-lateral" onClick={() => setCadastroOpen(!cadastroOpen)}>
          <span>▦</span> Cadastros <b>{cadastroOpen ? '−' : '+'}</b>
        </button>
        <div className={`submenu ${cadastroOpen ? 'expandido' : ''}`}>
          {cadastroItems.map(([key, label]) => (
            <NavLink key={key} to={`/cadastro/${key}`} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'ativo' : ''}>
              {label}
            </NavLink>
          ))}
        </div>
        <NavLink to="/estoque" onClick={() => setOpen(false)} className={({ isActive }) => `link-lateral ${isActive ? 'ativo' : ''}`}>
          <span>▤</span> Estoque
        </NavLink>
        <button className="link-lateral botao-lateral" onClick={() => setMovimentacaoOpen(!movimentacaoOpen)}>
          <span>⇄</span> Movimentações <b>{movimentacaoOpen ? '−' : '+'}</b>
        </button>
        <div className={`submenu ${movimentacaoOpen ? 'expandido' : ''}`}>
          <div className="submenu-grupo">
            <span className="submenu-grupo-titulo">Entre lojas</span>
            <NavLink to="/movimentacao/transferencia" onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'ativo' : ''}>
              Transferência entre lojas
            </NavLink>
          </div>
          <div className="submenu-grupo">
            <span className="submenu-grupo-titulo">Entradas</span>
            {movimentacaoEntradas.map(([key, label]) => (
              <NavLink key={key} to={`/movimentacao/${key}`} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'ativo' : ''}>
                {label}
              </NavLink>
            ))}
          </div>
          <div className="submenu-grupo">
            <span className="submenu-grupo-titulo">Saídas</span>
            {movimentacaoSaidas.map(([key, label]) => (
              <NavLink key={key} to={`/movimentacao/${key}`} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'ativo' : ''}>
                {label}
              </NavLink>
            ))}
          </div>
        </div>
        {menuItems.slice(3).map(([path, label], index) => (
          <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => `link-lateral ${isActive ? 'ativo' : ''}`}>
            <span>{['◷', '▥'][index]}</span> {label}
          </NavLink>
        ))}
        <div className="rodape-barra-lateral"><span className="ponto-status" /> Sistema online</div>
      </aside>
      {open && <button className="fundo" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
      <main className="conteudo-pagina"><Outlet /></main>
    </div>
  );
}