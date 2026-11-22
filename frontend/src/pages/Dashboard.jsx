import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCategories } from "../services/questionService";
import { getUserStats } from "../services/gameService";

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Configuración de la partida
  const [category, setCategory] = useState("all");
  const [count, setCount] = useState(5);

  // Datos traídos del servidor
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboardData() {
    setLoading(true);
    setError("");
    try {
      // Ejecutamos ambas peticiones en paralelo
      const [categoriesData, statsData] = await Promise.all([
        getCategories(),
        getUserStats(user.username),
      ]);
      setCategories(categoriesData);
      setStats(statsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [user.username]);

  function handleStartGame(e) {
    e.preventDefault();
    // Pasamos la categoría y cantidad elegidas a la pantalla de juego
    navigate("/jugar", {
      state: {
        category,
        count: Number(count),
      },
    });
  }

  if (loading) {
    return (
      <section className="card">
        <p className="muted">Cargando panel principal...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card">
        <div className="notice error" role="alert">
          {error}
        </div>
        <button className="button" onClick={loadDashboardData} style={{ marginTop: "12px" }}>
          Reintentar
        </button>
      </section>
    );
  }

  return (
    <div className="stack">
      {/* Cabecera y resumen del jugador */}
      <section className="card">
        <p className="eyebrow">Panel principal</p>
        <h1>Hola, {user.username}</h1>
        <p className="muted">
          Configurá una nueva partida o revisá tu progreso general.
        </p>

        <div className="stats-grid" style={{ marginTop: "20px" }}>
          <div className="stat-box">
            <span className="stat-label">Partidas jugadas</span>
            <strong className="stat-value">{stats?.totalGames ?? 0}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Puntaje acumulado</span>
            <strong className="stat-value">{stats?.totalScore ?? 0} pts</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Precisión global</span>
            <strong className="stat-value">{stats?.accuracy ?? 0}%</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Mejor racha</span>
            <strong className="stat-value">{stats?.bestStreak ?? 0}</strong>
          </div>
        </div>
      </section>

      {/* Selector de nueva partida */}
      <section className="card">
        <h2>Nueva partida</h2>
        <form className="form-stack" onSubmit={handleStartGame}>
          <div className="field">
            <label htmlFor="game-category">Categoría</label>
            <select
              id="game-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="all">Todas las categorías (Mezclado)</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="game-count">Cantidad de preguntas</label>
            <select
              id="game-count"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            >
              <option value={5}>5 preguntas</option>
              <option value={10}>10 preguntas</option>
              <option value={15}>15 preguntas</option>
            </select>
          </div>

          <button className="button" type="submit">
            Comenzar partida
          </button>
        </form>
      </section>

      {/* Accesos rápidos */}
      <section className="card">
        <h2>Secciones</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "12px" }}>
          <Link to="/historial" className="button secondary">
            Ver historial
          </Link>
          <Link to="/estadisticas" className="button secondary">
            Estadísticas por categoría
          </Link>
          <Link to="/ranking" className="button secondary">
            Ranking global
          </Link>
          {isAdmin && (
            <Link to="/admin/preguntas" className="button">
              Administrar banco de preguntas
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}