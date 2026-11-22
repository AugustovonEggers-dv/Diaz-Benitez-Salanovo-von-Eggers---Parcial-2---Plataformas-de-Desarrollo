import { useEffect, useMemo, useState } from "react";
import {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "../services/questionService";

const INITIAL_FORM = {
  category: "",
  text: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  points: 10,
};

export default function AdminQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estado del formulario (alta / edición)
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Filtro rápido para el listado
  const [categoryFilter, setCategoryFilter] = useState("all");

  async function loadQuestions() {
    setLoading(true);
    setError("");
    try {
      const data = await getAllQuestions();
      setQuestions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, []);

  // Categorías únicas existentes para sugerencias y filtro
  const availableCategories = useMemo(() => {
    return [...new Set(questions.map((q) => q.category))].sort();
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    if (categoryFilter === "all") return questions;
    return questions.filter((q) => q.category === categoryFilter);
  }, [questions, categoryFilter]);

  function handleFieldChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "correctIndex" || name === "points" ? Number(value) : value,
    }));
  }

  function handleOptionChange(index, value) {
    setFormData((prev) => {
      const updatedOptions = [...prev.options];
      updatedOptions[index] = value;
      return { ...prev, options: updatedOptions };
    });
  }

  function handleEditClick(question) {
    setEditingId(question.id);
    setFormData({
      category: question.category,
      text: question.text,
      options: [...question.options],
      correctIndex: question.correctIndex,
      points: question.points || 10,
    });
    setFormError("");
    setFeedbackMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setFeedbackMsg("");

    if (!formData.category.trim()) {
      return setFormError("Ingresá una categoría.");
    }
    if (formData.text.trim().length < 5) {
      return setFormError("La pregunta debe tener al menos 5 caracteres.");
    }
    if (formData.options.some((opt) => !opt.trim())) {
      return setFormError("Completá las 4 opciones de respuesta.");
    }
    if (formData.points <= 0) {
      return setFormError("El puntaje debe ser mayor a 0.");
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await updateQuestion(editingId, formData);
        setQuestions((prev) =>
          prev.map((q) => (q.id === editingId ? updated : q))
        );
        setFeedbackMsg("Pregunta actualizada correctamente.");
      } else {
        const created = await createQuestion(formData);
        setQuestions((prev) => [created, ...prev]);
        setFeedbackMsg("Nueva pregunta agregada al banco.");
      }
      resetForm();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("¿Seguro que querés eliminar esta pregunta? Esta acción no se puede deshacer.")) {
      return;
    }

    setFeedbackMsg("");
    try {
      await deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      if (editingId === id) {
        resetForm();
      }
      setFeedbackMsg("Pregunta eliminada correctamente.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      {/* Formulario de Alta / Modificación */}
      <section className="card">
        <p className="eyebrow">Panel Administrador</p>
        <h1>{editingId ? "Editar pregunta" : "Agregar nueva pregunta"}</h1>
        <p className="muted">
          Administrá el banco de preguntas disponible para todas las partidas.
        </p>

        <form className="form-stack" onSubmit={handleSubmit} style={{ marginTop: "20px" }} noValidate>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <div className="field">
              <label htmlFor="q-category">Categoría</label>
              <input
                id="q-category"
                name="category"
                list="categories-list"
                placeholder="Ej: Historia, Ciencia, Arte..."
                value={formData.category}
                onChange={handleFieldChange}
                required
              />
              <datalist id="categories-list">
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="field">
              <label htmlFor="q-points">Puntaje</label>
              <input
                id="q-points"
                name="points"
                type="number"
                min="1"
                max="100"
                value={formData.points}
                onChange={handleFieldChange}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="q-text">Enunciado de la pregunta</label>
            <input
              id="q-text"
              name="text"
              placeholder="Escribí la pregunta..."
              value={formData.text}
              onChange={handleFieldChange}
              required
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {formData.options.map((opt, idx) => (
              <div className="field" key={idx}>
                <label htmlFor={`q-opt-${idx}`}>Opción {idx + 1}</label>
                <input
                  id={`q-opt-${idx}`}
                  placeholder={`Respuesta ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  required
                />
              </div>
            ))}
          </div>

          <div className="field" style={{ maxWidth: "280px" }}>
            <label htmlFor="q-correct">Respuesta correcta</label>
            <select
              id="q-correct"
              name="correctIndex"
              value={formData.correctIndex}
              onChange={handleFieldChange}
            >
              <option value={0}>Opción 1</option>
              <option value={1}>Opción 2</option>
              <option value={2}>Opción 3</option>
              <option value={3}>Opción 4</option>
            </select>
          </div>

          {formError && (
            <div className="notice error" role="alert">
              {formError}
            </div>
          )}

          {feedbackMsg && (
            <div className="notice success" role="status">
              {feedbackMsg}
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="button" type="submit" disabled={submitting}>
              {submitting
                ? "Guardando..."
                : editingId
                ? "Guardar cambios"
                : "Agregar pregunta"}
            </button>

            {editingId && (
              <button
                type="button"
                className="button secondary"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Listado de preguntas existentes */}
      <section className="card">
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
            <h2>Banco de preguntas ({filteredQuestions.length})</h2>
          </div>

          <div className="field" style={{ minWidth: "200px" }}>
            <label htmlFor="admin-cat-filter">Filtrar por categoría</label>
            <select
              id="admin-cat-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas ({questions.length})</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="muted">Cargando banco de preguntas...</p>
        ) : error ? (
          <div>
            <div className="notice error" role="alert">
              {error}
            </div>
            <button
              type="button"
              className="button"
              onClick={loadQuestions}
              style={{ marginTop: "12px" }}
            >
              Reintentar
            </button>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <p className="muted">No hay preguntas registradas en esta categoría.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 8px" }}>Categoría</th>
                  <th style={{ padding: "12px 8px" }}>Pregunta</th>
                  <th style={{ padding: "12px 8px" }}>Respuesta correcta</th>
                  <th style={{ padding: "12px 8px" }}>Puntos</th>
                  <th style={{ padding: "12px 8px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q) => (
                  <tr key={q.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "12px 8px" }}>
                      <strong>{q.category}</strong>
                    </td>
                    <td style={{ padding: "12px 8px" }}>{q.text}</td>
                    <td style={{ padding: "12px 8px" }}>
                      {q.options[q.correctIndex]}
                    </td>
                    <td style={{ padding: "12px 8px" }}>{q.points || 10}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => handleEditClick(q)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => handleDelete(q.id)}
                        >
                          Eliminar
                        </button>
                      </div>
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