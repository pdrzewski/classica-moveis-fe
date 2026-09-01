import { useState } from 'react';

function Aviso({ text, onClose }) {
  return (
    <div className="aviso">
      {text}
      <button type="button" onClick={onClose}>×</button>
    </div>
  );
}

export default function Historico() {
  const [notice, setNotice] = useState('');

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Operação</p>
          <h1>Histórico</h1>
          <p>Consulte as movimentações recentes.</p>
        </div>
      </div>

      {notice && <Aviso text={notice} onClose={() => setNotice('')} />}

      <div className="superficie superficie-tabela">
        <div className="filtros">
          <select><option>Todas as lojas</option></select>
          <select>
            <option>Entradas e saídas</option>
            <option>Entradas</option>
            <option>Saídas</option>
          </select>
        </div>

        <div className="lista-historico">
          <p>Nenhuma movimentação registrada.</p>
        </div>
      </div>
    </section>
  );
}