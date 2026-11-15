import { useState, useEffect } from "react";
import AdminIcon from "../components/AdminIcons";
import api from "../../services/api";
import "../styles/admin.css";

function mascaraTelefone(valor) {
  const d = String(valor || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function AdminPerfil() {
  const [perfil, setPerfil] = useState({
    id: "",
    nome: "Carregando...",
    email: "",
    telefone: "",
    cargo: "Superadministrador",
    avatar: ""
  });
  const [arquivoAvatar, setArquivoAvatar] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState("");
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const usuarioLogado = JSON.parse(localStorage.getItem("usuario") || "{}");

    setPerfil({
      id: usuarioLogado.id || "",
      nome: usuarioLogado.name || "Superadmin",
      email: usuarioLogado.email || "admin@presensee.com",
      telefone: usuarioLogado.telefone || "",
      cargo:
        usuarioLogado.role === "SUPERADMIN" || usuarioLogado.role === "ADMIN"
          ? "Superadministrador"
          : usuarioLogado.role || "Gestor",
      avatar: usuarioLogado.avatar || ""
    });

    // Sincroniza com os dados reais do banco ao abrir a tela
    async function sincronizarPerfilBanco() {
      try {
        const res = await api.get("/users");
        const lista = Array.isArray(res.data) ? res.data : [];
        const atualNoBanco = lista.find(
          (u) =>
            (usuarioLogado.id && String(u.id) === String(usuarioLogado.id)) ||
            (usuarioLogado.email && u.email === usuarioLogado.email)
        );

        if (atualNoBanco) {
          setPerfil({
            id: atualNoBanco.id,
            nome: atualNoBanco.name || usuarioLogado.name || "Superadmin",
            email: atualNoBanco.email || usuarioLogado.email || "",
            telefone: atualNoBanco.telefone || "",
            cargo:
              atualNoBanco.role === "SUPERADMIN" || atualNoBanco.role === "ADMIN"
                ? "Superadministrador"
                : atualNoBanco.role || "Gestor",
            avatar: atualNoBanco.avatar || ""
          });

          const sessaoSincronizada = {
            ...usuarioLogado,
            id: atualNoBanco.id,
            name: atualNoBanco.name,
            email: atualNoBanco.email,
            telefone: atualNoBanco.telefone || "",
            avatar: atualNoBanco.avatar || ""
          };
          localStorage.setItem("usuario", JSON.stringify(sessaoSincronizada));
          window.dispatchEvent(new Event("admin-profile-updated"));
          window.dispatchEvent(new Event("avatar-atualizado"));
        }
      } catch (err) {
        console.warn("Não foi possível revalidar o perfil no servidor:", err);
      }
    }

    sincronizarPerfilBanco();
  }, []);

  function change(field, value) {
    setPerfil((p) => ({ ...p, [field]: value }));
    setSaved(false);
    setErro("");
  }

  function selectAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErro("Selecione um arquivo de imagem válido (JPG, PNG ou WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro("A foto de perfil deve ter no máximo 5 MB.");
      e.target.value = "";
      return;
    }

    setErro("");
    setSaved(false);
    setArquivoAvatar(file);
    setPreviewAvatar(URL.createObjectURL(file));
  }

  async function save(e) {
    e.preventDefault();
    setEnviando(true);
    setSaved(false);
    setErro("");

    try {
      if (!perfil.id) {
        throw new Error("ID do administrador não encontrado na sessão. Faça login novamente.");
      }

      let avatarFinalUrl = perfil.avatar;

      // 1. Se o usuário escolheu uma nova foto, envia o arquivo real para o Cloudinary
      if (arquivoAvatar) {
        const formData = new FormData();
        formData.append("photo", arquivoAvatar);

        const resAvatar = await api.patch(`/users/${perfil.id}/avatar`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        avatarFinalUrl = resAvatar.data?.user?.avatar || avatarFinalUrl;
      }

      // 2. Atualiza nome, e-mail e telefone no banco (PostgreSQL/Neon)
      const resUpdate = await api.patch(`/users/${perfil.id}`, {
        name: perfil.nome.trim(),
        email: perfil.email.trim(),
        telefone: perfil.telefone.trim()
      });

      const userAtualizadoBanco = resUpdate.data || {};
      const avatarDefinitivo = userAtualizadoBanco.avatar || avatarFinalUrl;

      setPerfil((prev) => ({
        ...prev,
        nome: userAtualizadoBanco.name || prev.nome,
        email: userAtualizadoBanco.email || prev.email,
        telefone: userAtualizadoBanco.telefone ?? prev.telefone,
        avatar: avatarDefinitivo
      }));
      setArquivoAvatar(null);
      setPreviewAvatar("");

      // 3. Atualiza a sessão local e notifica Sidebar/Cabeçalho
      const usuarioLogado = JSON.parse(localStorage.getItem("usuario") || "{}");
      const usuarioAtualizado = {
        ...usuarioLogado,
        id: perfil.id,
        name: userAtualizadoBanco.name || perfil.nome.trim(),
        email: userAtualizadoBanco.email || perfil.email.trim(),
        telefone: userAtualizadoBanco.telefone ?? perfil.telefone.trim(),
        avatar: avatarDefinitivo
      };

      localStorage.setItem("usuario", JSON.stringify(usuarioAtualizado));
      window.dispatchEvent(new Event("admin-profile-updated"));
      window.dispatchEvent(new Event("avatar-atualizado"));
      setSaved(true);
    } catch (error) {
      console.error("Erro ao atualizar perfil administrativo:", error);
      const msgApi = error.response?.data?.error || error.message;
      setErro(msgApi || "Falha ao salvar alterações no servidor. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const fotoExibida = previewAvatar || perfil.avatar;

  return (
    <div className="admin-page admin-profile-page">
      <div className="admin-heading">
        <div>
          <h1>Meu Perfil</h1>
          <p>Consulte e personalize as informações exibidas no painel administrativo.</p>
        </div>
      </div>

      <section className="admin-panel admin-profile-panel">
        <div className="admin-profile-header">
          <span className="admin-profile-photo">
            {fotoExibida ? <img src={fotoExibida} alt="Foto de perfil" /> : <AdminIcon name="user" size={50} />}
          </span>
          <div>
            <h2>{perfil.nome}</h2>
            <p>{perfil.cargo} PresenSee</p>
            <label className="admin-avatar-upload">
              <AdminIcon name="camera" size={16} /> Alterar foto
              <input type="file" accept="image/*" onChange={selectAvatar} disabled={enviando} hidden />
            </label>
          </div>
        </div>

        <form onSubmit={save} className="admin-form">
          <h3>Informações do administrador</h3>
          <div className="admin-form-grid">
            <label>
              Nome completo
              <input
                value={perfil.nome}
                onChange={(e) => change("nome", e.target.value)}
                disabled={enviando}
                required
              />
            </label>
            <label>
              E-mail de contato
              <input
                type="email"
                value={perfil.email}
                onChange={(e) => change("email", e.target.value)}
                disabled={enviando}
                required
              />
            </label>
            <label>
              Telefone
              <input
                type="tel"
                value={perfil.telefone}
                onChange={(e) => change("telefone", mascaraTelefone(e.target.value))}
                disabled={enviando}
                placeholder="(81) 99999-9999"
              />
            </label>
            <label>
              Função
              <input value={perfil.cargo} readOnly disabled />
            </label>
          </div>

          {erro && (
            <p role="alert" style={{ color: "#b91c1c", background: "#fee2e2", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", marginTop: "8px" }}>
              {erro}
            </p>
          )}

          <p className="admin-hint">As alterações feitas aqui são gravadas definitivamente no banco de dados e na nuvem.</p>
          <div className="admin-actions">
            {saved && <span className="admin-save-success" role="status">Perfil atualizado com sucesso!</span>}
            <button className="admin-btn" type="submit" disabled={enviando}>
              {enviando ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}