const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

function resolveQuestionsFile() {
  const candidates = [
    path.join(__dirname, "../data/questions.json"),
    path.join(__dirname, "../../data/questions.json"),
    path.join(__dirname, "../../frontend/src/data/questions.json"),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8").trim();
      if (content && content !== "[]") {
        return filePath;
      }
    }
  }

  return candidates[0];
}

const QUESTIONS_FILE = resolveQuestionsFile();

function getQuestions() {
  try {
    if (!fs.existsSync(QUESTIONS_FILE)) return [];
    const raw = fs.readFileSync(QUESTIONS_FILE, "utf-8").trim();
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error leyendo questions.json:", error);
    return [];
  }
}

function saveQuestions(questions) {
  fs.mkdirSync(path.dirname(QUESTIONS_FILE), { recursive: true });
  fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(questions, null, 2), "utf-8");
}

console.log(`[Questions] ${getQuestions().length} preguntas cargadas desde: ${QUESTIONS_FILE}`);

// GET /api/questions/categories
router.get("/categories", (req, res) => {
  try {
    const questions = getQuestions();
    const categories = [...new Set(questions.map((q) => q.category).filter(Boolean))];
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ error: "Error al obtener las categorías." });
  }
});

// GET /api/questions/game?category=...&count=...
router.get("/game", (req, res) => {
  try {
    const { category, count } = req.query;
    const limit = Number(count) || 5;
    let pool = getQuestions();

    if (category && category !== "all") {
      pool = pool.filter(
        (q) => q.category && q.category.toLowerCase() === category.toLowerCase()
      );
    }

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return res.json(shuffled.slice(0, limit));
  } catch (error) {
    return res.status(500).json({ error: "Error al preparar la partida." });
  }
});

// GET /api/questions
router.get("/", (req, res) => {
  return res.json(getQuestions());
});

// POST /api/questions
router.post("/", (req, res) => {
  try {
    const questions = getQuestions();
    const { category, text, options, correctIndex, points } = req.body;

    const newQuestion = {
      id: req.body.id || `q-${Date.now()}`,
      category,
      text,
      options,
      correctIndex: Number(correctIndex),
      points: Number(points) || 10,
    };

    questions.push(newQuestion);
    saveQuestions(questions);
    return res.status(201).json(newQuestion);
  } catch (error) {
    return res.status(500).json({ error: "Error al crear la pregunta." });
  }
});

// PUT /api/questions/:id
router.put("/:id", (req, res) => {
  try {
    const questions = getQuestions();
    const index = questions.findIndex((q) => String(q.id) === String(req.params.id));

    if (index === -1) {
      return res.status(404).json({ error: "Pregunta no encontrada." });
    }

    questions[index] = {
      ...questions[index],
      ...req.body,
      id: questions[index].id,
      ...(req.body.correctIndex !== undefined && { correctIndex: Number(req.body.correctIndex) }),
      ...(req.body.points !== undefined && { points: Number(req.body.points) }),
    };

    saveQuestions(questions);
    return res.json(questions[index]);
  } catch (error) {
    return res.status(500).json({ error: "Error al actualizar la pregunta." });
  }
});

// DELETE /api/questions/:id
router.delete("/:id", (req, res) => {
  try {
    const questions = getQuestions();
    const filtered = questions.filter((q) => String(q.id) !== String(req.params.id));

    if (filtered.length === questions.length) {
      return res.status(404).json({ error: "Pregunta no encontrada." });
    }

    saveQuestions(filtered);
    return res.json({ message: "Pregunta eliminada correctamente." });
  } catch (error) {
    return res.status(500).json({ error: "Error al eliminar la pregunta." });
  }
});

module.exports = router;