import { useNavigate, Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import logo from '../assets/Clássica(1).png';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    alert('Login realizado com sucesso! 🎉');
    navigate('/home');
  };

  return (
    <>
      <div className="auth-logo">
        <img src={logo} alt="Logo da Clássica Móveis" />
      </div>
      <div className="auth-container">
        <div className="auth-card">
          <h1>Bem-vindo</h1>
          <p>Faça login para acessar sua conta</p>
          
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      </div>
    </>
  );
}