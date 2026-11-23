import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserHistory } from "../services/gameService";
import { getCategories } from "../services/questionService";

export default function History() {
  const { user } = useAuth();

  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({
    category: "all",
    status: "all",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cargar categorías disponibles una sola vez para el selector de filtros
  useEffect(() => {
    getCategories()
      .then((data) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  // Cargar historial cada vez que cambian los filtros
  async function loadHistory() {
    setLoading(true);
    setError("");
    try {
      const data = await getUserHistory(user.username, filters);
      setGames(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [user.username, filters.category, filters.status]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function formatDate(game) {
    const idTimestamp = /^game-(\d+)$/.exec(game.id)?.[1];
    const dateValue = game.playedAt || game.createdAt || game.date || (idTimestamp ? Number(idTimestamp) : null);
    if (!dateValue) return "-";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return (
    <div className="stack">
      <section className="card">
        <p className="eyebrow">Registro de actividad</p>
        <h1>Historial de partidas</h1>
        <p className="muted">
          Consultá tus partidas anteriores y filtralas por categoría o estado.
        </p>

        {/* Controles de filtrado */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          <div className="field">
            <label htmlFor="filter-category">Categoría</label>
            <select
              id="filter-category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="all">Todas</option>
              <option value="Todas">Mixto (Todas las categorías)</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="filter-status">Estado</label>
            <select
              id="filter-status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="all">Todos los estados</option>
              <option value="completed">Completadas</option>
              <option value="abandoned">Abandonadas</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card">
        {loading ? (
          <p className="muted">Cargando historial...</p>
        ) : error ? (
          <div>
            <div className="notice error" role="alert">
              {error}
            </div>
            <button
              type="button"
              className="button"
              onClick={loadHistory}
              style={{ marginTop: "12px" }}
            >
              Reintentar
            </button>
          </div>
        ) : games.length === 0 ? (
          <div>
            <p className="muted">
              No se encontraron partidas con los filtros seleccionados.
            </p>
            <Link to="/" className="button" style={{ marginTop: "12px", display: "inline-block" }}>
              Jugar una partida
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 8px" }}>Fecha</th>
                  <th style={{ padding: "12px 8px" }}>Categoría</th>
                  <th style={{ padding: "12px 8px" }}>Estado</th>
                  <th style={{ padding: "12px 8px" }}>Puntaje</th>
                  <th style={{ padding: "12px 8px" }}>Aciertos</th>
                  <th style={{ padding: "12px 8px" }}>Mejor racha</th>
                  <th style={{ padding: "12px 8px" }}>Duración</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => {
                  const isCompleted = game.status === "completed";
                  return (
                    <tr key={game.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "12px 8px" }}>
                        {formatDate(game)}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <strong>{game.category}</strong>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            backgroundColor: isCompleted ? "#dcfce7" : "#fef3c7",
                            color: isCompleted ? "#166534" : "#92400e",
                          }}
                        >
                          {isCompleted ? "Completada" : "Abandonada"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <strong>{game.score} pts</strong>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        {game.correctAnswers} / {game.totalQuestions}
                      </td>
                      <td style={{ padding: "12px 8px" }}>{game.bestStreak ?? 0}</td>
                      <td style={{ padding: "12px 8px" }}>{game.durationSeconds ?? 0}s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
