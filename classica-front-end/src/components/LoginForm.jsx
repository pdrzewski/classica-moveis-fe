import { useState } from 'react';
import api from '../services/api';

export default function LoginForm({ onSuccess }) {
  const [form, setForm] = useState({ usuario: '', senha: '' });
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
      await api.post('/login/entrar', form);
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
          name="usuario"
          value={form.usuario}
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