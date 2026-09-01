import { useState } from 'react';

function Notice({ text, onClose }) {
  return (
    <div className="aviso">
      {text}
      <button type="button" onClick={onClose}>×</button>
    </div>
  );
}

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

        <button className="primario" onClick={() => setNotice('Exportação iniciada.')}>Exportar PDF</button>
      </div>

      {notice && <Notice text={notice} onClose={() => setNotice('')} />}

      <div className="superficie superficie-tabela">
        <div className="filtros">
          <input placeholder="Buscar produto..." />
          <select><option>Todas as lojas</option></select>
          <select><option>Todos os status</option></select>
        </div>

        <div className="envoltorio-tabela">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Loja</th>
                <th>Quantidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="4">Nenhum produto cadastrado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}