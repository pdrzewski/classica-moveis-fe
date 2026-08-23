import { useState } from 'react';
import { Notice } from './Estoque';

export default function Relatorios() {
  const [notice, setNotice] = useState('');
  const generateReport = (event) => {
    event.preventDefault();
    setNotice('Relatório preparado para download.');
  };

  return (
    <section className="workspace">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Operação</p>
          <h1>Relatórios</h1>
          <p>Gere visões rápidas para apoiar suas decisões.</p>
        </div>
      </div>
      {notice && <Notice text={notice} close={() => setNotice('')} />}
      <div className="surface form-surface">
        <form onSubmit={generateReport}>
          <label>
            Loja
            <select><option>Todas as lojas</option><option>Clássica Centro</option></select>
          </label>
          <label>
            Tipo de relatório
            <select><option>Posição de estoque</option><option>Movimentações do período</option></select>
          </label>
          <button className="primary" type="submit">Gerar relatório</button>
        </form>
      </div>
    </section>
  );
}