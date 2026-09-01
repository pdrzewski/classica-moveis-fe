import { useState } from 'react';
import api from '../../../services/Api';

const camposPadrao = {
  categoria: '',
  nome: '',
};

export default function CadastroCategoria({ onSuccess }) {
  const [form, setForm] = useState(camposPadrao);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mostrarConfirmacaoCancelamento, setMostrarConfirmacaoCancelamento] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
  };

  const handleCancelCadastro = () => {
    setMostrarConfirmacaoCancelamento(false);
    onSuccess?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        categoria: form.categoria,
        nome: form.nome,
      };

      await api.post('/categorias', payload).catch(() => api.post('/api/categorias', payload));
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao cadastrar categoria');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-cadastro-funcionario">
      <div className="form-grid">
        <div className="grupo-entrada">
          <label>Categoria</label>
          <input
            type="text"
            name="categoria"
            value={form.categoria}
            onChange={handleChange}
            required
          />
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

        <button type="submit" disabled={loading}>
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
