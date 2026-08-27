import { useState } from 'react';
import { Notice } from './Estoque';

export default function Movimentacao() {
  const [notice, setNotice] = useState('');
  const saveMovement = (event) => {
    event.preventDefault();
    setNotice('Registro salvo com sucesso.');
  };

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Operação</p>
          <h1>Movimentação</h1>
          <p>Registre entradas e saídas com rastreabilidade.</p>
        </div>
      </div>
      {notice && <Notice text={notice} close={() => setNotice('')} />}
      <div className="superficie superficie-formulario">
        <form onSubmit={saveMovement}>
          <div className="direcao">
            <button type="button" className="selecionado">↑ Entrada</button>
            <button type="button">↓ Saída</button>
          </div>
          <label>
            Loja
            <select><option>Clássica Centro</option><option>Clássica Norte</option></select>
          </label>
          <label>
            Produtos e quantidades
            <textarea placeholder="Selecione os produtos e informe as quantidades..." />
          </label>
          <button className="primario" type="submit">Registrar movimentação</button>
        </form>
      </div>
    </section>
  );
}