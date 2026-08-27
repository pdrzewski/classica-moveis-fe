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
    <div className="shell-aplicacao">
      <header className="barra-topo">
        <button className={`alternador-menu ${open ? 'aberto' : ''}`} onClick={() => setOpen(!open)} aria-label="Abrir menu">
          <span /><span /><span />
        </button>
        <img src={logo} alt="Clássica Móveis" className="marca-logo" />
        <div className="migalha"><strong>{title}</strong><span>Clássica Móveis / {title}</span></div>
        <div className="usuario-pilula"><span className="avatar">CM</span><span>Administrador</span></div>
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
        {menuItems.slice(1).map(([path, label], index) => (
          <NavLink key={path} to={path} onClick={() => setOpen(false)} className={({ isActive }) => `link-lateral ${isActive ? 'ativo' : ''}`}>
            <span>{['▤', '⇄', '◷', '▥'][index]}</span> {label}
          </NavLink>
        ))}
        <div className="rodape-barra-lateral"><span className="ponto-status" /> Sistema online</div>
      </aside>
      {open && <button className="fundo" onClick={() => setOpen(false)} aria-label="Fechar menu" />}
      <main className="conteudo-pagina"><Outlet /></main>
    </div>
  );
}