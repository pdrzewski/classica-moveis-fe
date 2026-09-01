import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { cadastroConfigs } from './cadastroConfig';
import CadastroUsuario from '../components/Cadastros/cadastro de funcionario/CadastroUsuario';
import CadastroFornecedora from '../components/Cadastros/cadastro de fornecedora/CadastroFornecedora';
import CadastroEstabelecimento from '../components/Cadastros/cadastro de estabelecimento/CadastroEstabelecimento';

const camposFornecedor = [
  { key: 'nome', label: 'Nome' },
  { key: 'cnpj', label: 'CNPJ' },
  { key: 'representante', label: 'Representante' },
  { key: 'telefone1', label: 'Telefone 1' },
  { key: 'telefone2', label: 'Telefone 2' },
  { key: 'enderecoId', label: 'Endereço (ID)' },
];

export default function CadastroPage() {
  const { tipo } = useParams();
  const config = cadastroConfigs[tipo] || cadastroConfigs.produto;
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [modalAberto, setModalAberto] = useState(false);
  const visible = rows.filter((row) =>
    row.join(' ').toLowerCase().includes(query.toLowerCase())
  );

  const closeForm = () => {
    setEditing(null);
    setForm({});
    setModalAberto(false);
  };

  const save = (event) => {
    event.preventDefault();

    const camposAtuais = tipo === 'fornecedora' ? camposFornecedor : config.fields.map((_, index) => ({ key: index }));
    const values = camposAtuais.map((campo) => form[campo.key] || 'Não informado');

    setRows(
      editing === null
        ? [...rows, values]
        : rows.map((row, index) => (index === editing ? values : row))
    );
    closeForm();
  };

  const edit = (row) => {
    setEditing(rows.indexOf(row));
    setForm(Object.fromEntries(row.map((value, index) => [index, value])));
    setModalAberto(true);
  };

  const remove = (row) => {
    setRows(rows.filter((currentRow) => currentRow !== row));
  };

  const handleFuncionarioSuccess = () => {
    closeForm();
  };

  const handleFornecedoraSuccess = () => {
    closeForm();
  };

  const handleEstabelecimentoSuccess = () => {
    closeForm();
  };

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Cadastros</p>
          <h1>{config.title}</h1>
          <p>Gerencie os registros da operação.</p>
        </div>
        <button className="primario" onClick={() => {
          setEditing(null);
          setForm({});
          setModalAberto(true);
        }}>
          + Novo {config.singular}
        </button>
      </div>

      <div className="superficie superficie-tabela">
        <div className="barra-ferramentas-tabela">
          <div>
            <strong>{rows.length} registros</strong>
            <small>Atualizados localmente</small>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar registro..."
          />
        </div>

        <div className="envoltorio-tabela">
          <table>
            <thead>
              <tr>
                {config.fields.map((field) => <th key={field}>{field}</th>)}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => (
                <tr key={`${row[0]}-${index}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      {cellIndex === 3 && tipo === 'produto' ? (
                        <span className={`etiqueta-estoque ${Number(cell) === 0 ? 'vazio' : Number(cell) < 10 ? 'baixo' : ''}`}>
                          {cell}
                        </span>
                      ) : cell}
                    </td>
                  ))}
                  <td className="acoes-linha">
                    <button onClick={() => edit(row)}>Editar</button>
                    <button onClick={() => remove(row)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto && (
        <div className="camada-modal">
          {tipo === 'funcionario' ? (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}>×</button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar funcionário</h2>
              <CadastroUsuario onSuccess={handleFuncionarioSuccess} />
            </div>
          ) : tipo === 'fornecedora' ? (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}>×</button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar fornecedora</h2>
              <CadastroFornecedora onSuccess={handleFornecedoraSuccess} />
            </div>
          ) : tipo === 'loja' || tipo === 'estabelecimento' ? (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}>×</button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar estabelecimento</h2>
              <CadastroEstabelecimento onSuccess={handleEstabelecimentoSuccess} />
            </div>
          ) : (
            <form className="cartao-modal modal-form-simples" onSubmit={save}>
              <button type="button" className="fechar" onClick={closeForm}>×</button>
              <p className="titulo-pequeno">{editing === null ? 'Novo registro' : 'Editar registro'}</p>
              <h2>{editing === null ? `Cadastrar ${config.singular}` : `Editar ${config.singular}`}</h2>

              <div className="form-grid">
                {(tipo === 'fornecedora' ? camposFornecedor : config.fields.map((field, index) => ({ key: index, label: field }))).map((campo) => (
                  <div className="grupo-entrada" key={campo.key}>
                    <label>{campo.label}</label>
                    <input
                      required={campo.key !== 'telefone2'}
                      value={form[campo.key] || ''}
                      onChange={(event) => setForm({ ...form, [campo.key]: event.target.value })}
                    />
                  </div>
                ))}
              </div>

              <div className="form-acoes">
                <button type="button" className="btn-cancelar" onClick={closeForm}>Cancelar</button>
                <button className="primario" type="submit">Salvar registro</button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}