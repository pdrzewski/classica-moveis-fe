import MovimentacaoForm from '../components/MovimentacaoForm';
import { useParams } from 'react-router-dom';
import { movimentacaoConfigs } from './movimentacaoConfig';

export default function Movimentacao() {
  const { tipo } = useParams();
  const config = movimentacaoConfigs[tipo] || movimentacaoConfigs.compra;

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Movimentações</p>
          <h1>{config.label}</h1>
          <p>Registre uma movimentação de {config.direcao === 'ENTRADA' ? 'entrada' : 'saída'} com os dados da operação.</p>
        </div>
      </div>

      <MovimentacaoForm
        key={tipo}
        tipoInicial={config.value}
        tipoLabel={config.label}
        direcaoInicial={config.direcao}
      />
    </section>
  );
}