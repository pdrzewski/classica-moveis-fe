import { useEffect, useState } from 'react';
import api from '../services/Api';
import './Relatorios.css';

const listarDados = (resposta) => {
  const dados = resposta?.data;
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const idDoRegistro = (registro, tipo) => registro?.id ?? registro?.[`${tipo}Id`];

const mostrarNome = (registro, tipo) => {
  const id = idDoRegistro(registro, tipo);
  const nomes = {
    estabelecimento: registro?.nome || registro?.estabelecimentoNome || registro?.nomeEstabelecimento || registro?.titulo,
    colaborador: registro?.nome || registro?.colaboradorNome || registro?.nomeColaborador || registro?.nomeCompleto || registro?.titulo,
    fornecedor: registro?.nome || registro?.fornecedorNome || registro?.nomeFornecedor || registro?.razaoSocial || registro?.nomeFantasia || registro?.titulo,
  };
  const nome = nomes[tipo];
  return nome || `${tipo === 'estabelecimento' ? 'Estabelecimento' : tipo === 'colaborador' ? 'Colaborador' : 'Fornecedor'} ${id}`;
};

const formatarValor = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '—';
  if (typeof valor === 'object') return JSON.stringify(valor);
  return String(valor);
};

const obterLinhas = (dados) => {
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return dados && typeof dados === 'object' ? [dados] : [{ resultado: dados }];
};

function ResultadoRelatorio({ resultado }) {
  if (!resultado) return null;

  const linhas = obterLinhas(resultado.dados);
  const colunas = [...new Set(linhas.flatMap((linha) => (
    linha && typeof linha === 'object' && !Array.isArray(linha) ? Object.keys(linha) : ['resultado']
  )))];

  return (
    <section className="resultado-relatorio" aria-live="polite">
      <div className="resultado-relatorio-cabecalho">
        <div>
          <p className="titulo-pequeno">Consulta concluída</p>
          <h2>{resultado.titulo}</h2>
        </div>
        <span>{linhas.length} {linhas.length === 1 ? 'registro' : 'registros'}</span>
      </div>
      {linhas.length === 0 ? (
        <p className="relatorio-sem-registros">Nenhum registro encontrado para os parâmetros informados.</p>
      ) : (
        <div className="envoltorio-tabela tabela-relatorio">
          <table>
            <thead>
              <tr>{colunas.map((coluna) => <th key={coluna}>{coluna}</th>)}</tr>
            </thead>
            <tbody>
              {linhas.map((linha, indice) => (
                <tr key={linha?.id ?? indice}>
                  {colunas.map((coluna) => (
                    <td key={coluna}>{formatarValor(linha?.[coluna] ?? (coluna === 'resultado' ? linha : null))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function Relatorios() {
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [estabelecimentoId, setEstabelecimentoId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [movimentacaoId, setMovimentacaoId] = useState('');
  const [resultado, setResultado] = useState(null);
  const [carregandoListas, setCarregandoListas] = useState(true);
  const [acaoEmAndamento, setAcaoEmAndamento] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    const carregarOpcoes = async () => {
      const [resultadoEstabelecimentos, resultadoFornecedores, resultadoColaboradores] = await Promise.allSettled([
        api.get('/estabelecimentos'),
        api.get('/fornecedores'),
        api.get('/colaboradores'),
      ]);

      const errosCarregamento = [];
      if (resultadoEstabelecimentos.status === 'fulfilled') {
        setEstabelecimentos(listarDados(resultadoEstabelecimentos.value));
      } else {
        errosCarregamento.push('estabelecimentos');
      }
      if (resultadoFornecedores.status === 'fulfilled') {
        setFornecedores(listarDados(resultadoFornecedores.value));
      } else {
        errosCarregamento.push('fornecedores');
      }
      if (resultadoColaboradores.status === 'fulfilled') {
        setColaboradores(listarDados(resultadoColaboradores.value));
      } else {
        errosCarregamento.push('colaboradores');
      }

      if (errosCarregamento.length) {
        setErro(`Não foi possível carregar: ${errosCarregamento.join(', ')}. Atualize a página ou tente novamente.`);
      }
      setCarregandoListas(false);
    };

    carregarOpcoes();
  }, []);

  const consultarRelatorio = async (event, chave, rota, params, titulo) => {
    event.preventDefault();
    if (dataInicio && dataFim && dataInicio > dataFim && chave === 'vendas-colaborador') {
      setErro('A data inicial não pode ser posterior à data final.');
      return;
    }

    setErro('');
    setResultado(null);
    setAcaoEmAndamento(`${chave}-consulta`);
    try {
      const resposta = await api.get(rota, { params });
      setResultado({ titulo, dados: resposta.data });
    } catch (error) {
      setErro(error.response?.data?.message || error.message || 'Não foi possível consultar o relatório.');
    } finally {
      setAcaoEmAndamento('');
    }
  };

  const baixarPdf = async (chave, rota, params, nomeArquivo) => {
    if (chave === 'vendas-colaborador' && (!dataInicio || !dataFim)) {
      setErro('Informe a data inicial e a data final para gerar o relatório.');
      return;
    }
    if (chave === 'vendas-colaborador' && dataInicio > dataFim) {
      setErro('A data inicial não pode ser posterior à data final.');
      return;
    }
    setErro('');
    setAcaoEmAndamento(`${chave}-pdf`);
    try {
      const resposta = await api.get(rota, { params, responseType: 'blob' });
      const url = URL.createObjectURL(resposta.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setErro(error.response?.data?.message || error.message || 'Não foi possível baixar o PDF.');
    } finally {
      setAcaoEmAndamento('');
    }
  };

  const enviarConsulta = (chave, rota, params, titulo) => (event) => (
    consultarRelatorio(event, chave, rota, params, titulo)
  );

  const enviarPdf = (chave, rota, params, arquivo) => () => (
    baixarPdf(chave, rota, params, arquivo)
  );

  const estabelecimentosOrdenados = [...estabelecimentos].sort((a, b) => mostrarNome(a, 'estabelecimento').localeCompare(mostrarNome(b, 'estabelecimento'), 'pt-BR'));
  const fornecedoresOrdenados = [...fornecedores].sort((a, b) => mostrarNome(a, 'fornecedor').localeCompare(mostrarNome(b, 'fornecedor'), 'pt-BR'));
  const colaboradoresOrdenados = [...colaboradores].sort((a, b) => mostrarNome(a, 'colaborador').localeCompare(mostrarNome(b, 'colaborador'), 'pt-BR'));
  const carregandoOpcoes = carregandoListas;

  return (
    <section className="area-trabalho pagina-relatorios">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Análises</p>
          <h1>Relatórios</h1>
          <p>Consulte informações e baixe relatórios em PDF.</p>
        </div>
      </div>

      {erro && <div className="aviso erro-relatorios" role="alert">{erro}</div>}

      <div className="grade-relatorios">
        <article className="cartao-relatorio">
          <div className="cartao-relatorio-cabecalho">
            <span className="icone-relatorio" aria-hidden="true">R$</span>
            <div>
              <p className="titulo-pequeno">Produtos</p>
              <h2>Tabela de preços</h2>
            </div>
          </div>
          <p className="descricao-relatorio">Consulte os preços dos produtos de uma loja e fornecedora.</p>
          <form onSubmit={enviarConsulta(
            'tabela-precos',
            `/relatorios/produtos/tabela-precos/${estabelecimentoId}`,
            { fornecedorId },
            'Tabela de preços'
          )}>
            <label>
              Estabelecimento
              <select value={estabelecimentoId} onChange={(event) => setEstabelecimentoId(event.target.value)} required disabled={carregandoOpcoes}>
                <option value="">Selecione o estabelecimento</option>
                {estabelecimentosOrdenados.map((estabelecimento) => (
                  <option key={idDoRegistro(estabelecimento, 'estabelecimento')} value={idDoRegistro(estabelecimento, 'estabelecimento')}>{mostrarNome(estabelecimento, 'estabelecimento')}</option>
                ))}
              </select>
            </label>
            <label>
              Fornecedor
              <select value={fornecedorId} onChange={(event) => setFornecedorId(event.target.value)} required disabled={carregandoOpcoes}>
                <option value="">Selecione o fornecedor</option>
                {fornecedoresOrdenados.map((fornecedor) => (
                  <option key={idDoRegistro(fornecedor, 'fornecedor')} value={idDoRegistro(fornecedor, 'fornecedor')}>{mostrarNome(fornecedor, 'fornecedor')}</option>
                ))}
              </select>
            </label>
            <div className="acoes-relatorio">
              <button className="secundario" type="submit" disabled={Boolean(acaoEmAndamento)}>
                {acaoEmAndamento === 'tabela-precos-consulta' ? 'Consultando...' : 'Consultar'}
              </button>
              <button
                className="primario"
                type="button"
                disabled={!estabelecimentoId || !fornecedorId || Boolean(acaoEmAndamento)}
                onClick={enviarPdf('tabela-precos', `/relatorios/produtos/tabela-precos/${estabelecimentoId}/pdf`, { fornecedorId }, 'tabela-de-precos.pdf')}
              >
                {acaoEmAndamento === 'tabela-precos-pdf' ? 'Baixando...' : 'Baixar PDF'}
              </button>
            </div>
          </form>
        </article>

        <article className="cartao-relatorio">
          <div className="cartao-relatorio-cabecalho">
            <span className="icone-relatorio" aria-hidden="true">↗</span>
            <div>
              <p className="titulo-pequeno">Vendas</p>
              <h2>Vendas por colaborador</h2>
            </div>
          </div>
          <p className="descricao-relatorio">Filtre as vendas realizadas por um colaborador dentro de um período.</p>
          <form onSubmit={enviarConsulta(
            'vendas-colaborador',
            `/relatorios/vendas/vendedor/${colaboradorId}`,
            { dataInicio, dataFim },
            'Vendas por colaborador'
          )}>
            <label>
              Colaborador
              <select value={colaboradorId} onChange={(event) => setColaboradorId(event.target.value)} required disabled={carregandoOpcoes}>
                <option value="">Selecione o colaborador</option>
                {colaboradoresOrdenados.map((colaborador) => (
                  <option key={idDoRegistro(colaborador, 'colaborador')} value={idDoRegistro(colaborador, 'colaborador')}>{mostrarNome(colaborador, 'colaborador')}</option>
                ))}
              </select>
            </label>
            <div className="campos-periodo-relatorio">
              <label>
                Data de início
                <input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} required />
              </label>
              <label>
                Data de fim
                <input type="date" value={dataFim} onChange={(event) => setDataFim(event.target.value)} required />
              </label>
            </div>
            <div className="acoes-relatorio">
              <button className="secundario" type="submit" disabled={Boolean(acaoEmAndamento)}>
                {acaoEmAndamento === 'vendas-colaborador-consulta' ? 'Consultando...' : 'Consultar'}
              </button>
              <button
                className="primario"
                type="button"
                disabled={!colaboradorId || !dataInicio || !dataFim || dataInicio > dataFim || Boolean(acaoEmAndamento)}
                onClick={enviarPdf('vendas-colaborador', `/relatorios/vendas/vendedor/${colaboradorId}/pdf`, { dataInicio, dataFim }, 'vendas-por-colaborador.pdf')}
              >
                {acaoEmAndamento === 'vendas-colaborador-pdf' ? 'Baixando...' : 'Baixar PDF'}
              </button>
            </div>
          </form>
        </article>

        <article className="cartao-relatorio">
          <div className="cartao-relatorio-cabecalho">
            <span className="icone-relatorio" aria-hidden="true">#</span>
            <div>
              <p className="titulo-pequeno">Movimentação</p>
              <h2>Venda por movimentação</h2>
            </div>
          </div>
          <p className="descricao-relatorio">Consulte os detalhes de uma venda pelo identificador da movimentação.</p>
          <form onSubmit={enviarConsulta(
            'venda-movimentacao',
            `/relatorios/venda/${movimentacaoId}`,
            {},
            `Venda da movimentação ${movimentacaoId}`
          )}>
            <label>
              ID da movimentação
              <input
                type="number"
                min="1"
                step="1"
                value={movimentacaoId}
                onChange={(event) => setMovimentacaoId(event.target.value)}
                placeholder="Informe o ID"
                required
              />
            </label>
            <div className="acoes-relatorio">
              <button className="secundario" type="submit" disabled={Boolean(acaoEmAndamento)}>
                {acaoEmAndamento === 'venda-movimentacao-consulta' ? 'Consultando...' : 'Consultar'}
              </button>
              <button
                className="primario"
                type="button"
                disabled={!movimentacaoId || Number(movimentacaoId) < 1 || Boolean(acaoEmAndamento)}
                onClick={enviarPdf('venda-movimentacao', `/relatorios/venda/${movimentacaoId}/pdf`, {}, `venda-${movimentacaoId}.pdf`)}
              >
                {acaoEmAndamento === 'venda-movimentacao-pdf' ? 'Baixando...' : 'Baixar PDF'}
              </button>
            </div>
          </form>
        </article>
      </div>

      <ResultadoRelatorio resultado={resultado} />
    </section>
  );
}
