import { createContext, useContext, useState } from 'react';
import api from '../services/Api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const login = async (loginData) => {
    setCarregando(true);
    try {
      const resposta = await api.post('/login', loginData);
      const dados = resposta?.data;
      if (dados) {
        const usuarioCompleto = {
          id: dados.usuarioId,
          login: dados.login,
          permissoes: dados.permissoes || [],
          colaborador: dados.colaborador,
          nome: dados.colaborador?.nome,
        };
        setUsuario(usuarioCompleto);
      }
      return resposta;
    } finally {
      setCarregando(false);
    }
  };

  const logout = () => {
    setUsuario(null);
  };

  const atualizarUsuario = (dados) => {
    setUsuario((prev) => ({ ...prev, ...dados }));
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