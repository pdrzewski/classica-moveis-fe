import { useEffect, useState } from 'react';
import api from '../../../services/Api';

const listarDados = (resposta) => {
  const dados = resposta?.data;

  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const pegarId = (item) => item?.id ?? item?.cargoId ?? item?.cargo_id ?? item?.estabelecimentoId ?? item?.estabelecimento_id ?? item?.codigo;

const mostrarCargo = (cargo) => {
  if (!cargo) return 'Cargo';
  return cargo.nome || cargo.cargo || cargo.descricao || cargo.titulo || `Cargo ${pegarId(cargo)}`;
};

const mostrarEstabelecimento = (estabelecimento) => {
  if (!estabelecimento) return 'Estabelecimento';
  return estabelecimento.nome || estabelecimento.titulo || estabelecimento.descricao || `Estabelecimento ${pegarId(estabelecimento)}`;
};

export default function CadastroForm({ onSuccess }) {
  const [form, setForm] = useState({
    nome: '',
    login: '',
    senha: '',
    cargoId: '',
    emFerias: false,
    dataAdmissao: '',
    dataNascimento: '',
    salario: '',
    carteiraTrabalho: '',
    comissao: '',
    estabelecimentoId: '',
    cpf: ''
  });
  const [cargos, setCargos] = useState([]);
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCargos, setLoadingCargos] = useState(true);
  const [loadingEstabelecimentos, setLoadingEstabelecimentos] = useState(true);
  const [error, setError] = useState('');
  const [mostrarConfirmacaoCancelamento, setMostrarConfirmacaoCancelamento] = useState(false);

  useEffect(() => {
    const buscarCargos = async () => {
      try {
        const resposta = await api.get('/cargos').catch(() => api.get('/api/cargos'));
        setCargos(listarDados(resposta));
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar cargos');
      } finally {
        setLoadingCargos(false);
      }
    };

    const buscarEstabelecimentos = async () => {
      try {
        const resposta = await api.get('/estabelecimentos').catch(() => api.get('/api/estabelecimentos'));
        setEstabelecimentos(listarDados(resposta));
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar estabelecimentos');
      } finally {
        setLoadingEstabelecimentos(false);
      }
    };

    buscarCargos();
    buscarEstabelecimentos();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleCancelCadastro = () => {
    setMostrarConfirmacaoCancelamento(false);
    onSuccess?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.cargoId) {
      setError('Selecione um cargo antes de cadastrar.');
      setLoading(false);
      return;
    }

    try {
      const usuario = {
        login: form.login,
        senha: form.senha,
      };

      const respostaUsuario = await api.post('/usuarios', usuario).catch(() => api.post('/api/usuarios', usuario));
      const usuarioId = respostaUsuario?.data?.id ?? respostaUsuario?.data?.usuarioId ?? respostaUsuario?.data?.data?.id;

      if (!usuarioId) {
        throw new Error('Usuário não foi criado corretamente pela API.');
      }

      const colaborador = {
        nome: form.nome,
        cargoId: Number(form.cargoId),
        usuarioId: Number(usuarioId),
        emFerias: Boolean(form.emFerias),
        dataAdmissao: form.dataAdmissao,
        dataNascimento: form.dataNascimento,
        salario: Number(form.salario || 0),
        carteiraTrabalho: form.carteiraTrabalho,
        comissao: Number(form.comissao || 0),
        estabelecimentoId: form.estabelecimentoId ? Number(form.estabelecimentoId) : null,
        cpf: form.cpf,
      };

      await api.post('/colaboradores', colaborador).catch(() => api.post('/api/colaboradores', colaborador));

      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao realizar o cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-cadastro-funcionario">
      <div className="form-grid">
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
          <label>Login</label>
          <input
            type="text"
            name="login"
            value={form.login}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Senha</label>
          <input
            type="password"
            name="senha"
            value={form.senha}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Cargo</label>
          <select
            name="cargoId"
            value={form.cargoId}
            onChange={handleChange}
            disabled={loadingCargos || cargos.length === 0}
            required
          >
            <option value="">{loadingCargos ? 'Carregando cargos...' : 'Selecione um cargo'}</option>
            {cargos.map((cargo) => {
              const cargoId = pegarId(cargo);
              return (
                <option key={cargoId} value={cargoId}>
                  {mostrarCargo(cargo)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grupo-entrada">
          <label>CPF</label>
          <input
            type="text"
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Data de admissão</label>
          <input
            type="date"
            name="dataAdmissao"
            value={form.dataAdmissao}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Data de nascimento</label>
          <input
            type="date"
            name="dataNascimento"
            value={form.dataNascimento}
            onChange={handleChange}
          />
        </div>

        <div className="grupo-entrada">
          <label>Salário</label>
          <input
            type="number"
            min="0"
            step="0.01"
            name="salario"
            value={form.salario}
            onChange={handleChange}
          />
        </div>

        <div className="grupo-entrada">
          <label>Carteira de trabalho</label>
          <input
            type="text"
            name="carteiraTrabalho"
            value={form.carteiraTrabalho}
            onChange={handleChange}
          />
        </div>

        <div className="grupo-entrada">
          <label>Comissão (%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            name="comissao"
            value={form.comissao}
            onChange={handleChange}
          />
        </div>

        <div className="grupo-entrada">
          <label>Estabelecimento</label>
          <select
            name="estabelecimentoId"
            value={form.estabelecimentoId}
            onChange={handleChange}
            disabled={loadingEstabelecimentos || estabelecimentos.length === 0}
          >
            <option value="">{loadingEstabelecimentos ? 'Carregando estabelecimentos...' : 'Selecione um estabelecimento'}</option>
            {estabelecimentos.map((estabelecimento) => {
              const estabelecimentoId = pegarId(estabelecimento);
              return (
                <option key={estabelecimentoId} value={estabelecimentoId}>
                  {mostrarEstabelecimento(estabelecimento)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grupo-entrada checkbox">
          <label>
            <input
              type="checkbox"
              name="emFerias"
              checked={form.emFerias}
              onChange={handleChange}
            />
            Em férias
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
          disabled={loading || loadingCargos || loadingEstabelecimentos || cargos.length === 0 || estabelecimentos.length === 0}
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