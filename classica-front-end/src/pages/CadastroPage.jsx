import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cadastroConfigs } from './cadastroConfig';
import api from '../services/Api';
import CadastroUsuario from '../components/Cadastros/cadastro de funcionario/CadastroUsuario';
import CadastroFornecedora from '../components/Cadastros/cadastro de fornecedora/CadastroFornecedora';
import CadastroEstabelecimento from '../components/Cadastros/cadastro de estabelecimento/CadastroEstabelecimento';
import CadastroCategoria from '../components/Cadastros/cadastro de categoria/CadastroCategoria';
import CadastroProduto from '../components/Cadastros/cadastro de produto/CadastroProduto';

const labels = {
  nome: 'Nome', login: 'Login', senha: 'Senha', cargoId: 'Cargo', cpf: 'CPF',
  dataAdmissao: 'Data de admissão', dataNascimento: 'Data de nascimento', salario: 'Salário',
  carteiraTrabalho: 'Carteira de trabalho', comissao: 'Comissão (%)', estabelecimentoId: 'Estabelecimento',
  emFerias: 'Em férias', categoria: 'Categoria', cnpj: 'CNPJ', representante: 'Representante',
  telefone1: 'Telefone 1', telefone2: 'Telefone 2', cep: 'CEP', logradouro: 'Logradouro', numero: 'Número',
  complemento: 'Complemento', bairro: 'Bairro', cidade: 'Cidade', estado: 'Estado', fornecedorId: 'Fornecedor',
  categoriaId: 'Categoria', sku: 'SKU', codigoBarras: 'Código de barras', unidadeMedida: 'Unidade de medida',
  marca: 'Marca', precoCusto: 'Preço de custo', precoVenda: 'Preço de venda', estoqueMinimo: 'Estoque mínimo',
  ativo: 'Ativo', telefone: 'Telefone', responsavelId: 'Responsável',
};

const obterValor = (item, key) => {
  const snake = key.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
  const endereco = item?.endereco || {};
  const usuario = item?.usuario || {};
  const relacionamento = key.endsWith('Id') ? item?.[key.slice(0, -2)] : undefined;
  return relacionamento ?? item?.[key] ?? item?.[snake] ?? endereco?.[key] ?? endereco?.[snake] ?? usuario?.[key] ?? usuario?.[snake];
};

const obterId = (item) => item?.id ?? item?.codigo ?? item?.colaboradorId ?? item?.cargoId ?? item?.fornecedorId ?? item?.categoriaId;

const mostrarValor = (item, key, referencias) => {
  const valor = obterValor(item, key);
  if (key === 'senha') return '******** (não exibida por segurança)';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (valor && typeof valor === 'object') return valor.nome || valor.cargo || valor.categoria || valor.razaoSocial || valor.titulo || valor.descricao || valor.id || 'Não informado';
  if (key.endsWith('Id') && valor !== null && valor !== undefined) {
    const relacionado = referencias[key]?.find((referencia) => String(obterId(referencia)) === String(valor));
    return relacionado?.nome || relacionado?.cargo || relacionado?.categoria || relacionado?.razaoSocial || relacionado?.titulo || relacionado?.descricao || String(valor);
  }
  return valor === null || valor === undefined || valor === '' ? 'Não informado' : String(valor);
};

export default function CadastroPage() {
  const { tipo } = useParams();
  const config = cadastroConfigs[tipo] || cadastroConfigs.produto;
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [referencias, setReferencias] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const visible = rows.filter((row) =>
    config.fields.map((field) => mostrarValor(row, field, referencias)).join(' ').toLowerCase().includes(query.toLowerCase())
  );

  const carregarRegistros = async () => {
    setCarregando(true);
    setErro('');
    try {
      const resposta = await api.get(config.endpoint).catch(() => api.get(`/api${config.endpoint}`));
      const dados = resposta?.data;
      setRows(Array.isArray(dados) ? dados : dados?.content || dados?.dados || []);
      const relacoes = Object.entries(config.relations || {});
      const resultados = await Promise.all(relacoes.map(async ([campo, endpoint]) => {
        try {
          const relacao = await api.get(endpoint).catch(() => api.get(`/api${endpoint}`));
          const relacaoDados = relacao?.data;
          return [campo, Array.isArray(relacaoDados) ? relacaoDados : relacaoDados?.content || relacaoDados?.dados || []];
        } catch {
          return [campo, []];
        }
      }));
      setReferencias(Object.fromEntries(resultados));
    } catch (err) {
      setRows([]);
      setErro(err.response?.data?.message || 'Não foi possível carregar os registros.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarRegistros();
  }, [tipo]);

  const closeForm = () => {
    setModalAberto(false);
    setRegistroSelecionado(null);
  };

  const handleFuncionarioSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  const handleFornecedoraSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  const handleEstabelecimentoSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  const handleCategoriaSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  const handleProdutoSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Cadastros</p>
          <h1>{config.title}</h1>
          <p>Gerencie os registros da operação.</p>
        </div>
        <button className="primario" onClick={() => setModalAberto(true)}>
          + Novo {config.singular}
        </button>
      </div>

      <div className="superficie superficie-tabela">
        <div className="barra-ferramentas-tabela">
          <div>
            <strong>{rows.length} registros</strong>
            <small>{carregando ? 'Carregando registros...' : 'Dados do banco de dados'}</small>
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
                {config.fields.map((field) => <th key={field}>{labels[field] || field}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => (
                <tr key={row.id ?? row.codigo ?? index} onClick={() => {
                  setRegistroSelecionado(row);
                  setModalAberto(true);
                }}>
                  {config.fields.map((field) => <td key={field}>{mostrarValor(row, field, referencias)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && !erro && visible.length === 0 && <p className="tabela-vazia">Nenhum registro encontrado.</p>}
          {erro && <p className="erro tabela-vazia">{erro}</p>}
        </div>
      </div>

      {modalAberto && (
        <div className="camada-modal">
          {registroSelecionado ? (
            <div className="cartao-modal modal-detalhes">
              <button type="button" className="fechar" onClick={closeForm}>×</button>
              <p className="titulo-pequeno">Detalhes do registro</p>
              <h2>{config.singular}</h2>
              <div className="detalhes-grid">
                {config.fields.map((field) => (
                  <div className="detalhe-item" key={field}>
                    <span>{labels[field] || field}</span>
                    <strong>{mostrarValor(registroSelecionado, field, referencias)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : tipo === 'funcionario' ? (
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
          ) : tipo === 'categoria' ? (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}>×</button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar categoria</h2>
              <CadastroCategoria onSuccess={handleCategoriaSuccess} />
            </div>
          ) : tipo === 'produto' ? (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}>×</button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar produto</h2>
              <CadastroProduto onSuccess={handleProdutoSuccess} />
            </div>
          ) : (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}>×</button>
              <p className="titulo-pequeno">Cadastro indisponível</p>
              <h2>Tipo de cadastro não reconhecido</h2>
            </div>
          )}
        </div>
      )}
    </section>
  );
}