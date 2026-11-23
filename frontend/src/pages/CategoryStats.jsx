import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCategories } from "../services/questionService";
import { getUserHistory, getUserStats } from "../services/gameService";

const MIXED_CATEGORY_NAMES = new Set([
  "all",
  "todas",
  "mixto",
  "mixto (todas las categorías)",
]);

function normalizeCategory(category) {
  return String(category || "").trim().toLocaleLowerCase("es");
}

function buildCategoryStats(games, categories) {
  const byCategory = new Map();

  categories.forEach((category) => {
    const normalized = normalizeCategory(category);
    if (normalized && !byCategory.has(normalized)) {
      byCategory.set(normalized, {
        category,
        totalAnswers: 0,
        correctAnswers: 0,
      });
    }
  });

  function findCategory(category) {
    const normalized = normalizeCategory(category);
    if (!normalized || MIXED_CATEGORY_NAMES.has(normalized)) return null;

    if (!byCategory.has(normalized)) {
      byCategory.set(normalized, {
        category: String(category).trim(),
        totalAnswers: 0,
        correctAnswers: 0,
      });
    }

    return byCategory.get(normalized);
  }

  games.forEach((game) => {
    const answers = Array.isArray(game.answers) ? game.answers : [];

    if (answers.length > 0) {
      answers.forEach((answer) => {
        const category = findCategory(answer.category || game.category);
        if (!category) return;

        category.totalAnswers += 1;
        const hasCorrectFlag = typeof answer.isCorrect === "boolean";
        const isCorrect = hasCorrectFlag
          ? answer.isCorrect
          : answer.selectedIndex != null &&
            answer.correctIndex != null &&
            Number(answer.selectedIndex) === Number(answer.correctIndex);
        if (isCorrect) category.correctAnswers += 1;
      });
      return;
    }

    const category = findCategory(game.category);
    if (!category) return;

    category.totalAnswers += Number(game.totalQuestions ?? game.total) || 0;
    category.correctAnswers += Number(game.correctAnswers ?? game.correct) || 0;
  });

  return Array.from(byCategory.values()).map((category) => ({
    ...category,
    accuracy:
      category.totalAnswers > 0
        ? Math.round((category.correctAnswers / category.totalAnswers) * 100)
        : null,
  }));
}

export default function CategoryStats() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [categoryStats, setCategoryStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      const [summary, games, categories] = await Promise.all([
        getUserStats(user.username),
        getUserHistory(user.username),
        getCategories(),
      ]);
      setStats(summary);
      setCategoryStats(
        buildCategoryStats(games, Array.isArray(categories) ? categories : [])
      );
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
        <p className="eyebrow">Por categoría</p>
        <h2>Precisión en cada categoría</h2>
        <p className="muted">
          Porcentaje de respuestas correctas en tus partidas registradas.
        </p>

        {categoryStats.length === 0 ? (
          <div style={{ marginTop: "12px" }}>
            <p className="muted">
              Todavía no hay categorías disponibles para mostrar.
            </p>
            <Link to="/" className="button" style={{ marginTop: "12px", display: "inline-block" }}>
              Comenzar a jugar
            </Link>
          </div>
        ) : (
          <div
            className="category-chart-scroll"
            role="region"
            aria-label="Gráfico de precisión por categoría"
            tabIndex={0}
          >
            <div
              className="category-chart"
              style={{ "--category-count": categoryStats.length }}
            >
              <div className="chart-y-axis" aria-hidden="true">
                {[100, 75, 50, 25, 0].map((tick) => (
                  <span key={tick}>{tick}%</span>
                ))}
              </div>
              <div className="chart-main">
                <div className="chart-plot">
                  <div className="chart-columns" role="list">
                    {categoryStats.map((item) => {
                      const value = item.accuracy ?? 0;
                      const resultLabel = item.accuracy == null
                        ? "Sin partidas"
                        : `${item.accuracy}%`;

                      return (
                        <div
                          className="chart-column"
                          role="listitem"
                          aria-label={`${item.category}: ${resultLabel}`}
                          key={item.category}
                          style={{ "--bar-value": `${value}%` }}
                        >
                          <span className="chart-value">
                            {resultLabel}
                          </span>
                          {item.accuracy != null && (
                            <div
                              className="chart-bar"
                              style={{ height: `${Math.max(value, 1)}%` }}
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="chart-category-labels" aria-hidden="true">
                  {categoryStats.map((item) => (
                    <span className="chart-category-label" key={item.category}>
                      {item.category}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
