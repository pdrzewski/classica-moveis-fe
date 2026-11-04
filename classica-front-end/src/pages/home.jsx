import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/Api';

const listarDados = (resposta) => {
  const dados = resposta?.data;
  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  if (Array.isArray(dados?.items)) return dados.items;
  if (Array.isArray(dados?.results)) return dados.results;
  if (Array.isArray(dados?.movimentacoes)) return dados.movimentacoes;
  if (Array.isArray(dados?.data)) return dados.data;
  return [];
};

const contarRegistros = (resposta, normalizar) => {
  const dados = resposta?.data;
  const total = dados?.totalElements
    ?? dados?.totalCount
    ?? dados?.totalRegistros
    ?? dados?.totalMovimentacoes
    ?? dados?.total;
  if (total !== undefined && Number.isFinite(Number(total))) return Number(total);
  if (typeof dados === 'number') return dados;
  return normalizar(resposta).length;
};

const buscar = async (rota) => {
  try {
    return await api.get(rota);
  } catch (erro) {
    if (erro.response?.status !== 404) throw erro;
    return api.get(`/api${rota}`);
  }
};

const nomeColaborador = (item) => (
  item?.nome || item?.colaboradorNome || item?.nomeColaborador || item?.colaborador?.nome || item?.nomeCompleto || 'Colaborador'
);

const formatarData = (data) => {
  if (!data) return '';
  const somenteData = String(data).split('T')[0];
  return new Date(`${somenteData}T00:00:00`).toLocaleDateString('pt-BR');
};

const normalizarEquipe = (lista, tipo) => lista.map((item, indice) => {
  const dias = item.diasParaAniversario ?? item.dias_para_aniversario ?? item.diasRestantes ?? item.dias;
  return {
    ...item,
    id: item.id ?? item.colaboradorId ?? item.funcionarioId ?? `${tipo}-${indice}`,
    nome: nomeColaborador(item),
    dataNascimento: item.dataNascimento || item.data_nascimento || item.nascimento || item.colaborador?.dataNascimento,
    dataInicio: item.dataInicio || item.data_inicio || item.inicioFerias || item.ferias?.dataInicio,
    dataFim: item.dataFim || item.data_fim || item.fimFerias || item.ferias?.dataFim,
    diasParaAniversario: dias === undefined || dias === null ? undefined : Number(dias),
  };
});

const normalizarEstoqueBaixo = (lista) => lista.map((item, indice) => {
  const produto = item.produto || item;
  const estoqueAtual = Number(item.estoqueAtual ?? item.saldoDisponivel ?? item.quantidade ?? item.saldo ?? 0);
  const estoqueMinimo = Number(produto.estoqueMinimo ?? produto.estoque_minimo ?? 0);
  return {
    id: item.id ?? produto.id ?? produto.produtoId ?? `estoque-baixo-${indice}`,
    produto: {
      ...produto,
      id: produto.id ?? produto.produtoId ?? item.produtoId ?? `produto-${indice}`,
      nome: produto.nome || produto.produtoNome || 'Produto sem nome',
      sku: produto.sku || produto.codigo || produto.codigoBarras || produto.codigo_barras || '—',
      estoqueMinimo,
    },
    estoqueAtual,
  };
});

function Metric({ label, value, note, icon, warning, carregando, erro }) {
  return (
    <article className={`metrica ${warning ? 'metrica-alerta' : ''} ${erro ? 'metrica-erro' : ''}`}>
      <span className="icone-metrica" aria-hidden="true">{icon}</span>
      <p>{label}</p>
      <strong>{carregando ? '…' : erro ? '—' : value}</strong>
      <small>{carregando ? 'Carregando…' : erro ? 'Não foi possível carregar' : note}</small>
    </article>
  );
}

function CartaoEquipe({ titulo, itens, carregando, erro, vazioTexto }) {
  return (
    <section className="superficie cartao-equipe">
      <div className="titulo-secao">
        <div>
          <p className="titulo-pequeno">Equipe</p>
          <h2>{titulo}</h2>
        </div>
        <span className="crachá-contagem">{carregando ? '…' : erro ? '—' : itens.length}</span>
      </div>

      {carregando ? (
        <div className="conteudo-vazio"><p>Carregando...</p></div>
      ) : erro ? (
        <div className="conteudo-vazio"><p>{erro}</p></div>
      ) : itens.length === 0 ? (
        <div className="conteudo-vazio"><p>{vazioTexto}</p></div>
      ) : (
        <ul className="lista-equipe">
          {itens.map((item) => {
            const ehAniversarioHoje = item.diasParaAniversario === 0;
            return (
              <li key={item.id} className={`item-equipe ${ehAniversarioHoje ? 'aniversario-hoje' : ''}`}>
                <div className="avatar">
                  <span>{item.nome?.charAt(0) || '?'}</span>
                </div>
                <div className="info">
                  <strong>{item.nome}</strong>
                  <span className="detalhe">
                    {item.dataNascimento && (
                      <>
                        Aniversário: <time>{formatarData(item.dataNascimento)}</time>
                        {' | '}
                      </>
                    )}
                    {item.diasParaAniversario !== undefined && item.diasParaAniversario !== null && (
                      <span className={`dias-badge ${ehAniversarioHoje ? 'aniversario-hoje-badge' : ''}`}>
                        {ehAniversarioHoje ? 'Aniversário hoje' : `${item.diasParaAniversario} dias`}
                      </span>
                    )}
                    {item.dataInicio && item.dataFim && (
                      <span className="ferias-periodo">
                        {formatarData(item.dataInicio)} a {formatarData(item.dataFim)}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CartaoEstoqueBaixo({ itens, carregando, erro }) {
  return (
    <section className="superficie cartao-estoque-baixo">
      <div className="titulo-secao">
        <div>
          <p className="titulo-pequeno">Atenção</p>
          <h2>Estoque Baixo</h2>
        </div>
        <span className="crachá-contagem aviso">{carregando ? '…' : erro ? '—' : itens.length}</span>
      </div>

      {carregando ? (
        <div className="conteudo-vazio"><p>Carregando...</p></div>
      ) : erro ? (
        <div className="conteudo-vazio"><p>{erro}</p></div>
      ) : itens.length === 0 ? (
        <div className="conteudo-vazio"><p>Todos os produtos estão com estoque adequado.</p></div>
      ) : (
        <ul className="lista-estoque-baixo">
          {itens.map((item) => (
            <li key={item.id} className="item-estoque-baixo">
              <div className="info">
                <strong>{item.produto.nome}</strong>
                <span className="detalhe">SKU: {item.produto.sku}</span>
              </div>
              <div className="estoque-info">
                <span className="estoque-atual">{item.estoqueAtual}</span>
                <span className="estoque-minimo">Mín: {item.produto.estoqueMinimo}</span>
                <span className="diferenca">Faltam {Math.max(0, item.produto.estoqueMinimo - item.estoqueAtual)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Home() {
  const [metricas, setMetricas] = useState({
    produtos: { value: 0, carregando: true, erro: false },
    estoqueBaixo: { value: 0, carregando: true, erro: false },
    movimentacoes: { value: 0, carregando: true, erro: false },
    lojas: { value: 0, carregando: true, erro: false },
  });
  const [ferias, setFerias] = useState([]);
  const [aniversariantes, setAniversariantes] = useState([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState([]);
  const [carregandoFerias, setCarregandoFerias] = useState(true);
  const [carregandoAniversariantes, setCarregandoAniversariantes] = useState(true);
  const [carregandoEstoqueBaixo, setCarregandoEstoqueBaixo] = useState(true);
  const [erroFerias, setErroFerias] = useState('');
  const [erroAniversariantes, setErroAniversariantes] = useState('');
  const [erroEstoqueBaixo, setErroEstoqueBaixo] = useState('');

  useEffect(() => {
    let ativo = true;

    const carregarLista = async (
      rota,
      definirLista,
      finalizar,
      definirErro,
      normalizar = (dados) => dados,
      limite = 3,
      aoCarregar = () => {},
      aoFalhar = () => {}
    ) => {
      try {
        const resposta = await buscar(rota);
        if (ativo) {
          definirLista(normalizar(listarDados(resposta)).slice(0, limite));
          definirErro('');
          aoCarregar(resposta);
        }
      } catch (erro) {
        if (ativo) {
          definirLista([]);
          definirErro(erro.response?.data?.message || erro.message || 'Não foi possível carregar os dados.');
          aoFalhar();
        }
      } finally {
        if (ativo) finalizar(false);
      }
    };

    const carregarMetrica = async (chave, rota, normalizar = listarDados) => {
      try {
        const resposta = await buscar(rota);
        const quantidade = contarRegistros(resposta, normalizar);
        if (ativo) {
          setMetricas((anteriores) => ({
            ...anteriores,
            [chave]: { value: quantidade, carregando: false, erro: false },
          }));
        }
      } catch {
        if (ativo) {
          setMetricas((anteriores) => ({
            ...anteriores,
            [chave]: { ...anteriores[chave], carregando: false, erro: true },
          }));
        }
      }
    };

    carregarLista('/colaboradores/ferias', setFerias, setCarregandoFerias, setErroFerias, (dados) => normalizarEquipe(dados, 'ferias'));
    carregarLista('/colaboradores/aniversarios-proximos?dias=30', setAniversariantes, setCarregandoAniversariantes, setErroAniversariantes, (dados) => normalizarEquipe(dados, 'aniversario'));
    carregarLista(
      '/produtos/estoque-baixo',
      setEstoqueBaixo,
      setCarregandoEstoqueBaixo,
      setErroEstoqueBaixo,
      normalizarEstoqueBaixo,
      5,
      (resposta) => setMetricas((anteriores) => ({
        ...anteriores,
        estoqueBaixo: { value: contarRegistros(resposta, listarDados), carregando: false, erro: false },
      })),
      () => setMetricas((anteriores) => ({
        ...anteriores,
        estoqueBaixo: { ...anteriores.estoqueBaixo, carregando: false, erro: true },
      }))
    );
    carregarMetrica('produtos', '/produtos');
    carregarMetrica('movimentacoes', '/movimentacoes/historico');
    carregarMetrica('lojas', '/estabelecimentos');

    return () => {
      ativo = false;
    };
  }, []);

  return (
    <section className="painel">
      <header className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Resumo</p>
          <h1>Dashboard</h1>
          <p>Visão geral da operação do sistema.</p>
        </div>
        <Link className="primario" to="/historico">Ver movimentações</Link>
      </header>

      <div className="grade-metrica">
        <Metric label="Produtos" value={metricas.produtos.value} note="Produtos cadastrados" icon="▦" {...metricas.produtos} />
        <Metric label="Estoque baixo" value={metricas.estoqueBaixo.value} note="Produtos abaixo do mínimo" icon="!" warning {...metricas.estoqueBaixo} />
        <Metric label="Movimentações" value={metricas.movimentacoes.value} note="Registros no histórico" icon="⇄" {...metricas.movimentacoes} />
        <Metric label="Lojas" value={metricas.lojas.value} note="Estabelecimentos cadastrados" icon="⌂" {...metricas.lojas} />
      </div>

      <div className="grade-inicio">
        <CartaoEquipe
          titulo="Em férias"
          itens={ferias}
          carregando={carregandoFerias}
          erro={erroFerias}
          vazioTexto="Nenhum funcionário em férias no momento."
        />
        <CartaoEstoqueBaixo
          itens={estoqueBaixo}
          carregando={carregandoEstoqueBaixo}
          erro={erroEstoqueBaixo}
        />
        <CartaoEquipe
          titulo="Aniversariantes"
          itens={aniversariantes}
          carregando={carregandoAniversariantes}
          erro={erroAniversariantes}
          vazioTexto="Nenhum aniversário nos próximos 30 dias."
        />

        <aside className="superficie superficie-destaque">
          <p className="titulo-pequeno">Acesso rápido</p>
          <h2>Atalhos</h2>

          <div className="links-rapidos">
            <Link to="/cadastro/produto">Cadastrar produto</Link>
            <Link to="/movimentacao">Registrar movimentação</Link>
            <Link to="/estoque">Consultar estoque</Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
