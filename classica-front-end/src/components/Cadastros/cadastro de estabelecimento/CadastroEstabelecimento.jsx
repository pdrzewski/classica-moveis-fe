import { useEffect, useState } from 'react';
import api from '../../../services/Api';

const listarDados = (resposta) => {
  const dados = resposta?.data;

  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const pegarId = (item) => item?.id ?? item?.colaboradorId ?? item?.colaborador_id ?? item?.responsavelId ?? item?.responsavel_id ?? item?.codigo;

const mostrarResponsavel = (colaborador) => {
  if (!colaborador) return 'Responsável';
  return colaborador.nome || colaborador.responsavel || colaborador.titulo || `Colaborador ${pegarId(colaborador)}`;
};

const camposPadrao = {
  nome: '',
  cnpj: '',
  telefone: '',
  responsavelId: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
};

export default function CadastroEstabelecimento({ onSuccess }) {
  const [form, setForm] = useState(camposPadrao);
  const [responsaveis, setResponsaveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingResponsaveis, setLoadingResponsaveis] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [error, setError] = useState('');
  const [mostrarConfirmacaoCancelamento, setMostrarConfirmacaoCancelamento] = useState(false);

  useEffect(() => {
    const buscarResponsaveis = async () => {
      try {
        const resposta = await api.get('/colaboradores').catch(() => api.get('/api/colaboradores'));
        setResponsaveis(listarDados(resposta));
      } catch (err) {
        setError(err.response?.data?.message || 'Erro ao carregar responsáveis');
      } finally {
        setLoadingResponsaveis(false);
      }
    };

    buscarResponsaveis();
  }, []);

  const buscarEnderecoPorCep = async (cep) => {
    if (!cep || cep.length !== 8) {
      return;
    }

    setBuscandoCep(true);
    setError('');

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await resposta.json();

      if (data.erro) {
        setError('CEP não encontrado. Verifique o valor informado.');
        return;
      }

      setForm((prevForm) => ({
        ...prevForm,
        cep,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || '',
      }));
    } catch {
      setError('Não foi possível buscar o endereço do CEP informado.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const valor = name === 'cep' ? value.replace(/\D/g, '').slice(0, 8) : value;

    setForm({ ...form, [name]: valor });

    if (name === 'cep' && valor.length === 8) {
      buscarEnderecoPorCep(valor);
    }
  };

  const handleCancelCadastro = () => {
    setMostrarConfirmacaoCancelamento(false);
    onSuccess?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (!form.responsavelId) {
      setError('Selecione o responsável antes de cadastrar.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        nome: form.nome,
        cnpj: form.cnpj,
        telefone: form.telefone,
        responsavelId: Number(form.responsavelId),
        cep: form.cep,
        logradouro: form.logradouro,
        bairro: form.bairro,
        cidade: form.cidade,
        numero: form.numero,
        complemento: form.complemento || '',
        estado: form.estado,
      };

      await api.post('/estabelecimentos', payload).catch(() => api.post('/api/estabelecimentos', payload));
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao cadastrar estabelecimento');
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
          <label>CNPJ</label>
          <input
            type="text"
            name="cnpj"
            value={form.cnpj}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Telefone</label>
          <input
            type="text"
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Responsável</label>
          <select
            name="responsavelId"
            value={form.responsavelId}
            onChange={handleChange}
            disabled={loadingResponsaveis || responsaveis.length === 0}
            required
          >
            <option value="">{loadingResponsaveis ? 'Carregando responsáveis...' : 'Selecione o responsável'}</option>
            {responsaveis.map((responsavel) => {
              const responsavelId = pegarId(responsavel);
              return (
                <option key={responsavelId} value={responsavelId}>
                  {mostrarResponsavel(responsavel)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="grupo-entrada">
          <label>CEP</label>
          <input
            type="text"
            name="cep"
            value={form.cep}
            onChange={handleChange}
            onBlur={() => {
              if (form.cep.length === 8) {
                buscarEnderecoPorCep(form.cep);
              }
            }}
            required
            placeholder="Digite o CEP"
          />
          {buscandoCep && <small>Buscando endereço...</small>}
        </div>

        <div className="grupo-entrada">
          <label>Logradouro</label>
          <input
            type="text"
            name="logradouro"
            value={form.logradouro}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Número</label>
          <input
            type="text"
            name="numero"
            value={form.numero}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Complemento</label>
          <input
            type="text"
            name="complemento"
            value={form.complemento}
            onChange={handleChange}
          />
        </div>

        <div className="grupo-entrada">
          <label>Bairro</label>
          <input
            type="text"
            name="bairro"
            value={form.bairro}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Cidade</label>
          <input
            type="text"
            name="cidade"
            value={form.cidade}
            onChange={handleChange}
            required
          />
        </div>

        <div className="grupo-entrada">
          <label>Estado</label>
          <input
            type="text"
            name="estado"
            value={form.estado}
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

        <button type="submit" disabled={loading || loadingResponsaveis || responsaveis.length === 0}>
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
