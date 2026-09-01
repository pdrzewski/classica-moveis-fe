import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import logo from '../assets/Clássica(1).png';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/home');
  };

  return (
    <>
      <div className="logo-autenticacao">
        <img src={logo} alt="Logo da Clássica Móveis" />
      </div>

      <div className="container-autenticacao">
        <div className="cartao-autenticacao">
          <h1>Bem-vindo</h1>
          <p>Entre com sua conta</p>
          <LoginForm onSuccess={handleLoginSuccess} />
        </div>
      </div>
    </>
  );
}