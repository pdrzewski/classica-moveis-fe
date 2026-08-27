import { useState } from 'react';

const stock = [
  ['Sofá Viena 3 lugares', 'Clássica Centro', '24', 'Em estoque'],
  ['Mesa Oslo 6 lugares', 'Clássica Norte', '7', 'Estoque baixo'],
  ['Cama Aurora queen', 'Clássica Centro', '0', 'Sem estoque'],
];

export default function Estoque() {
  const [notice, setNotice] = useState('');
  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Operação</p>
          <h1>Estoque</h1>
          <p>Acompanhe os níveis de produtos por loja.</p>
        </div>
        <button className="primario" onClick={() => setNotice('Exportação iniciada.')}>
          ↓ Exportar PDF
        </button>
      </div>
      {notice && <Notice text={notice} close={() => setNotice('')} />}
      <div className="superficie superficie-tabela">
        <div className="filtros">
          <input placeholder="Buscar produto..." />
          <select><option>Todas as lojas</option><option>Clássica Centro</option><option>Clássica Norte</option></select>
          <select><option>Todos os status</option><option>Estoque baixo</option></select>
        </div>
        <div className="envoltorio-tabela">
          <table>
            <thead><tr><th>Produto</th><th>Loja</th><th>Quantidade</th><th>Status</th></tr></thead>
            <tbody>
              {stock.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={index}>{index === 3 ? <span className={`etiqueta-estoque ${cell === 'Sem estoque' ? 'vazio' : cell === 'Estoque baixo' ? 'baixo' : ''}`}>{cell}</span> : cell}</td>
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
  return <div className="aviso">{text}<button onClick={close}>×</button></div>;
}