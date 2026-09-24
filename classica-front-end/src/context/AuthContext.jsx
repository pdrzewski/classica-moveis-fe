import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/Api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'classica_usuario';

const salvarUsuario = (usuario) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
  } catch {}
};

const carregarUsuarioStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const limparUsuarioStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const restaurarSessao = async () => {
      try {
        const resp = await api.get('/me').catch(() => api.get('/api/me'));
        if (resp?.data) {
          const dados = resp.data;
          const colaborador = dados.colaborador || {};
          const usuarioCompleto = {
            id: dados.usuarioId || dados.id,
            login: dados.login,
            permissoes: dados.permissoes || [],
            colaborador: colaborador,
            colaboradorId: colaborador.id || dados.colaboradorId || dados.usuarioId || dados.id,
            nome: colaborador.nome || dados.nome,
          };
          setUsuario(usuarioCompleto);
          salvarUsuario(usuarioCompleto);
        } else {
          const storage = carregarUsuarioStorage();
          if (storage) setUsuario(storage);
        }
      } catch {
        const storage = carregarUsuarioStorage();
        if (storage) setUsuario(storage);
      } finally {
        setCarregando(false);
      }
    };
    restaurarSessao();
  }, []);

  const login = async (loginData) => {
    setCarregando(true);
    try {
      const resposta = await api.post('/login', loginData);
      const dados = resposta?.data;
      if (dados) {
        const colaborador = dados.colaborador || {};
        const usuarioCompleto = {
          id: dados.usuarioId,
          login: dados.login,
          permissoes: dados.permissoes || [],
          colaborador: colaborador,
          colaboradorId: colaborador.id || dados.colaboradorId || dados.usuarioId,
          nome: colaborador.nome,
        };
        setUsuario(usuarioCompleto);
        salvarUsuario(usuarioCompleto);
      }
      return resposta;
    } finally {
      setCarregando(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout').catch(() => api.post('/api/logout'));
    } catch {}
    setUsuario(null);
    limparUsuarioStorage();
  };

  const atualizarUsuario = (dados) => {
    setUsuario((prev) => {
      const novo = { ...prev, ...dados };
      salvarUsuario(novo);
      return novo;
    });
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, atualizarUsuario, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return contexto;
}