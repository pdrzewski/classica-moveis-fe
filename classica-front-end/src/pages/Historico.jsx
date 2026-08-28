import { useState } from 'react';
import { Notice } from './Estoque';

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
      {notice && <Notice text={notice} close={() => setNotice('')} />}
      <div className="superficie superficie-tabela">
        <div className="filtros">
          <select><option>Todas as lojas</option></select>
          <select><option>Entradas e saídas</option><option>Entradas</option><option>Saídas</option></select>
        </div>
        <div className="lista-historico"><p>Nenhuma movimentação registrada.</p></div>
      </div>
    </section>
  );
}