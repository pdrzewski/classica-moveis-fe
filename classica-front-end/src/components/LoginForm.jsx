import { useState } from 'react';
import api from '../services/Api';
import '../styles/formularios.css';

export default function LoginForm({ onSuccess }) {
  const [form, setForm] = useState({ login: '', senha: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setForm((atual) => ({
      ...atual,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/login', form);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Usuário ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="input-group">
        <label htmlFor="login">Usuário</label>
        <input
          id="login"
          name="login"
          type="text"
          value={form.login}
          onChange={handleChange}
          required
        />
      </div>

      <div className="input-group">
        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          value={form.senha}
          onChange={handleChange}
          required
        />
      </div>

      {error && <p className="erro">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}