import api from './Api';

const extrairLista = (resposta) => {
  const dados = resposta?.data;

  if (Array.isArray(dados)) return dados;
  if (Array.isArray(dados?.content)) return dados.content;
  if (Array.isArray(dados?.dados)) return dados.dados;
  return [];
};

const buscar = async (endpoint) => {
  return api.get(endpoint).catch(() => api.get(`/api${endpoint}`));
};

export const carregarDadosDaTabela = async (config) => {
  const resposta = await buscar(config.endpoint);
  const registros = extrairLista(resposta);
  const relacoes = Object.entries(config.relations || {});
  const resultados = await Promise.all(relacoes.map(async ([campo, endpoint]) => {
    try {
      const relacao = await buscar(endpoint);
      return [campo, extrairLista(relacao)];
    } catch {
      return [campo, []];
    }
  }));

  return {
    registros,
    referencias: Object.fromEntries(resultados),
  };
};