import axios from 'axios';

const mensagemHttp = (status) => {
  if (status === 400) return 'Confira os dados informados e tente novamente.';
  if (status === 401) return 'Sua sessão expirou ou seus dados de acesso são inválidos. Entre novamente.';
  if (status === 403) return 'Você não tem permissão para realizar esta ação.';
  if (status === 404) return 'Não encontramos o registro ou serviço solicitado.';
  if (status === 409) return 'Esta ação não pode ser concluída porque os dados estão em conflito.';
  if (status === 422) return 'Alguns dados não puderam ser aceitos. Revise os campos e tente novamente.';
  if (status >= 500) return 'O servidor encontrou um problema. Tente novamente em instantes.';
  return 'Não foi possível concluir a solicitação. Tente novamente.';
};

const mensagemTecnica = (mensagem, status) => {
  if (typeof mensagem !== 'string' || !mensagem.trim()) return true;
  const texto = mensagem.trim();
  return /^\d{3}(?:\s+.*)?[.!]?$/i.test(texto)
    || /^(?:request failed with status code|http failure response).*\b\d{3}\b[.!]?$/i.test(texto)
    || /^(not found|internal server error|bad request|forbidden|unauthorized)$/i.test(texto)
    || (status && texto === String(status));
};

const api = axios.create({
  baseURL: import.meta.env.DEV
    ? '/backend-api'
    : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'),
  withCredentials: true,
});

api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const status = erro.response?.status;
    const dados = erro.response?.data;

    if (status) {
      const mensagemServidor = typeof dados === 'string'
        ? dados
        : dados?.message || dados?.mensagem || dados?.error || dados?.erro;
      if (mensagemTecnica(mensagemServidor, status)) {
        const mensagemAmigavel = mensagemHttp(status);
        if (typeof dados === 'string') {
          erro.response.data = { message: mensagemAmigavel };
        } else if (dados && typeof dados === 'object') {
          erro.response.data = { ...dados, message: mensagemAmigavel, mensagem: mensagemAmigavel };
        } else {
          erro.response.data = { message: mensagemAmigavel };
        }
        erro.message = mensagemAmigavel;
      }
    } else {
      erro.message = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    }

    return Promise.reject(erro);
  }
);

export default api;