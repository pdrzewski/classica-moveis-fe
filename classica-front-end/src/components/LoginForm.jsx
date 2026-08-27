import { useState } from 'react';
import api from '../services/Api';

export default function LoginForm({ onSuccess }) {
  const [form, setForm] = useState({ login: '', senha: '' });
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
      await api.post('/login', form);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Usuário ou senha incorretos');
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
          name="login"
          value={form.login}
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
        {loading ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}