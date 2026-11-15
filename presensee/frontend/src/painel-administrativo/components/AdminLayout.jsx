import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import AdminIcon from "./AdminIcons";
import "../styles/admin.css";

const menu = [
  { to: "/admin/dashboard", label: "Home", icon: "home" },
  { to: "/admin/escolas", label: "Escolas", icon: "school" },
  { to: "/admin/gestores", label: "Gestores", icon: "users" },
  { to: "/admin/chamados", label: "Chamados", icon: "message-circle" },
  { to: "/admin/comunicados", label: "Comunicados", icon: "bell" },
  { to: "/admin/saude-sistema", label: "Saúde do Sistema", icon: "activity" },
  { to: "/admin/auditoria", label: "Auditoria", icon: "file" }
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("adminSidebarCollapsed") === "true"
  );
  const [tema, setTema] = useState(localStorage.getItem("tema") || "light");
  const [perfil, setPerfil] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("usuario")) || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("tema", tema);
  }, [tema]);

  useEffect(() => {
    const update = () => {
      try {
        setPerfil(JSON.parse(localStorage.getItem("usuario")) || {});
      } catch {
        setPerfil({});
      }
    };
    window.addEventListener("admin-profile-updated", update);
    window.addEventListener("avatar-atualizado", update);
    return () => {
      window.removeEventListener("admin-profile-updated", update);
      window.removeEventListener("avatar-atualizado", update);
    };
  }, []);

  function alternarColapso() {
    const proximo = !collapsed;
    setCollapsed(proximo);
    localStorage.setItem("adminSidebarCollapsed", String(proximo));
  }

  function handleLogout() {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("avatarUsuario");
    navigate("/login", { replace: true });
  }

  return (
    <div className={`admin-layout ${tema}`}>
      <aside className={`admin-sidebar ${collapsed ? "compact collapsed" : ""}`}>
        <div className="admin-brand">
          {!collapsed && (
            <h2 className="brand-font" translate="no">
              Presen<span>See</span>
            </h2>
          )}
          <button
            type="button"
            onClick={alternarColapso}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: collapsed ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease"
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>

        <nav className="admin-navigation" aria-label="Navegação administrativa">
          {menu.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <AdminIcon name={icon} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          className="admin-bottom admin-theme-button"
          title="Alternar Tema"
          onClick={() => {
            const nextTema = tema === "light" ? "dark" : "light";
            setTema(nextTema);
          }}
        >
          <AdminIcon name={tema === "light" ? "moon" : "sun"} />
          {!collapsed && <span>{tema === "light" ? "Modo escuro" : "Modo claro"}</span>}
        </button>

        <NavLink
          to="/admin/perfil"
          className={({ isActive }) =>
            `admin-profile-link ${isActive ? "active" : ""}`
          }
          title="Meu perfil de administrador"
        >
          <span className="admin-profile-avatar">
            {perfil.avatar ? (
              <img src={perfil.avatar} alt="Avatar do administrador" />
            ) : (
              <AdminIcon name="user" size={20} />
            )}
          </span>
          {!collapsed && (
            <span className="admin-profile-text">
              <strong>{perfil.name || perfil.nome || "Superadmin"}</strong>
              <small>Administrador</small>
            </span>
          )}
        </NavLink>

        <button
          type="button"
          className="admin-bottom admin-logout"
          title="Encerrar Sessão"
          onClick={handleLogout}
        >
          <AdminIcon name="logout" />
          {!collapsed && <span>Encerrar Sessão</span>}
        </button>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}