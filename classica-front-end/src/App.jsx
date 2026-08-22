import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        {/* Futuramente: <Route path="/index" element={<Index />} /> ou cadastrar livro */}
      </Routes>
    </Router>
  );
}

export default App;