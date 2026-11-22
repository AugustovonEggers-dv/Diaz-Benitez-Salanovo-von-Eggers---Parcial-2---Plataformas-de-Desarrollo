import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();

  const result = location.state?.result;
  const originalConfig = location.state?.originalConfig;

  // Si se accede sin datos de partida reciente, redirige al menú principal
  if (!result) {
    return <Navigate to="/" replace />;
  }

  const isAbandoned = result.status === "abandoned";
  const accuracy =
    result.totalQuestions > 0
      ? Math.round((result.correctAnswers / result.totalQuestions) * 100)
      : 0;

  function handlePlayAgain() {
    navigate("/jugar", {
      state: originalConfig || { category: "all", count: 5 },
    });
  }

  return (
    <div className="stack">
      <section className="card">
        <p className="eyebrow">
          {isAbandoned ? "Partida abandonada" : "Partida finalizada"}
        </p>
        <h1>{isAbandoned ? "Abandonaste la partida" : "¡Buen trabajo!"}</h1>
        <p className="muted">
          Categoría: <strong>{result.category}</strong> · Duración:{" "}
          <strong>{result.durationSeconds}s</strong>
        </p>

        <div className="stats-grid" style={{ marginTop: "20px" }}>
          <div className="stat-box">
            <span className="stat-label">Puntaje obtenido</span>
            <strong className="stat-value">{result.score} pts</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Respuestas correctas</span>
            <strong className="stat-value">
              {result.correctAnswers} / {result.totalQuestions}
            </strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Precisión</span>
            <strong className="stat-value">{accuracy}%</strong>
          </div>
          <div className="stat-box">
            <span className="stat-label">Mejor racha</span>
            <strong className="stat-value">{result.bestStreak}</strong>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "24px" }}>
          <button type="button" className="button" onClick={handlePlayAgain}>
            Jugar de nuevo
          </button>
          <Link to="/" className="button secondary">
            Menú principal
          </Link>
          <Link to="/historial" className="button secondary">
            Ver historial
          </Link>
          <Link to="/ranking" className="button secondary">
            Ver ranking
          </Link>
        </div>
      </section>

      {/* Desglose de preguntas respondidas */}
      {result.answers && result.answers.length > 0 && (
        <section className="card">
          <h2>Detalle de respuestas</h2>
          <div className="form-stack" style={{ marginTop: "12px" }}>
            {result.answers.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: `1px solid ${item.isCorrect ? "#86efac" : "#fca5a5"}`,
                  backgroundColor: item.isCorrect ? "#f0fdf4" : "#fef2f2",
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: "4px" }}>
                  {idx + 1}. {item.text}
                </p>
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  Tu respuesta:{" "}
                  <strong>
                    {item.timedOut
                      ? "Tiempo agotado"
                      : item.options[item.selectedIndex]}
                  </strong>{" "}
                  · Correcta: <strong>{item.options[item.correctIndex]}</strong>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}