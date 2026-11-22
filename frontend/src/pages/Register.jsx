import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { registerUser } from "../services/authService";

export default function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Validaciones rápidas en el cliente
    if (formData.username.trim().length < 4 || formData.username.trim().length > 16) {
      return setError("El nombre de usuario debe tener entre 4 y 16 caracteres.");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return setError("Ingresá un correo electrónico válido (ej: usuario@dominio.com).");
    }
    if (formData.password.length < 8) {
      return setError("La contraseña debe tener al menos 8 caracteres.");
    }
    if (formData.password !== formData.confirmPassword) {
      return setError("Las contraseñas no coinciden.");
    }

    setLoading(true);
    try {
      const data = await registerUser(formData);
      // El backend devuelve el usuario con role: "user"
      login(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card narrow">
      <p className="eyebrow">Nueva cuenta</p>
      <h1>Registrate</h1>
      <p className="muted">Creá tu perfil de jugador para guardar tus partidas y competir en el ranking.</p>

      <form className="form-stack" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="reg-username">Nombre de usuario (4 a 16 caracteres)</label>
          <input
            id="reg-username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            autoComplete="username"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="reg-email">Correo electrónico</label>
          <input
            id="reg-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="reg-password">Contraseña (mínimo 8 caracteres)</label>
          <input
            id="reg-password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="reg-confirm">Confirmar contraseña</label>
          <input
            id="reg-confirm"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
        </div>

        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}

        <button className="button" type="submit" disabled={loading}>
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="muted">
        ¿Ya tenés cuenta?{" "}
        <Link className="inline-link" to="/login">
          Iniciá sesión
        </Link>
      </p>
    </section>
  );
}