const vacationers = [
  { name: 'Mariana Costa', role: 'Vendedora', period: '12/08 a 26/08' },
  { name: 'Rafael Mendes', role: 'Estoquista', period: '19/08 a 02/09' },
];

export default function Home() {
  return (
    <section className="dashboard">
      <div className="page-intro">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1>Bom dia, administrador</h1>
          <p>Acompanhe a operação das suas lojas em um só lugar.</p>
        </div>
        <span className="date-chip">23 de agosto de 2026</span>
      </div>

      <div className="metric-grid">
        <Metric label="Produtos cadastrados" value="248" note="12 adicionados este mês" icon="▦" />
        <Metric label="Estoque baixo" value="18" note="Requer atenção" icon="!" warning />
        <Metric label="Movimentações" value="76" note="Nos últimos 30 dias" icon="⇄" />
        <Metric label="Lojas ativas" value="06" note="Todas operando" icon="⌂" />
      </div>

      <div className="home-grid">
        <section className="surface">
          <div className="section-heading">
            <div><p className="eyebrow">Equipe</p><h2>Funcionários de férias</h2></div>
            <span className="count-badge">{vacationers.length}</span>
          </div>
          {vacationers.map((person) => (
            <div className="vacation-row" key={person.name}>
              <span className="avatar soft">{person.name.split(' ').map((word) => word[0]).join('')}</span>
              <div><strong>{person.name}</strong><small>{person.role}</small></div>
              <time>{person.period}</time>
            </div>
          ))}
        </section>

        <section className="surface accent-surface">
          <p className="eyebrow">Acesso rápido</p>
          <h2>O que você precisa fazer?</h2>
          <div className="quick-links">
            <a href="/cadastro/produto">+ Cadastrar produto</a>
            <a href="/movimentacao">⇄ Registrar movimentação</a>
            <a href="/estoque">▤ Consultar estoque</a>
          </div>
        </section>
      </div>
    </section>
  );
}

function Metric({ label, value, note, icon, warning }) {
  return (
    <article className={`metric ${warning ? 'warning' : ''}`}>
      <span className="metric-icon">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}