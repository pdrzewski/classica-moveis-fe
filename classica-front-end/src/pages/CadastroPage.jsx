import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cadastroConfigs } from './cadastroConfig';
import { carregarDadosDaTabela } from '../services/cadastroTabelaService';
import api from '../services/Api';
import CadastroUsuario from '../components/Cadastros/cadastro de funcionario/CadastroUsuario';
import CadastroFornecedora from '../components/Cadastros/cadastro de fornecedora/CadastroFornecedora';
import CadastroEstabelecimento from '../components/Cadastros/cadastro de estabelecimento/CadastroEstabelecimento';
import CadastroCategoria from '../components/Cadastros/cadastro de categoria/CadastroCategoria';
import CadastroProduto from '../components/Cadastros/cadastro de produto/CadastroProduto';
import CadastroCliente from '../components/Cadastros/cadastro de cliente/CadastroCliente';

const labels = {
  nome: 'Nome', cargoId: 'Cargo', cpf: 'CPF', usuarioId: 'Usuário',
  dataAdmissao: 'Data de admissão', dataNascimento: 'Data de nascimento', salario: 'Salário',
  carteiraTrabalho: 'Carteira de trabalho', comissao: 'Comissão (%)', estabelecimentoId: 'Estabelecimento',
  categoria: 'Categoria', cnpj: 'CNPJ', representante: 'Representante',
  telefone1: 'Telefone 1', telefone2: 'Telefone 2', cep: 'CEP', logradouro: 'Logradouro', numero: 'Número',
  complemento: 'Complemento', bairro: 'Bairro', cidade: 'Cidade', estado: 'Estado', fornecedorId: 'Fornecedor',
  categoriaId: 'Categoria', sku: 'SKU', codigoBarras: 'Código de barras', unidadeMedida: 'Unidade de medida',
  marca: 'Marca', precoCusto: 'Preço de custo', precoVenda: 'Preço de venda', estoqueMinimo: 'Estoque mínimo',
  ativo: 'Ativo', telefone: 'Telefone', responsavelId: 'Responsável', documento: 'Documento', email: 'E-mail',
  observacao: 'Observação', ie: 'IE',
};

const BotoesAcaoProduto = ({ onEditar, onRemover, desabilitado }) => (
  <div className="acoes-funcionario-bar">
    <button className="btn-icon" onClick={onEditar} title="Editar" disabled={desabilitado}><IconEditar /></button>
    <button className="btn-icon btn-icon-perigo" onClick={onRemover} title="Remover" disabled={desabilitado}><IconLixeira /></button>
  </div>
);

const ModalDetalhesProduto = ({ produto, config, labels, mostrarValor, referencias, onClose, onEditar, onRemover, carregando }) => {
  if (!produto) return null;

  return (
    <div className="camada-modal">
      <div className="cartao-modal modal-detalhes">
        <button type="button" className="fechar" onClick={onClose}><IconFechar /></button>
        <p className="titulo-pequeno">{produto.nome}</p>
        <h2>Produto</h2>
        <div className="detalhes-grid">
          {config.fields.map((field) => (
            <div className="detalhe-item" key={field}>
              <span>{labels[field] || field}</span>
              <strong>{mostrarValor(produto, field, referencias)}</strong>
            </div>
          ))}
        </div>
        <BotoesAcaoProduto
          onEditar={onEditar}
          onRemover={onRemover}
          desabilitado={carregando}
        />
      </div>
    </div>
  );
};

const ModalEditarProduto = ({ produto, onClose, onSuccess, fornecedores, categorias }) => {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [formData, setFormData] = useState({
    fornecedorId: produto?.fornecedorId || '',
    categoriaId: produto?.categoriaId || '',
    nome: produto?.nome || '',
    sku: produto?.sku || '',
    codigoBarras: produto?.codigoBarras || '',
    unidadeMedida: produto?.unidadeMedida || '',
    marca: produto?.marca || '',
    precoCusto: produto?.precoCusto || '',
    precoVenda: produto?.precoVenda || '',
    estoqueMinimo: produto?.estoqueMinimo || '',
    ativo: Boolean(produto?.ativo),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      const payload = {
        fornecedorId: Number(formData.fornecedorId) || null,
        categoriaId: Number(formData.categoriaId) || null,
        nome: formData.nome,
        sku: formData.sku,
        codigoBarras: formData.codigoBarras,
        unidadeMedida: formData.unidadeMedida,
        marca: formData.marca,
        precoCusto: Number(formData.precoCusto) || 0,
        precoVenda: Number(formData.precoVenda) || 0,
        estoqueMinimo: Number(formData.estoqueMinimo) || 0,
        ativo: Boolean(formData.ativo),
      };
      await api.put(`/produtos/${produto.id}`, payload).catch(() => api.put(`/api/produtos/${produto.id}`, payload));
      onSuccess();
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao atualizar produto.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="camada-modal">
      <div className="cartao-modal">
        <button type="button" className="fechar" onClick={onClose}><IconFechar /></button>
        <h2>Editar produto</h2>
        {erro && <div className="aviso">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="campo">
              <label>Fornecedor *</label>
              <select value={formData.fornecedorId} onChange={(e) => setFormData({...formData, fornecedorId: e.target.value})} required>
                <option value="">Selecione</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome || f.razaoSocial || f.titulo}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Categoria *</label>
              <select value={formData.categoriaId} onChange={(e) => setFormData({...formData, categoriaId: e.target.value})} required>
                <option value="">Selecione</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome || c.categoria || c.titulo}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Nome *</label>
              <input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
            </div>
            <div className="campo">
              <label>SKU *</label>
              <input value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} required />
            </div>
            <div className="campo">
              <label>Código de barras *</label>
              <input value={formData.codigoBarras} onChange={(e) => setFormData({...formData, codigoBarras: e.target.value})} required />
            </div>
            <div className="campo">
              <label>Unidade de medida *</label>
              <input value={formData.unidadeMedida} onChange={(e) => setFormData({...formData, unidadeMedida: e.target.value})} required />
            </div>
            <div className="campo">
              <label>Marca *</label>
              <input value={formData.marca} onChange={(e) => setFormData({...formData, marca: e.target.value})} required />
            </div>
            <div className="campo">
              <label>Preço de custo *</label>
              <input type="number" step="0.01" min="0" value={formData.precoCusto} onChange={(e) => setFormData({...formData, precoCusto: e.target.value})} required />
            </div>
            <div className="campo">
              <label>Preço de venda *</label>
              <input type="number" step="0.01" min="0" value={formData.precoVenda} onChange={(e) => setFormData({...formData, precoVenda: e.target.value})} required />
            </div>
            <div className="campo">
              <label>Estoque mínimo *</label>
              <input type="number" min="0" value={formData.estoqueMinimo} onChange={(e) => setFormData({...formData, estoqueMinimo: e.target.value})} required />
            </div>
            <div className="campo checkbox">
              <label>
                <input type="checkbox" checked={formData.ativo} onChange={(e) => setFormData({...formData, ativo: e.target.checked})} />
                Ativo
              </label>
            </div>
          </div>
          <div className="acoes-form">
            <button type="button" className="secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primario" disabled={carregando}>{carregando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const obterValor = (item, key) => {
  const snake = key.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);
  const endereco = item?.endereco || {};
  const usuario = item?.usuario || {};
  const relacionamento = key.endsWith('Id') ? item?.[key.slice(0, -2)] : undefined;
  return relacionamento ?? item?.[key] ?? item?.[snake] ?? endereco?.[key] ?? endereco?.[snake] ?? usuario?.[key] ?? usuario?.[snake];
};

const obterId = (item) => item?.id ?? item?.codigo ?? item?.colaboradorId ?? item?.cargoId ?? item?.fornecedorId ?? item?.categoriaId;

const mostrarValor = (item, key, referencias) => {
  const valor = obterValor(item, key);
  if (key === 'senha') return '******** (não exibida por segurança)';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (valor && typeof valor === 'object') return valor.nome || valor.cargo || valor.categoria || valor.razaoSocial || valor.titulo || valor.descricao || valor.id || 'Não informado';
  if (key.endsWith('Id') && valor !== null && valor !== undefined) {
    const relacionado = referencias[key]?.find((referencia) => String(obterId(referencia)) === String(valor));
    return relacionado?.nome || relacionado?.cargo || relacionado?.categoria || relacionado?.razaoSocial || relacionado?.titulo || relacionado?.descricao || String(valor);
  }
  return valor === null || valor === undefined || valor === '' ? 'Não informado' : String(valor);
};

const formatarData = (data) => {
  if (!data) return '';
  const d = new Date(data);
  return d.toISOString().split('T')[0];
};

const IconEditar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconFerias = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M12 2v20M17 5H7" />
    <path d="M19 12a7 7 0 0 0-7-7" />
    <path d="M5 12a7 7 0 0 1 7 7" />
  </svg>
);
const IconLixeira = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const IconFechar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BotoesAcao = ({ onEditar, onFerias, onRemover, desabilitado }) => (
  <div className="acoes-funcionario-bar">
    <button className="btn-icon" onClick={onEditar} title="Editar" disabled={desabilitado}><IconEditar /></button>
    <button className="btn-icon" onClick={onFerias} title="Registrar férias" disabled={desabilitado}><IconFerias /></button>
    <button className="btn-icon btn-icon-perigo" onClick={onRemover} title="Remover" disabled={desabilitado}><IconLixeira /></button>
  </div>
);

const ModalDetalhesFuncionario = ({ colaborador, config, labels, mostrarValor, referencias, onClose, onEditar, onFerias, onRemover, carregando }) => {
  if (!colaborador) return null;

  return (
    <div className="camada-modal">
      <div className="cartao-modal modal-detalhes">
        <button type="button" className="fechar" onClick={onClose}><IconFechar /></button>
        <p className="titulo-pequeno">{colaborador.nome}</p>
        <h2>Funcionário</h2>
        <div className="detalhes-grid">
          {config.fields.map((field) => (
            <div className="detalhe-item" key={field}>
              <span>{labels[field] || field}</span>
              <strong>{mostrarValor(colaborador, field, referencias)}</strong>
            </div>
          ))}
        </div>
        <BotoesAcao
          onEditar={onEditar}
          onFerias={onFerias}
          onRemover={onRemover}
          desabilitado={carregando}
        />
      </div>
    </div>
  );
};

const ModalEditarFuncionario = ({ colaborador, onClose, onSuccess, cargos, estabelecimentos, usuarios }) => {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [formData, setFormData] = useState({
    nome: colaborador?.nome || '',
    cargoId: colaborador?.cargoId || '',
    dataAdmissao: formatarData(colaborador?.dataAdmissao),
    dataNascimento: formatarData(colaborador?.dataNascimento),
    salario: colaborador?.salario || '',
    carteiraTrabalho: colaborador?.carteiraTrabalho || '',
    comissao: colaborador?.comissao || '',
    estabelecimentoId: colaborador?.estabelecimentoId || '',
    cpf: colaborador?.cpf || '',
  });

  const usuarioAtual = usuarios.find((u) => Number(u.id) === Number(colaborador?.usuarioId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      const payload = {
        nome: formData.nome,
        cargoId: Number(formData.cargoId) || null,
        usuarioId: Number(colaborador.usuarioId) || null,
        dataAdmissao: formData.dataAdmissao || null,
        dataNascimento: formData.dataNascimento || null,
        salario: Number(formData.salario) || 0,
        carteiraTrabalho: formData.carteiraTrabalho || null,
        comissao: Number(formData.comissao) || null,
        estabelecimentoId: Number(formData.estabelecimentoId) || null,
        cpf: formData.cpf || null,
      };
      await api.put(`/colaboradores/${colaborador.id}`, payload).catch(() => api.put(`/api/colaboradores/${colaborador.id}`, payload));
      onSuccess();
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao atualizar funcionário.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="camada-modal">
      <div className="cartao-modal">
        <button type="button" className="fechar" onClick={onClose}><IconFechar /></button>
        <h2>Editar funcionário</h2>
        {erro && <div className="aviso">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="campo">
              <label>Nome *</label>
              <input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
            </div>
            <div className="campo">
              <label>CPF</label>
              <input value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} />
            </div>
            <div className="campo">
              <label>Cargo *</label>
              <select value={formData.cargoId} onChange={(e) => setFormData({...formData, cargoId: e.target.value})} required>
                <option value="">Selecione</option>
                {cargos.map((c) => <option key={c.id} value={c.id}>{c.nome || c.cargo || c.titulo}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Usuário</label>
              <input
                value={usuarioAtual ? (usuarioAtual.nome || usuarioAtual.login || usuarioAtual.email) : 'Não vinculado'}
                disabled
                className="input-readonly"
              />
            </div>
            <div className="campo">
              <label>Estabelecimento *</label>
              <select value={formData.estabelecimentoId} onChange={(e) => setFormData({...formData, estabelecimentoId: e.target.value})} required>
                <option value="">Selecione</option>
                {estabelecimentos.map((e) => <option key={e.id} value={e.id}>{e.nome || e.titulo}</option>)}
              </select>
            </div>
            <div className="campo">
              <label>Data admissão</label>
              <input type="date" value={formData.dataAdmissao} onChange={(e) => setFormData({...formData, dataAdmissao: e.target.value})} />
            </div>
            <div className="campo">
              <label>Data nascimento</label>
              <input type="date" value={formData.dataNascimento} onChange={(e) => setFormData({...formData, dataNascimento: e.target.value})} />
            </div>
            <div className="campo">
              <label>Salário</label>
              <input type="number" step="0.01" value={formData.salario} onChange={(e) => setFormData({...formData, salario: e.target.value})} />
            </div>
            <div className="campo">
              <label>Carteira trabalho</label>
              <input value={formData.carteiraTrabalho} onChange={(e) => setFormData({...formData, carteiraTrabalho: e.target.value})} />
            </div>
            <div className="campo">
              <label>Comissão (%)</label>
              <input type="number" step="0.01" value={formData.comissao} onChange={(e) => setFormData({...formData, comissao: e.target.value})} />
            </div>
          </div>
          <div className="acoes-form">
            <button type="button" className="secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primario" disabled={carregando}>{carregando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ModalFeriasFuncionario = ({ colaborador, onClose, onSuccess }) => {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [feriasData, setFeriasData] = useState({ dataInicio: '', dataFim: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feriasData.dataInicio || !feriasData.dataFim) {
      setErro('Informe data de início e fim.');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      await api.patch(`/colaboradores/${colaborador.id}/ferias`, feriasData).catch(() => api.patch(`/api/colaboradores/${colaborador.id}/ferias`, feriasData));
      onSuccess();
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao registrar férias.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="camada-modal">
      <div className="cartao-modal">
        <button type="button" className="fechar" onClick={onClose}><IconFechar /></button>
        <h2>Registrar férias</h2>
        {erro && <div className="aviso">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="campo">
              <label>Data início *</label>
              <input type="date" value={feriasData.dataInicio} onChange={(e) => setFeriasData({...feriasData, dataInicio: e.target.value})} required />
            </div>
            <div className="campo">
              <label>Data fim *</label>
              <input type="date" value={feriasData.dataFim} onChange={(e) => setFeriasData({...feriasData, dataFim: e.target.value})} required />
            </div>
          </div>
          <div className="acoes-form">
            <button type="button" className="secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primario" disabled={carregando}>{carregando ? 'Salvando...' : 'Registrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BotoesAcaoCliente = ({ onEditar, onRemover, desabilitado }) => (
  <div className="acoes-funcionario-bar">
    <button className="btn-icon" onClick={onEditar} title="Editar" disabled={desabilitado}><IconEditar /></button>
    <button className="btn-icon btn-icon-perigo" onClick={onRemover} title="Remover" disabled={desabilitado}><IconLixeira /></button>
  </div>
);

const ModalDetalhesCliente = ({ cliente, config, labels, mostrarValor, referencias, onClose, onEditar, onRemover, carregando }) => {
  if (!cliente) return null;

  return (
    <div className="camada-modal">
      <div className="cartao-modal modal-detalhes">
        <button type="button" className="fechar" onClick={onClose}><IconFechar /></button>
        <p className="titulo-pequeno">{cliente.nome}</p>
        <h2>Cliente</h2>
        <div className="detalhes-grid">
          {config.fields.map((field) => (
            <div className="detalhe-item" key={field}>
              <span>{labels[field] || field}</span>
              <strong>{mostrarValor(cliente, field, referencias)}</strong>
            </div>
          ))}
        </div>
        <BotoesAcaoCliente
          onEditar={onEditar}
          onRemover={onRemover}
          desabilitado={carregando}
        />
      </div>
    </div>
  );
};

const ModalEditarCliente = ({ cliente, onClose, onSuccess }) => {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [formData, setFormData] = useState({
    nome: cliente?.nome || '',
    documento: cliente?.documento || '',
    telefone1: cliente?.telefone1 || '',
    telefone2: cliente?.telefone2 || '',
    email: cliente?.email || '',
    observacao: cliente?.observacao || '',
    ie: cliente?.ie || '',
    cep: cliente?.endereco?.cep || '',
    logradouro: cliente?.endereco?.logradouro || '',
    numero: cliente?.endereco?.numero || '',
    complemento: cliente?.endereco?.complemento || '',
    bairro: cliente?.endereco?.bairro || '',
    cidade: cliente?.endereco?.cidade || '',
    estado: cliente?.endereco?.estado || '',
    enderecoId: cliente?.enderecoId || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      const enderecoPayload = {
        cep: formData.cep,
        logradouro: formData.logradouro,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
      };
      const payload = {
        id: Number(cliente.id),
        nome: formData.nome,
        documento: formData.documento,
        telefone1: formData.telefone1,
        telefone2: formData.telefone2,
        email: formData.email,
        observacao: formData.observacao,
        ie: formData.ie,
        endereco: enderecoPayload,
        enderecoId: formData.enderecoId ? Number(formData.enderecoId) : null,
      };
      await api.put(`/clientes/${cliente.id}`, payload).catch(() => api.put(`/api/clientes/${cliente.id}`, payload));
      onSuccess();
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao atualizar cliente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="camada-modal">
      <div className="cartao-modal">
        <button type="button" className="fechar" onClick={onClose}><IconFechar /></button>
        <h2>Editar cliente</h2>
        {erro && <div className="aviso">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="campo">
              <label>Nome *</label>
              <input value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} required />
            </div>
            <div className="campo">
              <label>Documento (CPF/CNPJ) *</label>
              <input value={formData.documento} onChange={(e) => setFormData({...formData, documento: e.target.value})} required />
            </div>
            <div className="campo">
              <label>Telefone 1</label>
              <input value={formData.telefone1} onChange={(e) => setFormData({...formData, telefone1: e.target.value})} />
            </div>
            <div className="campo">
              <label>Telefone 2</label>
              <input value={formData.telefone2} onChange={(e) => setFormData({...formData, telefone2: e.target.value})} />
            </div>
            <div className="campo">
              <label>E-mail</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="campo">
              <label>Inscrição Estadual</label>
              <input value={formData.ie} onChange={(e) => setFormData({...formData, ie: e.target.value})} />
            </div>
            <div className="campo">
              <label>Observação</label>
              <textarea value={formData.observacao} onChange={(e) => setFormData({...formData, observacao: e.target.value})} rows={2} />
            </div>
            <div className="campo">
              <label>CEP</label>
              <input value={formData.cep} onChange={(e) => setFormData({...formData, cep: e.target.value})} />
            </div>
            <div className="campo">
              <label>Logradouro</label>
              <input value={formData.logradouro} onChange={(e) => setFormData({...formData, logradouro: e.target.value})} />
            </div>
            <div className="campo">
              <label>Número</label>
              <input value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} />
            </div>
            <div className="campo">
              <label>Complemento</label>
              <input value={formData.complemento} onChange={(e) => setFormData({...formData, complemento: e.target.value})} />
            </div>
            <div className="campo">
              <label>Bairro</label>
              <input value={formData.bairro} onChange={(e) => setFormData({...formData, bairro: e.target.value})} />
            </div>
            <div className="campo">
              <label>Cidade</label>
              <input value={formData.cidade} onChange={(e) => setFormData({...formData, cidade: e.target.value})} />
            </div>
            <div className="campo">
              <label>Estado</label>
              <input value={formData.estado} onChange={(e) => setFormData({...formData, estado: e.target.value})} />
            </div>
            <div className="campo">
              <label>Endereço ID (opcional)</label>
              <input value={formData.enderecoId} onChange={(e) => setFormData({...formData, enderecoId: e.target.value})} />
            </div>
          </div>
          <div className="acoes-form">
            <button type="button" className="secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primario" disabled={carregando}>{carregando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function CadastroPage() {
  const { tipo } = useParams();
  const config = cadastroConfigs[tipo] || cadastroConfigs.produto;
  const [query, setQuery] = useState('');
  const [fornecedorFiltro, setFornecedorFiltro] = useState('');
  const [rows, setRows] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [referencias, setReferencias] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modalFuncionario, setModalFuncionario] = useState(null);
  const [modalProduto, setModalProduto] = useState(null);
  const [modalCliente, setModalCliente] = useState(null);
  const [cargos, setCargos] = useState([]);
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    const carregarReferencias = async () => {
      try {
        const [respCargos, respEstab, respUsers, respForn, respCat] = await Promise.all([
          api.get('/cargos').catch(() => api.get('/api/cargos')),
          api.get('/estabelecimentos').catch(() => api.get('/api/estabelecimentos')),
          api.get('/usuarios').catch(() => api.get('/api/usuarios')),
          api.get('/fornecedores').catch(() => api.get('/api/fornecedores')),
          api.get('/categorias').catch(() => api.get('/api/categorias')),
        ]);
        setCargos(respCargos.data?.content || respCargos.data?.dados || respCargos.data || []);
        setEstabelecimentos(respEstab.data?.content || respEstab.data?.dados || respEstab.data || []);
        setUsuarios(respUsers.data?.content || respUsers.data?.dados || respUsers.data || []);
        setFornecedores(respForn.data?.content || respForn.data?.dados || respForn.data || []);
        setCategorias(respCat.data?.content || respCat.data?.dados || respCat.data || []);
      } catch {}
    };
    carregarReferencias();
  }, []);

  const obterFornecedorNome = (item) => {
    if (!item) return '';
    return item?.fornecedor ?? item?.fornecedorNome ?? item?.fornecedor_nome ?? '';
  };

  const visible = rows.filter((row) => {
    const matchBusca = config.fields.map((field) => mostrarValor(row, field, referencias)).join(' ').toLowerCase().includes(query.toLowerCase());
    const fornecedorNome = obterFornecedorNome(row);
    const matchFornecedor = !fornecedorFiltro || fornecedorNome === fornecedorFiltro;
    return matchBusca && matchFornecedor;
  });

  const carregarRegistros = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const { registros, referencias: novasReferencias } = await carregarDadosDaTabela(config);
      setRows(registros);
      setReferencias(novasReferencias);
    } catch (err) {
      setRows([]);
      setErro(err.response?.data?.message || 'Não foi possível carregar os registros.');
    } finally {
      setCarregando(false);
    }
  }, [config]);

  useEffect(() => {
    carregarRegistros();
  }, [carregarRegistros]);

  const closeForm = () => {
    setModalAberto(false);
    setRegistroSelecionado(null);
    setModalFuncionario(null);
    setModalProduto(null);
    setModalCliente(null);
  };

  const handleFuncionarioSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  const handleDeletar = async (colaboradorId) => {
    if (!window.confirm('Tem certeza que deseja remover este funcionário?')) return;
    try {
      await api.delete(`/colaboradores/${colaboradorId}`).catch(() => api.delete(`/api/colaboradores/${colaboradorId}`));
      handleFuncionarioSuccess();
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao remover funcionário.');
    }
  };

  const handleFornecedoraSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  const handleEstabelecimentoSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  const handleCategoriaSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  const handleProdutoSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  const handleDeletarProduto = async (produtoId) => {
    if (!window.confirm('Tem certeza que deseja remover este produto?')) return;
    try {
      await api.delete(`/produtos/${produtoId}`).catch(() => api.delete(`/api/produtos/${produtoId}`));
      handleProdutoSuccess();
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao remover produto.');
    }
  };

  const handleDeletarCliente = async (clienteId) => {
    if (!window.confirm('Tem certeza que deseja remover este cliente?')) return;
    try {
      await api.delete(`/clientes/${clienteId}`).catch(() => api.delete(`/api/clientes/${clienteId}`));
      handleClienteSuccess();
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao remover cliente.');
    }
  };

  const handleClienteSuccess = () => {
    closeForm();
    carregarRegistros();
  };

  return (
    <section className="area-trabalho">
      <div className="introducao-pagina">
        <div>
          <p className="titulo-pequeno">Cadastros</p>
          <h1>{config.title}</h1>
          <p>Gerencie os registros da operação.</p>
        </div>
        <button className="primario" onClick={() => setModalAberto(true)}>
          + Novo {config.singular}
        </button>
      </div>

      <div className="superficie superficie-tabela">
        <div className="barra-ferramentas-tabela">
          <div>
            <strong>{rows.length} registros</strong>
            <small>{carregando ? 'Carregando registros...' : 'Dados do banco de dados'}</small>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar registro..."
          />
          {tipo === 'produto' && fornecedores.length > 0 && (
            <div className="filtro-select-wrapper">
              <select value={fornecedorFiltro} onChange={(e) => setFornecedorFiltro(e.target.value)}>
                <option value="">Todos os fornecedores</option>
                {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome || f.razaoSocial || f.titulo}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="envoltorio-tabela">
          <table>
            <thead>
              <tr>
                {config.fields.map((field) => <th key={field}>{labels[field] || field}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => (
                <tr key={row.id ?? row.codigo ?? index} onClick={() => {
                  setRegistroSelecionado(row);
                  setModalAberto(true);
                  if (tipo === 'funcionario') setModalFuncionario('detalhes');
                  if (tipo === 'produto') setModalProduto('detalhes');
                  if (tipo === 'cliente') setModalCliente('detalhes');
                }}>
                  {config.fields.map((field) => <td key={field}>{mostrarValor(row, field, referencias)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && !erro && visible.length === 0 && <p className="tabela-vazia">Nenhum registro encontrado.</p>}
          {erro && <p className="erro tabela-vazia">{erro}</p>}
        </div>
      </div>

      {modalAberto && (
        <div className="camada-modal">
          {registroSelecionado && tipo === 'funcionario' && modalFuncionario === 'detalhes' && (
            <ModalDetalhesFuncionario
              colaborador={registroSelecionado}
              config={config}
              labels={labels}
              mostrarValor={mostrarValor}
              referencias={referencias}
              onClose={closeForm}
              onEditar={() => setModalFuncionario('editar')}
              onFerias={() => setModalFuncionario('ferias')}
              onRemover={() => handleDeletar(registroSelecionado.id)}
              carregando={carregando}
            />
          )}
          {registroSelecionado && tipo === 'funcionario' && modalFuncionario === 'editar' && (
            <ModalEditarFuncionario
              colaborador={registroSelecionado}
              onClose={() => setModalFuncionario('detalhes')}
              onSuccess={handleFuncionarioSuccess}
              cargos={cargos}
              estabelecimentos={estabelecimentos}
              usuarios={usuarios}
            />
          )}
          {registroSelecionado && tipo === 'funcionario' && modalFuncionario === 'ferias' && (
            <ModalFeriasFuncionario
              colaborador={registroSelecionado}
              onClose={() => setModalFuncionario('detalhes')}
              onSuccess={handleFuncionarioSuccess}
            />
          )}
          {registroSelecionado && tipo === 'produto' && modalProduto === 'detalhes' && (
            <ModalDetalhesProduto
              produto={registroSelecionado}
              config={config}
              labels={labels}
              mostrarValor={mostrarValor}
              referencias={referencias}
              onClose={closeForm}
              onEditar={() => setModalProduto('editar')}
              onRemover={() => handleDeletarProduto(registroSelecionado.id)}
              carregando={carregando}
            />
          )}
          {registroSelecionado && tipo === 'produto' && modalProduto === 'editar' && (
            <ModalEditarProduto
              produto={registroSelecionado}
              onClose={() => setModalProduto('detalhes')}
              onSuccess={handleProdutoSuccess}
              fornecedores={fornecedores}
              categorias={categorias}
            />
          )}
          {registroSelecionado && tipo === 'cliente' && modalCliente === 'detalhes' && (
            <ModalDetalhesCliente
              cliente={registroSelecionado}
              config={config}
              labels={labels}
              mostrarValor={mostrarValor}
              referencias={referencias}
              onClose={closeForm}
              onEditar={() => setModalCliente('editar')}
              onRemover={() => handleDeletarCliente(registroSelecionado.id)}
              carregando={carregando}
            />
          )}
          {registroSelecionado && tipo === 'cliente' && modalCliente === 'editar' && (
            <ModalEditarCliente
              cliente={registroSelecionado}
              onClose={() => setModalCliente('detalhes')}
              onSuccess={handleClienteSuccess}
            />
          )}
          {registroSelecionado && tipo !== 'funcionario' && tipo !== 'produto' && tipo !== 'cliente' && (
            <div className="cartao-modal modal-detalhes">
              <button type="button" className="fechar" onClick={closeForm}><IconFechar /></button>
              <p className="titulo-pequeno">Detalhes do registro</p>
              <h2>{config.singular}</h2>
              <div className="detalhes-grid">
                {config.fields.map((field) => (
                  <div className="detalhe-item" key={field}>
                    <span>{labels[field] || field}</span>
                    <strong>{mostrarValor(registroSelecionado, field, referencias)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!registroSelecionado && tipo === 'funcionario' && (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}><IconFechar /></button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar funcionário</h2>
              <CadastroUsuario onSuccess={handleFuncionarioSuccess} />
            </div>
          )}
          {!registroSelecionado && tipo === 'fornecedora' && (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}><IconFechar /></button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar fornecedora</h2>
              <CadastroFornecedora onSuccess={handleFornecedoraSuccess} />
            </div>
          )}
          {!registroSelecionado && (tipo === 'loja' || tipo === 'estabelecimento') && (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}><IconFechar /></button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar estabelecimento</h2>
              <CadastroEstabelecimento onSuccess={handleEstabelecimentoSuccess} />
            </div>
          )}
          {!registroSelecionado && tipo === 'categoria' && (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}><IconFechar /></button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar categoria</h2>
              <CadastroCategoria onSuccess={handleCategoriaSuccess} />
            </div>
          )}
          {!registroSelecionado && tipo === 'produto' && (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}><IconFechar /></button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar produto</h2>
              <CadastroProduto onSuccess={handleProdutoSuccess} />
            </div>
          )}
          {!registroSelecionado && tipo === 'cliente' && (
            <div className="cartao-modal">
              <button type="button" className="fechar" onClick={closeForm}><IconFechar /></button>
              <p className="titulo-pequeno">Novo registro</p>
              <h2>Cadastrar cliente</h2>
              <CadastroCliente onSuccess={handleClienteSuccess} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}