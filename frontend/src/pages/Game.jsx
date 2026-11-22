import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getGameQuestions } from "../services/questionService";
import { saveGame } from "../services/gameService";

const QUESTION_TIME = 15; // Segundos por pregunta

export default function Game() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Configuración recibida desde el Dashboard (con valores por defecto por si se recarga la página)
  const category = location.state?.category || "all";
  const count = location.state?.count || 5;

  // Estados de la partida
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState("loading"); // loading | playing | feedback | saving | error
  const [error, setError] = useState("");

  // Métricas en tiempo real
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [selectedOption, setSelectedOption] = useState(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answersLog, setAnswersLog] = useState([]);

  const startTimeRef = useRef(Date.now());

  // 1. Cargar preguntas desde el backend al iniciar
  async function loadQuestions() {
    setPhase("loading");
    setError("");
    try {
      const data = await getGameQuestions(category, count);
      if (!data || data.length === 0) {
        throw new Error("No hay preguntas disponibles para la categoría seleccionada.");
      }
      setQuestions(data);
      setCurrentIndex(0);
      setTimeLeft(QUESTION_TIME);
      setScore(0);
      setCorrectCount(0);
      setCurrentStreak(0);
      setBestStreak(0);
      setAnswersLog([]);
      startTimeRef.current = Date.now();
      setPhase("playing");
    } catch (err) {
      setError(err.message);
      setPhase("error");
    }
  }

  useEffect(() => {
    loadQuestions();
  }, [category, count]);

  // 2. Temporizador de 15 segundos durante la fase "playing"
  useEffect(() => {
    if (phase !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAnswer(null); // Se acabó el tiempo
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, currentIndex]);

  // 3. Avance automático tras 2 segundos en fase "feedback"
  useEffect(() => {
    if (phase !== "feedback") return;

    const timeout = setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex < questions.length) {
        setCurrentIndex(nextIndex);
        setSelectedOption(null);
        setTimeLeft(QUESTION_TIME);
        setPhase("playing");
      } else {
        finishAndSaveGame("completed");
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [phase, currentIndex, questions.length]);

  // Validar respuesta elegida (o null si se agotó el tiempo)
  function handleAnswer(optionIndex) {
    if (phase !== "playing") return;

    const currentQuestion = questions[currentIndex];
    const isCorrect = optionIndex === currentQuestion.correctIndex;
    const earnedPoints = isCorrect ? (currentQuestion.points || 10) : 0;

    setSelectedOption(optionIndex);
    setScore((prev) => prev + earnedPoints);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      setCurrentStreak((prev) => {
        const updated = prev + 1;
        setBestStreak((max) => Math.max(max, updated));
        return updated;
      });
    } else {
      setCurrentStreak(0);
    }

    setAnswersLog((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        text: currentQuestion.text,
        category: currentQuestion.category,
        options: currentQuestion.options,
        correctIndex: currentQuestion.correctIndex,
        selectedIndex: optionIndex,
        isCorrect,
        timedOut: optionIndex === null,
        points: earnedPoints,
      },
    ]);

    setPhase("feedback");
  }

  // Guardar la partida en el servidor (completada o abandonada)
  async function finishAndSaveGame(status) {
    setPhase("saving");
    const durationSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    const displayCategory = category === "all" ? "Todas" : category;

    const payload = {
      username: user.username,
      category: displayCategory,
      status, // "completed" | "abandoned"
      score,
      correctAnswers: correctCount,
      wrongAnswers: questions.length - correctCount,
      totalQuestions: questions.length,
      bestStreak,
      durationSeconds,
      answers: answersLog,
    };

    try {
      const savedGame = await saveGame(payload);
      navigate("/resultados", {
        replace: true,
        state: {
          result: { ...payload, ...savedGame },
          originalConfig: { category, count },
        },
      });
    } catch (err) {
      setError(`No se pudo guardar la partida: ${err.message}`);
      setPhase("error");
    }
  }

  function handleAbandon() {
    if (window.confirm("¿Seguro que querés abandonar la partida? Se registrará como abandonada con el puntaje actual.")) {
      finishAndSaveGame("abandoned");
    }
  }

  // Renderizados de carga / error
  if (phase === "loading") {
    return (
      <section className="card">
        <p className="muted">Preparando preguntas...</p>
      </section>
    );
  }

  if (phase === "saving") {
    return (
      <section className="card">
        <p className="muted">Guardando resultado de la partida...</p>
      </section>
    );
  }

  if (phase === "error") {
    return (
      <section className="card">
        <div className="notice error" role="alert">
          {error}
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button className="button" onClick={loadQuestions}>
            Reintentar
          </button>
          <button className="button secondary" onClick={() => navigate("/")}>
            Volver al inicio
          </button>
        </div>
      </section>
    );
  }

  const currentQuestion = questions[currentIndex];

  // Estilo visual de cada botón de opción durante la validación
  function getOptionStyle(idx) {
    const baseStyle = {
      width: "100%",
      textAlign: "left",
      padding: "14px 16px",
      borderRadius: "8px",
      border: "1px solid #cbd5e1",
      cursor: phase === "playing" ? "pointer" : "default",
      fontWeight: 500,
      transition: "all 0.15s ease",
    };

    if (phase !== "feedback") return baseStyle;

    if (idx === currentQuestion.correctIndex) {
      return {
        ...baseStyle,
        backgroundColor: "#dcfce7",
        borderColor: "#16a34a",
        color: "#14532d",
        fontWeight: 700,
      };
    }

    if (idx === selectedOption && idx !== currentQuestion.correctIndex) {
      return {
        ...baseStyle,
        backgroundColor: "#fee2e2",
        borderColor: "#dc2626",
        color: "#7f1d1d",
      };
    }

    return { ...baseStyle, opacity: 0.65 };
  }

  return (
    <section className="card">
      {/* Barra superior de progreso, puntaje y tiempo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div>
          <p className="eyebrow">{currentQuestion.category}</p>
          <span className="muted">
            Pregunta <strong>{currentIndex + 1}</strong> de <strong>{questions.length}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <span>
            Puntaje: <strong>{score}</strong>
          </span>
          <span>
            Racha: <strong>{currentStreak}</strong>
          </span>
          <span
            style={{
              padding: "6px 12px",
              borderRadius: "999px",
              fontWeight: 700,
              backgroundColor: timeLeft <= 5 ? "#fee2e2" : "#e2e8f0",
              color: timeLeft <= 5 ? "#b91c1c" : "#0f172a",
            }}
          >
            ⏱ {timeLeft}s
          </span>
        </div>
      </div>

      {/* Enunciado */}
      <h2 style={{ marginBottom: "20px" }}>{currentQuestion.text}</h2>

      {/* Opciones de respuesta */}
      <div className="form-stack">
        {currentQuestion.options.map((option, idx) => (
          <button
            key={idx}
            type="button"
            style={getOptionStyle(idx)}
            disabled={phase !== "playing"}
            onClick={() => handleAnswer(idx)}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Mensaje de feedback durante los 2 segundos de transición */}
      {phase === "feedback" && (
        <div
          className={`notice ${selectedOption === currentQuestion.correctIndex ? "success" : "error"}`}
          style={{ marginTop: "16px" }}
        >
          {selectedOption === null
            ? `¡Se acabó el tiempo! La respuesta correcta era: ${currentQuestion.options[currentQuestion.correctIndex]}`
            : selectedOption === currentQuestion.correctIndex
            ? `¡Correcto! +${currentQuestion.points || 10} puntos`
            : `Incorrecto. La respuesta correcta era: ${currentQuestion.options[currentQuestion.correctIndex]}`}
        </div>
      )}

      {/* Botón para abandonar partida */}
      <div style={{ marginTop: "24px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
        <button
          type="button"
          className="button secondary"
          onClick={handleAbandon}
          disabled={phase === "saving"}
        >
          Abandonar partida
        </button>
      </div>
    </section>
  );
}