import { useEffect, useState } from 'react';
import api from '../services/Api';

const metrics = [
  { label: 'Produtos', value: '-', note: 'Sem dados', icon: '▦' },
  { label: 'Estoque baixo', value: '-', note: 'Sem dados', icon: '!' },
  { label: 'Movimentações', value: '-', note: 'Sem dados', icon: '⇄' },
  { label: 'Lojas', value: '-', note: 'Sem dados', icon: '⌂' },
];

const quickLinks = [
  { label: 'Cadastrar produto', to: '/cadastro/produto' },
  { label: 'Registrar movimentação', to: '/movimentacao' },
  { label: 'Consultar estoque', to: '/estoque' },
];

function Metric({ label, value, note, icon, warning }) {
  return (
    <article className={`metrica ${warning ? 'aviso' : ''}`}>
      <span className="icone-metrica">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function CartaoEquipe({ titulo, icone: _icone, itens, carregando, vazioTexto }) {
  return (
    <section className="superficie cartao-equipe">
      <div className="titulo-secao">
        <div>
          <p className="titulo-pequeno">Equipe</p>
          <h2>{titulo}</h2>
        </div>
        <span className="crachá-contagem">{itens.length}</span>
      </div>

      {carregando ? (
        <div className="conteudo-vazio"><p>Carregando...</p></div>
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
                        Aniversário: <time>{new Date(item.dataNascimento).toLocaleDateString('pt-BR')}</time>
                        {' | '}
                      </>
                    )}
                    {item.diasParaAniversario !== undefined && (
                      <span className={`dias-badge ${ehAniversarioHoje ? 'aniversario-hoje-badge' : ''}`}>
                        {ehAniversarioHoje ? 'Aniversário hoje' : `${item.diasParaAniversario} dias`}
                      </span>
                    )}
                    {item.dataInicio && item.dataFim && (
                      <>
                        <span className="ferias-periodo">
                          {new Date(item.dataInicio).toLocaleDateString('pt-BR')} a {new Date(item.dataFim).toLocaleDateString('pt-BR')}
                        </span>
                      </>
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

function CartaoEstoqueBaixo({ itens, carregando }) {
  return (
    <section className="superficie cartao-estoque-baixo">
      <div className="titulo-secao">
        <div>
          <p className="titulo-pequeno">Atenção</p>
          <h2>Estoque Baixo</h2>
        </div>
        <span className="crachá-contagem aviso">{itens.length}</span>
      </div>

      {carregando ? (
        <div className="conteudo-vazio"><p>Carregando...</p></div>
      ) : itens.length === 0 ? (
        <div className="conteudo-vazio"><p>Todos os produtos estão com estoque adequado.</p></div>
      ) : (
        <ul className="lista-estoque-baixo">
          {itens.map((item) => (
            <li key={item.produto.id} className="item-estoque-baixo">
              <div className="info">
                <strong>{item.produto.nome}</strong>
                <span className="detalhe">
                  SKU: {item.produto.sku}
                </span>
              </div>
              <div className="estoque-info">
                <span className="estoque-atual">{item.estoqueAtual}</span>
                <span className="estoque-minimo">Mín: {item.produto.estoqueMinimo}</span>
                <span className="diferenca">Faltam {item.produto.estoqueMinimo - item.estoqueAtual}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Home() {
  const [ferias, setFerias] = useState([]);
  const [aniversariantes, setAniversariantes] = useState([]);
  const [estoqueBaixo, setEstoqueBaixo] = useState([]);
  const [carregandoFerias, setCarregandoFerias] = useState(true);
  const [carregandoAniversariantes, setCarregandoAniversariantes] = useState(true);
  const [carregandoEstoqueBaixo, setCarregandoEstoqueBaixo] = useState(true);

  useEffect(() => {
    const buscarFerias = async () => {
      try {
        const resp = await api.get('/colaboradores/ferias').catch(() => api.get('/api/colaboradores/ferias'));
        const dados = resp?.data?.content || resp?.data?.dados || resp?.data || [];
        setFerias(dados.slice(0, 3));
      } catch {
        setFerias([]);
      } finally {
        setCarregandoFerias(false);
      }
    };

    const buscarAniversariantes = async () => {
      try {
        const resp = await api.get('/colaboradores/aniversarios-proximos?dias=30').catch(() => api.get('/api/colaboradores/aniversarios-proximos?dias=30'));
        const dados = resp?.data?.content || resp?.data?.dados || resp?.data || [];
        setAniversariantes(dados.slice(0, 3));
      } catch {
        setAniversariantes([]);
      } finally {
        setCarregandoAniversariantes(false);
      }
    };

    const buscarEstoqueBaixo = async () => {
      try {
        const resp = await api.get('/produtos/estoque-baixo').catch(() => api.get('/api/produtos/estoque-baixo'));
        const dados = Array.isArray(resp?.data) ? resp.data : resp?.data?.content || resp?.data?.dados || resp?.data || [];
        setEstoqueBaixo(dados.slice(0, 5));
      } catch {
        setEstoqueBaixo([]);
      } finally {
        setCarregandoEstoqueBaixo(false);
      }
    };

    buscarFerias();
    buscarAniversariantes();
    buscarEstoqueBaixo();
  }, []);

  return (
    <section className="painel">
      <header className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Resumo</p>
          <h1>Dashboard</h1>
          <p>Visão geral da operação do sistema.</p>
        </div>
      </header>

      <div className="grade-metrica">
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grade-inicio">
        <CartaoEquipe
          titulo="Em férias"
          icone="🌴"
          itens={ferias}
          carregando={carregandoFerias}
          vazioTexto="Nenhum funcionário em férias no momento."
        />
        <CartaoEstoqueBaixo
          itens={estoqueBaixo}
          carregando={carregandoEstoqueBaixo}
        />
        <CartaoEquipe
          titulo="Aniversariantes"
          icone="🎂"
          itens={aniversariantes}
          carregando={carregandoAniversariantes}
          vazioTexto="Nenhum aniversário nos próximos 30 dias."
        />

        <aside className="superficie superficie-destaque">
          <p className="titulo-pequeno">Acesso rápido</p>
          <h2>Atalhos</h2>

          <div className="links-rapidos">
            {quickLinks.map((link) => (
              <a key={link.label} href={link.to}>{link.label}</a>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}