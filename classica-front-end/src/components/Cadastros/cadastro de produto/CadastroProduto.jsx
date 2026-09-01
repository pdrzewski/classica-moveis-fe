import { useEffect, useState } from 'react';
import api from '../../../services/Api';

const listarDados = (resposta) => {
  const dados = resposta?.data;

  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const pegarId = (item) => item?.id ?? item?.fornecedorId ?? item?.fornecedor_id ?? item?.categoriaId ?? item?.categoria_id ?? item?.codigo;

const mostrarFornecedor = (fornecedor) => {
  if (!fornecedor) return 'Fornecedor';
  return fornecedor.nome || fornecedor.razaoSocial || fornecedor.titulo || `Fornecedor ${pegarId(fornecedor)}`;
};

const mostrarCategoria = (categoria) => {
  if (!categoria) return 'Categoria';
  return categoria.nome || categoria.categoria || categoria.descricao || `Categoria ${pegarId(categoria)}`;
};

const camposPadrao = {
  fornecedorId: '',
  categoriaId: '',
  nome: '',
  sku: '',
  codigoBarras: '',
  unidadeMedida: '',
  marca: '',
  precoCusto: '',
  precoVenda: '',
  estoqueMinimo: '',
  ativo: true,
};

export default function CadastroProduto({ onSuccess }) {
  const [form, setForm] = useState(camposPadrao);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFornecedores, setLoadingFornecedores] = useState(true);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [error, setError] = useState('');
  const [mostrarConfirmacaoCancelamento, setMostrarConfirmacaoCancelamento] = useState(false);

  useEffect(() => {
    const buscarFornecedores = async () => {
      try {
        const resposta = await api.get('/fornecedores').catch(() => api.get('/api/fornecedores'));
        setFornecedores(listarDados(resposta));
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar fornecedores');
      } finally {
        setLoadingFornecedores(false);
      }
    };

    const buscarCategorias = async () => {
      try {
        const resposta = await api.get('/categorias').catch(() => api.get('/api/categorias'));
        setCategorias(listarDados(resposta));
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar categorias');
      } finally {
        setLoadingCategorias(false);
      }
    };

    buscarFornecedores();
    buscarCategorias();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleCancelCadastro = () => {
    setMostrarConfirmacaoCancelamento(false);
    onSuccess?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (!form.fornecedorId || !form.categoriaId) {
      setError('Selecione o fornecedor e a categoria antes de continuar.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        fornecedorId: Number(form.fornecedorId),
        categoriaId: Number(form.categoriaId),
        nome: form.nome,
        sku: form.sku,
        codigoBarras: form.codigoBarras,
        unidadeMedida: form.unidadeMedida,
        marca: form.marca,
        precoCusto: Number(form.precoCusto || 0),
        precoVenda: Number(form.precoVenda || 0),
        estoqueMinimo: Number(form.estoqueMinimo || 0),
        ativo: Boolean(form.ativo),
      };

      await api.post('/api/produtos', payload).catch(() => api.post('/api/produtos', payload));
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao cadastrar produto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-cadastro-funcionario">
      <div className="form-grid">
        <div className="grupo-entrada">
          <label>Fornecedor</label>
          <select
            name="fornecedorId"
            value={form.fornecedorId}
            onChange={handleChange}
            disabled={loadingFornecedores || fornecedores.length === 0}
            required
          >
            <option value="">{loadingFornecedores ? 'Carregando fornecedores...' : 'Selecione um fornecedor'}</option>
            {fornecedores.map((fornecedor) => {
              const fornecedorId = pegarId(fornecedor);
              return (
                <option key={fornecedorId} value={fornecedorId}>
                  {mostrarFornecedor(fornecedor)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grupo-entrada">
          <label>Categoria</label>
          <select
            name="categoriaId"
            value={form.categoriaId}
            onChange={handleChange}
            disabled={loadingCategorias || categorias.length === 0}
            required
          >
            <option value="">{loadingCategorias ? 'Carregando categorias...' : 'Selecione uma categoria'}</option>
            {categorias.map((categoria) => {
              const categoriaId = pegarId(categoria);
              return (
                <option key={categoriaId} value={categoriaId}>
                  {mostrarCategoria(categoria)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grupo-entrada">
          <label>Nome</label>
          <input
            type="text"
            name="nome"
            value={form.nome}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>SKU</label>
          <input
            type="text"
            name="sku"
            value={form.sku}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Código de barras</label>
          <input
            type="text"
            name="codigoBarras"
            value={form.codigoBarras}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Unidade de medida</label>
          <input
            type="text"
            name="unidadeMedida"
            value={form.unidadeMedida}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Marca</label>
          <input
            type="text"
            name="marca"
            value={form.marca}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Preço de custo</label>
          <input
            type="number"
            min="0"
            step="0.01"
            name="precoCusto"
            value={form.precoCusto}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Preço de venda</label>
          <input
            type="number"
            min="0"
            step="0.01"
            name="precoVenda"
            value={form.precoVenda}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Estoque mínimo</label>
          <input
            type="number"
            min="0"
            name="estoqueMinimo"
            value={form.estoqueMinimo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada checkbox">
          <label>
            <input
              type="checkbox"
              name="ativo"
              checked={form.ativo}
              onChange={handleChange}
            />
            Ativo
          </label>
        </div>
      </div>

      {error && <p className="erro">{error}</p>}

      <div className="form-acoes">
        <button
          type="button"
          className="btn-cancelar"
          onClick={() => setMostrarConfirmacaoCancelamento(true)}
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading || loadingFornecedores || loadingCategorias || fornecedores.length === 0 || categorias.length === 0}
        >
          {loading ? 'Cadastrando...' : 'Cadastrar'}
        </button>
      </div>

      {mostrarConfirmacaoCancelamento && (
        <div className="camada-modal confirm-modal">
          <div className="cartao-modal cartao-confirmacao">
            <button type="button" className="fechar" onClick={() => setMostrarConfirmacaoCancelamento(false)}>×</button>
            <p className="titulo-pequeno">Confirmar cancelamento</p>
            <h2>Deseja mesmo cancelar o cadastro?</h2>
            <p>As informações preenchidas serão perdidas.</p>

            <div className="form-acoes confirm-actions">
              <button type="button" className="btn-cancelar" onClick={() => setMostrarConfirmacaoCancelamento(false)}>
                Voltar
              </button>
              <button type="button" className="btn-confirmar-cancelamento" onClick={handleCancelCadastro}>
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
