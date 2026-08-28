export default function Home() {
  return (
    <section className="painel">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Visão geral</p>
          <h1>Bom dia, administrador</h1>
          <p>Acompanhe a operação das suas lojas em um só lugar.</p>
        </div>
      </div>

      <div className="grade-metrica">
        <Metric label="Produtos cadastrados" value="-" note="Aguardando dados" icon="▦" />
        <Metric label="Estoque baixo" value="-" note="Aguardando dados" icon="!" warning />
        <Metric label="Movimentações" value="-" note="Aguardando dados" icon="⇄" />
        <Metric label="Lojas ativas" value="-" note="Aguardando dados" icon="⌂" />
      </div>

      <div className="grade-inicio">
        <section className="superficie">
          <div className="titulo-secao">
            <div><p className="titulo-pequeno">Equipe</p><h2>Funcionários de férias</h2></div>
            <span className="crachá-contagem">0</span>
          </div>
          <p>Nenhum funcionário de férias cadastrado.</p>
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