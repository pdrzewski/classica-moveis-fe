import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/home';
import AppLayout from './components/AppLayout';
import CadastroPage from './pages/CadastroPage';
import Estoque from './pages/Estoque';
import Movimentacao from './pages/Movimentacao';
import Historico from './pages/Historico';
import Relatorios from './pages/Relatorios';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<AppLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/cadastro/:tipo" element={<CadastroPage />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/movimentacao" element={<Movimentacao />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/relatorios" element={<Relatorios />} />
        </Route>
      </Routes>
    </Router>
  );
}