import { useState } from 'react';
import { Notice } from './Estoque';

function HistoryRow({ icon, title, meta, value }) {
  return (
    <div className="history-row">
      <span className="history-icon">{icon}</span>
      <div><strong>{title}</strong><small>{meta}</small></div>
      <b>{value}</b>
    </div>
  );
}

export default function Historico() {
  const [notice, setNotice] = useState('');
  return (
    <section className="workspace">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Operação</p>
          <h1>Histórico</h1>
          <p>Consulte as movimentações recentes.</p>
        </div>
      </div>
      {notice && <Notice text={notice} close={() => setNotice('')} />}
      <div className="surface table-surface">
        <div className="filters">
          <select><option>Todas as lojas</option></select>
          <select><option>Entradas e saídas</option><option>Entradas</option><option>Saídas</option></select>
        </div>
        <div className="history-list">
          <HistoryRow icon="↑" title="Entrada de mercadorias" meta="Clássica Centro · Hoje, 09:42" value="+ 12 itens" />
          <HistoryRow icon="↓" title="Saída para venda" meta="Clássica Norte · Ontem, 16:20" value="− 3 itens" />
          <HistoryRow icon="↑" title="Entrada de mercadorias" meta="Clássica Centro · 21 ago, 11:05" value="+ 8 itens" />
        </div>
      </div>
    </section>
  );
}