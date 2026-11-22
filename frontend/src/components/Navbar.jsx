import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const loggedIn = Boolean(isAuthenticated || user);
  const admin = Boolean(isAdmin || user?.role === "admin");

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          Desafío Mental
        </Link>

        {loggedIn && (
          <nav className="header-nav" aria-label="Navegación principal">
            <Link to="/" className="inline-link">Inicio</Link>
            <Link to="/historial" className="inline-link">Historial</Link>
            <Link to="/estadisticas" className="inline-link">Estadísticas</Link>
            <Link to="/ranking" className="inline-link">Ranking</Link>

            {admin && (
              <Link to="/admin/preguntas" className="inline-link">
                <strong>Gestionar preguntas</strong>
              </Link>
            )}
          </nav>
        )}

        <div className="header-user">
          {loggedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span>
                Sesión: <strong>{user.username}</strong>
                {admin && " (Admin)"}
              </span>
              <button
                type="button"
                className="button secondary"
                onClick={handleLogout}
              >
                Salir
              </button>
            </div>
          ) : (
            <span className="muted">Invitado</span>
          )}
        </div>
      </div>
    </header>
  );
}