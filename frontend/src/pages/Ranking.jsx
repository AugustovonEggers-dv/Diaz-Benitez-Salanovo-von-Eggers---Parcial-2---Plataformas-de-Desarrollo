import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getRanking } from "../services/gameService";

export default function Ranking() {
  const { user } = useAuth();

  const [players, setPlayers] = useState([]);
  const [sortBy, setSortBy] = useState("totalScore"); // totalScore | accuracy | bestStreak | gamesPlayed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRanking() {
    setLoading(true);
    setError("");
    try {
      const data = await getRanking();
      setPlayers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRanking();
  }, []);

  // Ordenar dinámicamente según el criterio elegido
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  }, [players, sortBy]);

  return (
    <div className="stack">
      <section className="card">
        <p className="eyebrow">Tabla de posiciones</p>
        <h1>Ranking global</h1>
        <p className="muted">
          Compará tu desempeño con el resto de los jugadores registrados.
        </p>

        <div className="field" style={{ maxWidth: "280px", marginTop: "20px" }}>
          <label htmlFor="ranking-sort">Ordenar por</label>
          <select
            id="ranking-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="totalScore">Puntaje total</option>
            <option value="accuracy">Precisión (%)</option>
            <option value="bestStreak">Mejor racha</option>
            <option value="gamesPlayed">Partidas jugadas</option>
          </select>
        </div>
      </section>

      <section className="card">
        {loading ? (
          <p className="muted">Cargando ranking...</p>
        ) : error ? (
          <div>
            <div className="notice error" role="alert">
              {error}
            </div>
            <button type="button" className="button" onClick={loadRanking} style={{ marginTop: "12px" }}>
              Reintentar
            </button>
          </div>
        ) : sortedPlayers.length === 0 ? (
          <p className="muted">
            Todavía no hay jugadores en el ranking. ¡Completá una partida para inaugurar la tabla!
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 8px" }}>Posición</th>
                  <th style={{ padding: "12px 8px" }}>Jugador</th>
                  <th style={{ padding: "12px 8px" }}>Puntaje total</th>
                  <th style={{ padding: "12px 8px" }}>Partidas</th>
                  <th style={{ padding: "12px 8px" }}>Precisión</th>
                  <th style={{ padding: "12px 8px" }}>Mejor racha</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, index) => {
                  const isCurrentUser =
                    player.username.toLowerCase() === user.username.toLowerCase();

                  return (
                    <tr
                      key={player.username}
                      style={{
                        borderBottom: "1px solid #e2e8f0",
                        backgroundColor: isCurrentUser ? "#eff6ff" : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 8px" }}>
                        <strong>#{index + 1}</strong>
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <strong>{player.username}</strong> {isCurrentUser && "(Vos)"}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <strong>{player.totalScore ?? 0} pts</strong>
                      </td>
                      <td style={{ padding: "12px 8px" }}>{player.gamesPlayed ?? 0}</td>
                      <td style={{ padding: "12px 8px" }}>{player.accuracy ?? 0}%</td>
                      <td style={{ padding: "12px 8px" }}>{player.bestStreak ?? 0}</td>
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