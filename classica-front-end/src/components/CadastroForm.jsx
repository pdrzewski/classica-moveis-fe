import { useState } from 'react';
import api from '../services/api';

export default function CadastroForm({ onSuccess }) {
  const [form, setForm] = useState({
    usuario: '',
    email: '',
    nome: '',
    senha: ''
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
      await api.post('/login/cadastrar', form);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao realizar o cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-group">
        <label>Usuário</label>
        <input
          type="text"
          name="usuario"
          value={form.usuario}
          onChange={handleChange}
          required
        />
      </div>

      <div className="input-group">
        <label>E-mail</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="input-group">
        <label>Nome Completo</label>
        <input
          type="text"
          name="nome"
          value={form.nome}
          onChange={handleChange}
          required
        />
      </div>

      <div className="input-group">
        <label>Senha</label>
        <input
          type="password"
          name="senha"
          value={form.senha}
          onChange={handleChange}
          required
        />
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Cadastrando...' : 'Cadastrar'}
      </button>
    </form>
  );
}