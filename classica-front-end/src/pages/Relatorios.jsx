import { useState } from 'react';

function Aviso({ text, onClose }) {
  return (
    <div className="aviso">
      {text}
      <button type="button" onClick={onClose}>×</button>
    </div>
  );
}

export default function Relatorios() {
  const [notice, setNotice] = useState('');

  const generateReport = (event) => {
    event.preventDefault();
    setNotice('Relatório preparado para download.');
  };

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Operação</p>
          <h1>Relatórios</h1>
          <p>Gere visões rápidas para apoiar suas decisões.</p>
        </div>
      </div>

      {notice && <Aviso text={notice} onClose={() => setNotice('')} />}

      <div className="superficie superficie-formulario">
        <form onSubmit={generateReport}>
          <label>
            Loja
            <select><option>Todas as lojas</option></select>
          </label>

          <label>
            Tipo de relatório
            <select>
              <option>Posição de estoque</option>
              <option>Movimentações do período</option>
            </select>
          </label>

          <button className="primario" type="submit">Gerar relatório</button>
        </form>
      </div>
    </section>
  );
}