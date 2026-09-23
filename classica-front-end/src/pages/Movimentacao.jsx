import MovimentacaoForm from '../components/MovimentacaoForm';
import TransferenciaForm from '../components/TransferenciaForm';
import CompraForm from '../components/CompraForm';
import { useParams } from 'react-router-dom';
import { movimentacaoConfigs } from './movimentacaoConfig';

export default function Movimentacao() {
  const { tipo } = useParams();
  const config = movimentacaoConfigs[tipo] || movimentacaoConfigs.compra;
  const isTransferencia = tipo === 'transferencia';
  const isCompra = tipo === 'compra';

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Movimentações</p>
          <h1>{config.label}</h1>
          <p>{isTransferencia ? 'Transfira produtos entre as lojas cadastradas.' : isCompra ? 'Registre uma compra de mercadoria do fornecedor.' : `Registre uma movimentação de ${config.direcao === 'ENTRADA' ? 'entrada' : 'saída'} com os dados da operação.`}</p>
        </div>
      </div>

      {isTransferencia ? (
        <TransferenciaForm key={tipo} />
      ) : isCompra ? (
        <CompraForm key={tipo} />
      ) : (
        <MovimentacaoForm
          key={tipo}
          tipoInicial={config.value}
          tipoLabel={config.label}
          direcaoInicial={config.direcao}
          transferencia={isTransferencia}
        />
      )}
    </section>
  );
}