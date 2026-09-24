import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/home';
import AppLayout from './components/AppLayout';
import CadastroPage from './pages/CadastroPage';
import Estoque from './pages/Estoque';
import Movimentacao from './pages/Movimentacao';
import Historico from './pages/Historico';
import Relatorios from './pages/Relatorios';
import VendasPendentes from './pages/VendasPendentes';
import { AuthProvider } from './context/AuthContext';
import AjusteEstoque from './pages/AjusteEstoque';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
<Route element={<AppLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/cadastro/:tipo" element={<CadastroPage />} />
            <Route path="/estoque" element={<Estoque />} />
            <Route path="/movimentacao" element={<Navigate to="/movimentacao/compra" replace />} />
            <Route path="/movimentacao/:tipo" element={<Movimentacao />} />
            <Route path="/vendas-pendentes" element={<VendasPendentes />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/ajuste-estoque" element={<AjusteEstoque />} />
            <Route path="/relatorios" element={<Relatorios />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}