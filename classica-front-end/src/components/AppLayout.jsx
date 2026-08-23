import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import logo from '../assets/Clássica(1).png';

const cadastroItems = [
  ['funcionario', 'Funcionários'],
  ['categoria', 'Categorias'],
  ['fornecedora', 'Fornecedoras'],
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
  const [open, setOpen] = useState(false);
  const [cadastroOpen, setCadastroOpen] = useState(true);
  const location = useLocation();
  const current = location.pathname.split('/').filter(Boolean).pop();
  const labels = {
    home: 'Início', estoque: 'Estoque', movimentacao: 'Movimentação',
    historico: 'Histórico', relatorios: 'Relatórios',
    ...Object.fromEntries(cadastroItems),
  };
  const title = labels[current] || 'Início';

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className={`menu-toggle ${open ? 'is-open' : ''}`} onClick={() => setOpen(!open)} aria-label="Abrir menu">
          <span /><span /><span />
        </button>
        <img src={logo} alt="Clássica Móveis" className="brand-mark" />
        <div className="crumb"><strong>{title}</strong><span>Clássica Móveis / {title}</span></div>
        <div className="user-pill"><span className="avatar">CM</span><span>Administrador</span></div>
      </header>
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-heading">Navegação</div>
        <NavLink to="/home" onClick={() => setOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
          <span>⌂</span> Início
        </NavLink>
        <button className="side-link side-button" onClick={() => setCadastroOpen(!cadastroOpen)}>
          <span>▦</span> Cadastros <b>{cadastroOpen ? '−' : '+'}</b>
        </button>
        <div className={`submenu ${cadastroOpen ? 'expanded' : ''}`}>
          {cadastroItems.map(([key, label]) => (
            <NavLink key={key} to={`/cadastro/${key}`} onClick={() => setOpen(false)} className={({ isActive }) => isActive ? 'active' : ''}>
              {label}
            </NavLink>
          ))}
        </div>
        {menuItems.slice(1).map(([path, label], index) => (
          <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <span>{['▤', '⇄', '◷', '▥'][index]}</span> {label}
          </NavLink>
        ))}
        <div className="sidebar-footer"><span className="status-dot" /> Sistema online</div>
      </aside>
      {open && <button className="backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
      <main className="page-content"><Outlet /></main>
    </div>
  );
}