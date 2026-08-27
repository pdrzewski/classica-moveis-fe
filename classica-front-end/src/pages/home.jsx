const vacationers = [
  { name: 'Mariana Costa', role: 'Vendedora', period: '12/08 a 26/08' },
  { name: 'Rafael Mendes', role: 'Estoquista', period: '19/08 a 02/09' },
];

export default function Home() {
  return (
    <section className="painel">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Visão geral</p>
          <h1>Bom dia, administrador</h1>
          <p>Acompanhe a operação das suas lojas em um só lugar.</p>
        </div>
        <span className="chip-data">23 de agosto de 2026</span>
      </div>

      <div className="grade-metrica">
        <Metric label="Produtos cadastrados" value="248" note="12 adicionados este mês" icon="▦" />
        <Metric label="Estoque baixo" value="18" note="Requer atenção" icon="!" warning />
        <Metric label="Movimentações" value="76" note="Nos últimos 30 dias" icon="⇄" />
        <Metric label="Lojas ativas" value="06" note="Todas operando" icon="⌂" />
      </div>

      <div className="grade-inicio">
        <section className="superficie">
          <div className="titulo-secao">
            <div><p className="titulo-pequeno">Equipe</p><h2>Funcionários de férias</h2></div>
            <span className="crachá-contagem">{vacationers.length}</span>
          </div>
          {vacationers.map((person) => (
            <div className="linha-ferias" key={person.name}>
              <span className="avatar suave">{person.name.split(' ').map((word) => word[0]).join('')}</span>
              <div><strong>{person.name}</strong><small>{person.role}</small></div>
              <time>{person.period}</time>
            </div>
          ))}
        </section>

        <section className="superficie superficie-destaque">
          <p className="titulo-pequeno">Acesso rápido</p>
          <h2>O que você precisa fazer?</h2>
          <div className="links-rapidos">
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
    <article className={`metrica ${warning ? 'aviso' : ''}`}>
      <span className="icone-metrica">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}