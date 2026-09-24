export const movimentacaoConfigs = {
  compra: { value: 'COMPRA', label: 'Compra', direcao: 'ENTRADA' },
  'ajuste-entrada': { value: 'AJUSTE_ENTRADA', label: 'Ajuste de entrada', direcao: 'ENTRADA' },
  venda: { value: 'VENDA', label: 'Venda', direcao: 'SAIDA' },
  'ajuste-saida': { value: 'AJUSTE_SAIDA', label: 'Ajuste de saída', direcao: 'SAIDA' },
  transferencia: { value: 'TRANSFERENCIA', label: 'Transferência entre lojas', direcao: 'TRANSFERENCIA' },
};

export const movimentacaoItems = Object.entries(movimentacaoConfigs).map(([key, config]) => [key, config.label]);

export const movimentacaoEntradas = movimentacaoItems.filter(([key]) => movimentacaoConfigs[key].direcao === 'ENTRADA');
export const movimentacaoSaidas = movimentacaoItems.filter(([key]) => movimentacaoConfigs[key].direcao === 'SAIDA');

export function criarMovimentacaoItems(registros) {
  const valores = [...new Set(registros
    .map((registro) => registro?.tipoMovimentacao || registro?.tipo_movimentacao || registro?.tipo)
    .filter(Boolean)
    .map((valor) => String(valor).toUpperCase()))];

  return valores.map((valor) => {
    const config = Object.values(movimentacaoConfigs).find((item) => item.value === valor);
    const itemBase = movimentacaoItems.find(([key]) => movimentacaoConfigs[key].value === valor);

    return itemBase || [valor.toLowerCase().replaceAll('_', '-'), config?.label || valor];
  });
}