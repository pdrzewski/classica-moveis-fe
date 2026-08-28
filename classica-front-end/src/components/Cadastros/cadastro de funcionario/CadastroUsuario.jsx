import { useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/colaboradores', form);
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
        <input
          type="text"
          name="cargo"
          value={form.cargo}
          onChange={handleChange}
          required
        />
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

      <button type="submit" disabled={loading}>
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </button>
    </form>
  );
}