import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserStats } from "../services/gameService";

export default function CategoryStats() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      const data = await getUserStats(user.username);
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, [user.username]);

  if (loading) {
    return (
      <section className="card">
        <p className="muted">Calculando estadísticas...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card">
        <div className="notice error" role="alert">
          {error}
        </div>
        <button type="button" className="button" onClick={loadStats} style={{ marginTop: "12px" }}>
          Reintentar
        </button>
      </section>
    );
  }

  // Normalizamos byCategory por si viene como array o como objeto diccionario
  const categoryList = Array.isArray(stats?.byCategory)
    ? stats.byCategory
    : stats?.byCategory
    ? Object.entries(stats.byCategory).map(([category, values]) => ({
        category,
        ...values,
      }))
    : [];

  return (
    <div className="stack">
      <section className="card">
        <p className="eyebrow">Rendimiento</p>
        <h1>Tus estadísticas</h1>
        <p className="muted">
          Resumen acumulado de todas tus partidas registradas.
        </p>

        <div className="stats-grid" style={{ marginTop: "20px" }}>
          <div className="stat-box">
            <span className="stat-label">Partidas totales</span>
            <strong className="stat-value">{stats?.totalGames ?? 0}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Completadas</span>
            <strong className="stat-value">{stats?.completedGames ?? 0}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Puntaje total</span>
            <strong className="stat-value">{stats?.totalScore ?? 0} pts</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Precisión</span>
            <strong className="stat-value">{stats?.accuracy ?? 0}%</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Mejor racha</span>
            <strong className="stat-value">{stats?.bestStreak ?? 0}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Desglose por categoría</h2>

        {categoryList.length === 0 ? (
          <div style={{ marginTop: "12px" }}>
            <p className="muted">
              Todavía no tenés partidas registradas para mostrar estadísticas por categoría.
            </p>
            <Link to="/" className="button" style={{ marginTop: "12px", display: "inline-block" }}>
              Comenzar a jugar
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 8px" }}>Categoría</th>
                  <th style={{ padding: "12px 8px" }}>Partidas</th>
                  <th style={{ padding: "12px 8px" }}>Puntaje</th>
                  <th style={{ padding: "12px 8px" }}>Aciertos</th>
                  <th style={{ padding: "12px 8px" }}>Precisión</th>
                </tr>
              </thead>
              <tbody>
                {categoryList.map((item) => (
                  <tr key={item.category} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px 8px" }}>
                      <strong>{item.category}</strong>
                    </td>
                    <td style={{ padding: "12px 8px" }}>{item.gamesPlayed ?? item.games ?? 0}</td>
                    <td style={{ padding: "12px 8px" }}>{item.totalScore ?? item.score ?? 0} pts</td>
                    <td style={{ padding: "12px 8px" }}>
                      {item.correctAnswers ?? 0} / {item.totalQuestions ?? 0}
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <strong>{item.accuracy ?? 0}%</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}