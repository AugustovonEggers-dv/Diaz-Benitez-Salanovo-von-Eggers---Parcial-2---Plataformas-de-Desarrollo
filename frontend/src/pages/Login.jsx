import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../services/authService";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      return setError("Completá tu nombre de usuario y contraseña.");
    }

    setLoading(true);
    try {
      const data = await loginUser({
        username: username.trim(),
        password,
      });

      // Soporta tanto { user: { username, role } } como { username, role } directo
      const loggedUser = data?.user || data;

      if (!loggedUser?.username) {
        throw new Error("El servidor no devolvió los datos del usuario.");
      }

      login(loggedUser);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card narrow">
      <p className="eyebrow">Bienvenido</p>
      <h1>Iniciá sesión</h1>
      <p className="muted">Ingresá con tu nombre de usuario y contraseña.</p>

      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="login-username">Nombre de usuario</label>
          <input
            id="login-username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}

        <button className="button" type="submit" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="muted">
        ¿Todavía no tenés cuenta?{" "}
        <Link className="inline-link" to="/registro">
          Registrate
        </Link>
      </p>
    </section>
  );
}