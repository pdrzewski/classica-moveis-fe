const metrics = [
  { label: 'Produtos', value: '-', note: 'Sem dados', icon: '▦' },
  { label: 'Estoque baixo', value: '-', note: 'Sem dados', icon: '!', warning: true },
  { label: 'Movimentações', value: '-', note: 'Sem dados', icon: '⇄' },
  { label: 'Lojas', value: '-', note: 'Sem dados', icon: '⌂' },
];

const quickLinks = [
  { label: 'Cadastrar produto', to: '/cadastro/produto' },
  { label: 'Registrar movimentação', to: '/movimentacao' },
  { label: 'Consultar estoque', to: '/estoque' },
];

export default function Home() {
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
        <section className="superficie">
          <div className="titulo-secao">
            <div>
              <p className="titulo-pequeno">Equipe</p>
              <h2>Funcionários em férias</h2>
            </div>
            <span className="crachá-contagem">0</span>
          </div>

          <div className="conteudo-vazio">
            <p>Nenhum registro no momento.</p>
          </div>
        </section>

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