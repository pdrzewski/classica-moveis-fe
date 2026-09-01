import { useEffect, useState } from 'react';
import api from '../../../services/Api';

export default function CadastroForm({ onSuccess }) {
  const [form, setForm] = useState({
    nome: '',
    cargoId: '',
    usuarioId: '',
    emFerias: '',
    dataAdmissao: '',
    dataNascimento: '',
    salario: '',
    carteiraTrabalho: '',
    comissao: '',
    estabelecimentoId: '',
    cpf: ''
  });
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCargos, setLoadingCargos] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCargos = async () => {
      try {
        const response = await api.get('/api/cargos');
        const payload = response.data;
        const listaCargos = Array.isArray(payload)
          ? payload
          : payload?.content || payload?.dados || payload?.data || [];

        setCargos(listaCargos);
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar cargos');
      } finally {
        setLoadingCargos(false);
      }
    };

    fetchCargos();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      await api.post('/colaboradores', {
        ...form,
        cargoId: Number(form.cargoId),
      });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao realizar o cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
        <label>Cargo</label>
        <select
          name="cargoId"
          value={form.cargoId}
          onChange={handleChange}
          disabled={loadingCargos || cargos.length === 0}
          required
        >
          <option value="">{loadingCargos ? 'Carregando cargos...' : 'Selecione um cargo'}</option>
          {cargos.map((cargo) => (
            <option key={cargo.id} value={cargo.id}>
              {cargo.nome || cargo.descricao || cargo.titulo || `Cargo ${cargo.id}`}
            </option>
          ))}
        </select>
      </div>

      <div className="grupo-entrada">
        <label>data de admissão</label>
        <input
          type="date"
          name="dataAdmissao"
          value={form.dataAdmissao}
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

      {error && <p className="erro">{error}</p>}

      <button type="submit" disabled={loading || loadingCargos || cargos.length === 0}>
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </button>
    </form>
  );
}