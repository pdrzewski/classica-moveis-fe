import { useNavigate, Link } from 'react-router-dom';
import CadastroForm from '../components/Cadastros/cadastro de funcionario/CadastroUsuario';
import logo from '../assets/Clássica(1).png';
import './Auth.css';

export default function Cadastro() {
  const navigate = useNavigate();

  const handleCadastroSuccess = () => {
    alert('Cadastro realizado com sucesso! ✅');
    navigate('/login');
  };

  return (
    <>
      <div className="logo-autenticacao">
        <img src={logo} alt="Logo da Clássica Móveis" />
      </div>
      <div className="container-autenticacao">
        <div className="cartao-autenticacao">
          <h1>Criar Conta</h1>
          <p>Preencha os dados abaixo</p>
          
          <CadastroForm onSuccess={handleCadastroSuccess} />

          <p className="link-autenticacao">
            Já tem conta? <Link to="/login">Faça login</Link>
          </p>
        </div>
      </div>
    </>
  );
}