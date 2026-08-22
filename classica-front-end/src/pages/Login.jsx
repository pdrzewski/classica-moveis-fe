import { useNavigate, Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

export default function Login() {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    alert('Login realizado com sucesso! 🎉');
    navigate('/home');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Bem-vindo</h1>
        <p>Faça login para acessar sua conta</p>
        
        <LoginForm onSuccess={handleLoginSuccess} />

        <p className="auth-link">
          Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}