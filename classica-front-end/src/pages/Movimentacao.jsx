import MovimentacaoForm from '../components/MovimentacaoForm';

export default function Movimentacao() {
  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Operação</p>
          <h1>Movimentação</h1>
          <p>Registre entradas e saídas de itens com o motivo correspondente para manter o controle do estoque.</p>
        </div>
      </div>

      <MovimentacaoForm />
    </section>
  );
}