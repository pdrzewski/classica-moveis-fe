import { useState } from 'react';

const stock = [
  ['Sofá Viena 3 lugares', 'Clássica Centro', '24', 'Em estoque'],
  ['Mesa Oslo 6 lugares', 'Clássica Norte', '7', 'Estoque baixo'],
  ['Cama Aurora queen', 'Clássica Centro', '0', 'Sem estoque'],
];

export default function Estoque() {
  const [notice, setNotice] = useState('');
  return (
    <section className="workspace">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Operação</p>
          <h1>Estoque</h1>
          <p>Acompanhe os níveis de produtos por loja.</p>
        </div>
        <button className="primary" onClick={() => setNotice('Exportação iniciada.')}>
          ↓ Exportar PDF
        </button>
      </div>
      {notice && <Notice text={notice} close={() => setNotice('')} />}
      <div className="surface table-surface">
        <div className="filters">
          <input placeholder="Buscar produto..." />
          <select><option>Todas as lojas</option><option>Clássica Centro</option><option>Clássica Norte</option></select>
          <select><option>Todos os status</option><option>Estoque baixo</option></select>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Produto</th><th>Loja</th><th>Quantidade</th><th>Status</th></tr></thead>
            <tbody>
              {stock.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={index}>{index === 3 ? <span className={`stock-tag ${cell === 'Sem estoque' ? 'empty' : cell === 'Estoque baixo' ? 'low' : ''}`}>{cell}</span> : cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function Notice({ text, close }) {
  return <div className="notice">{text}<button onClick={close}>×</button></div>;
}