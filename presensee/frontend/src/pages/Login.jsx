import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../styles/Login.css";

const REQUISITOS_SENHA = [
  { id: "tamanho", rotulo: "Pelo menos 8 caracteres", testar: (s) => s.length >= 8 },
  { id: "maiuscula", rotulo: "Uma letra maiúscula (A–Z)", testar: (s) => /[A-Z]/.test(s) },
  { id: "minuscula", rotulo: "Uma letra minúscula (a–z)", testar: (s) => /[a-z]/.test(s) },
  { id: "numero", rotulo: "Pelo menos um número (0–9)", testar: (s) => /\d/.test(s) },
  {
    id: "especial",
    rotulo: "Um caractere especial (!@#$%...)",
    testar: (s) => /[^A-Za-z0-9]/.test(s),
  },
];

function avaliarForcaSenha(senha) {
  if (!senha) {
    return { pontos: 0, rotulo: "", cor: "#e2e8f0", requisitos: [] };
  }

  const requisitos = REQUISITOS_SENHA.map((req) => ({
    ...req,
    atendido: req.testar(senha),
  }));

  const atendidos = requisitos.filter((r) => r.atendido).length;

  let nivel = { pontos: 1, rotulo: "Fraca", cor: "#ef4444" };
  if (atendidos >= 5) {
    nivel = { pontos: 4, rotulo: "Excelente", cor: "#10b981" };
  } else if (atendidos === 4) {
    nivel = { pontos: 3, rotulo: "Forte", cor: "#22c55e" };
  } else if (atendidos >= 2) {
    nivel = { pontos: 2, rotulo: "Média", cor: "#f59e0b" };
  }

  return { ...nivel, atendidos, requisitos };
}

function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  // Estados do Login Normal
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Estados da Troca de Senha (Primeiro Acesso)
  const [precisaTrocarSenha, setPrecisaTrocarSenha] = useState(false);
  const [userIdTroca, setUserIdTroca] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mensagemTroca, setMensagemTroca] = useState({ texto: "", tipo: "" });

  // Contador usado para reiniciar a animação de tremida
  const [tremerKey, setTremerKey] = useState(0);
  // Controla a tremida dos campos (inputs) por um instante
  const [tremendo, setTremendo] = useState(false);
  // Marca que a pessoa já tentou enviar (deixa os requisitos pendentes em vermelho)
  const [tentouEnviar, setTentouEnviar] = useState(false);

  const analiseSenha = useMemo(() => avaliarForcaSenha(novaSenha), [novaSenha]);
  const senhaForteValida = analiseSenha.atendidos >= 4;

  function dispararTremida() {
    setTremerKey((k) => k + 1);
    setTremendo(true);
    setTimeout(() => setTremendo(false), 500);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErro("");

    if (!email.trim() || !senha) {
      setErro("Preencha todos os campos");
      return;
    }

    setEnviando(true);
    try {
      const response = await api.post("/login", { email, password: senha });

      const { token } = response.data;
      const usuario = response.data.usuario ?? response.data.user;
      const perfil = String(usuario?.perfil ?? usuario?.role ?? "").toLowerCase();

      const admin = ["superadmin", "super_admin", "administrador", "admin"].includes(perfil);
      const escola = ["gestor", "gestor_escolar", "monitor", "manager"].includes(perfil);

      if (!token || !usuario || (!admin && !escola)) {
        setErro("O servidor não retornou um perfil válido. Verifique a API de autenticação.");
        return;
      }

      localStorage.removeItem("avatarUsuario");
      localStorage.setItem("token", token);
      localStorage.setItem("usuario", JSON.stringify(usuario));

      window.location.href = admin ? "/admin/dashboard" : "/dashboard";
    } catch (error) {
      console.error("Falha de autenticação", error);

      // INTERCEPTAÇÃO DO PRIMEIRO ACESSO (ERRO 403)
      if (error.response?.status === 403 && error.response?.data?.requirePasswordChange) {
        setUserIdTroca(error.response.data.userId);
        setPrecisaTrocarSenha(true);
        setMostrarNovaSenha(false);
        setErro("");
      } else {
        setErro(error.response?.data?.error || "Email ou senha inválidos.");
      }
    } finally {
      setEnviando(false);
    }
  }

  async function handleTrocarSenha(e) {
    e.preventDefault();
    setMensagemTroca({ texto: "", tipo: "" });
    setTentouEnviar(true);

    if (!novaSenha || !confirmarSenha) {
      setMensagemTroca({ texto: "Preencha todos os campos.", tipo: "erro" });
      dispararTremida();
      return;
    }

    if (!senhaForteValida) {
      setMensagemTroca({ texto: "A senha não é forte suficiente.", tipo: "erro" });
      dispararTremida();
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMensagemTroca({ texto: "As senhas não coincidem.", tipo: "erro" });
      dispararTremida();
      return;
    }

    setEnviando(true);
    try {
      await api.post("/change-initial-password", {
        userId: userIdTroca,
        newPassword: novaSenha,
      });

      setMensagemTroca({
        texto: "Senha alterada com sucesso! Faça login para continuar.",
        tipo: "sucesso",
      });

      setTimeout(() => {
        setPrecisaTrocarSenha(false);
        setSenha("");
        setNovaSenha("");
        setConfirmarSenha("");
        setMostrarNovaSenha(false);
        setTentouEnviar(false);
        setMensagemTroca({ texto: "", tipo: "" });
      }, 3000);
    } catch (error) {
      console.error("Erro ao trocar senha", error);
      setMensagemTroca({
        texto: error.response?.data?.error || "Erro ao alterar a senha. Tente novamente.",
        tipo: "erro",
      });
      dispararTremida();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-blob-bg blob-a" />
      <div className="login-blob-bg blob-b" />
      <div className="login-shape shape-fill-1" />
      <div className="login-shape shape-fill-2" />
      <div className="login-shape shape-ring" />
      <div className="login-shape shape-outline" />
      <div className="login-topbar">
        <span className="login-ring-deco" />
        <h2 className="brand-font login-logo" translate="no">
          Presen<span>See</span>
        </h2>
      </div>
      <div className="login-panels">
        <div className="scan-panel">
          <div className="scan-frame">
            <span className="scan-corner corner-tl" />
            <span className="scan-corner corner-tr" />
            <span className="scan-corner corner-bl" />
            <span className="scan-corner corner-br" />
            <div className="scan-face">
              <span className="scan-eye" />
              <span className="scan-eye" />
              <span className="scan-smile" />
            </div>
            <div className="scan-line" />
          </div>
          <h3>Cada presença importa, cada futuro também.</h3>
          <p>validando presença em tempo real</p>
          <div className="scan-badge">
            <span className="scan-dot" />
            <b> presente.</b>
          </div>
        </div>

        <div className="login-card">
          {!precisaTrocarSenha ? (
            <>
              <h1 className="brand-font">
                Conecte-<span>se</span>
              </h1>
              <p className="login-subtitle">Acesse o painel de presença da sua turma.</p>
              <form onSubmit={handleLogin}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  className="login-input"
                  type="email"
                  placeholder="email@escola.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={enviando}
                />

                <label htmlFor="senha">Senha</label>
                <input
                  id="senha"
                  className="login-input"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="Senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={enviando}
                />

                <p className="show-password" onClick={() => setMostrarSenha(!mostrarSenha)}>
                  {mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                </p>

                {erro && (
                  <p className="error-message" role="alert">
                    {erro}
                  </p>
                )}

                <button className="login-button" type="submit" disabled={enviando}>
                  {enviando ? "Processando..." : "Entrar"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="brand-font" style={{ fontSize: "1.8rem", color: "#e53935" }}>
                Atenção
              </h1>
              <p className="login-subtitle" style={{ color: "#333", fontWeight: "500" }}>
                Este é o seu primeiro acesso. Por segurança, cadastre uma senha forte antes de continuar.
              </p>

              <form onSubmit={handleTrocarSenha} style={{ marginTop: "0.75rem" }}>
                <label htmlFor="nova-senha">Nova Senha</label>
                <input
                  id="nova-senha"
                  className={`login-input ${tremendo && !senhaForteValida ? "campo-tremer" : ""}`}
                  type={mostrarNovaSenha ? "text" : "password"}
                  placeholder="Crie uma senha forte"
                  value={novaSenha}
                  onChange={(e) => {
                    setNovaSenha(e.target.value);
                    setTremerKey((k) => k + 1);
                    setMensagemTroca({ texto: "", tipo: "" });
                  }}
                  disabled={enviando}
                />

                {/* MEDIDOR E MARCADORES DE SENHA FORTE */}
                <div
                  aria-live="polite"
                  style={{
                    marginTop: "8px",
                    marginBottom: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "6px",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ color: "#475569", fontWeight: 600 }}>Força da senha:</span>
                    <strong style={{ color: novaSenha ? analiseSenha.cor : "#94a3b8" }}>
                      {novaSenha ? analiseSenha.rotulo : "Aguardando"}
                    </strong>
                  </div>

                  {/* Barra segmentada em 4 níveis */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "5px",
                      marginBottom: "8px",
                    }}
                  >
                    {[1, 2, 3, 4].map((nivel) => (
                      <span
                        key={nivel}
                        style={{
                          height: "5px",
                          borderRadius: "999px",
                          backgroundColor:
                            analiseSenha.pontos >= nivel ? analiseSenha.cor : "#e2e8f0",
                          transition: "background-color 0.2s ease",
                        }}
                      />
                    ))}
                  </div>

                  {/* Checklist de requisitos */}
                  <ul className="senha-requisitos">
                    {REQUISITOS_SENHA.map((req) => {
                      const ok = req.testar(novaSenha);
                      const digitou = novaSenha.length > 0 || tentouEnviar;
                      const estado = ok ? "ok" : digitou ? "erro" : "neutro";

                      return (
                        <li
                          // A key muda só nos itens não cumpridos, reiniciando a tremida
                          key={ok ? `${req.id}-ok` : `${req.id}-${tremerKey}`}
                          className={`senha-req ${estado}`}
                        >
                          <span className="senha-req-icone" aria-hidden="true">
                            {estado === "ok" ? "✓" : estado === "erro" ? "×" : "•"}
                          </span>
                          <span>{req.rotulo}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <label htmlFor="confirmar-senha" style={{ marginTop: "6px" }}>
                  Confirmar Nova Senha
                </label>
                <input
                  id="confirmar-senha"
                  className={`login-input ${
                    tremendo && novaSenha !== confirmarSenha ? "campo-tremer" : ""
                  }`}
                  type={mostrarNovaSenha ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  value={confirmarSenha}
                  onChange={(e) => {
                    setConfirmarSenha(e.target.value);
                    setMensagemTroca({ texto: "", tipo: "" });
                  }}
                  disabled={enviando}
                />

                {/* Alerta de "não coincidem" */}
                {confirmarSenha && novaSenha !== confirmarSenha && (
                  <p
                    key={`nao-coincide-${tremerKey}`}
                    className="aviso-tremer"
                    style={{
                      margin: "5px 0 0 0",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#dc2626",
                    }}
                  >
                    × As senhas não coincidem
                  </p>
                )}

                <p
                  className="show-password"
                  onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                >
                  {mostrarNovaSenha ? "Ocultar senhas" : "Mostrar senhas"}
                </p>

                {mensagemTroca.texto && (
                  <p
                    key={`msg-${tremerKey}`}
                    className={`error-message ${
                      mensagemTroca.tipo === "erro" ? "aviso-tremer" : ""
                    }`}
                    role="alert"
                    style={{
                      color: mensagemTroca.tipo === "sucesso" ? "#11ba7a" : "#f23b4b",
                      backgroundColor:
                        mensagemTroca.tipo === "sucesso" ? "#e6f8f1" : "#ffebee",
                      padding: "8px",
                      borderRadius: "6px",
                    }}
                  >
                    {mensagemTroca.texto}
                  </p>
                )}

                <button className="login-button" type="submit" disabled={enviando}>
                  {enviando ? "Processando..." : "Salvar e Continuar"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;