const express = require("express");
const router = express.Router();
const { readJSON, writeJSON } = require("../utils/storage");
const { requireAdmin } = require("../middlewares/auth.middleware")

function validateQuestionPayload({ category, text, options, correctIndex, points }) {
    if (!category || !category.trim()) {
        return "La categoría es obligatoria.";
    }

    if (!text || text.trim().length < 5) {
        return "El enunciado de una pregunta debe tener al menos 5 caracteres.";
    }

    if (!Array.isArray(options) || options.length !== 4 || options.some((opt) => !opt || !String(opt).trim())) {
        return "Debes proporcionar exactamente 4 opciones válidas.";
    }

    const idx = Number(correctIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
        return "El índice de la respuesta correcta debe estar entre 0 y 3. '0' es proporcional a la primera respuesta.";
    }

    if (points !== undefined && (isNaN(Number(points)) || Number(points) <= 0)) {
        return "El puntaje debe ser un número mayor a 0";
    }

    return null;
}

// ==================== RUTAS PÚBLICAS / DE JUEGO ====================
// GET /api/questions/categories
router.get("/categories", (req, res) => {
    const questions = readJSON("questions.json", []);
    const categories = [...new Set(questions.map((q) => q.category))];
    res.json(categories);
});

// GET /api/questions/questions?category=Historia&count=5
router.get("/questions", (req, res) => {
    const { category, count = 5 } = req.query;
    let questions = readJSON("questions.json", []);

    if (category && category !== "all") {
        questions = questions.filter(
            (q) => q.category.toLowerCase() === category.toLowerCase()
    );
    }

    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Number(count));

    res.json(selected);

});

module.exports = router;

// ==================== RUTAS EXCLUSIVAS DE ADMINISTRADOR ====================

//GET /api/questions/all -> Lista completa sin mezclar para la gestión
router.get("/all", requireAdmin, (req, res) => {
    const questions = readJSON("questions.json", []);
    res.json(questions);
});

//POST /api/questions -> Alta de nuea pregunta
router.get("/", requireAdmin, (req, res) => {
const validationError = validateQuestionPayload(req.body);
if (validationError) {
    return res.status(400).json({ error: validationError });
}

const { category, text, options, correctIndex, points } = req.body;
const questions = readJSON("questions.json", []);

const newQuestion = {
    id: `q-${Date.now}`,
    category: category.trim(),
    text: text.trim(),
    options: options.map((opt) => String(opt).trim()),
    correctIndex: Number(correctIndex),
    points: points ? Number(points) : 10
}

questions.push(newQuestion);
writeJSON("questions.json", questions);

res.status.json(newQuestion);
});

//PUT /api/questions/:id -> Modificación de pregunta existente
router.put("/:id", requireAdmin, (req, res) => {
const { id } = req.params;
const validationError = validateQuestionPayload(req.body);
if (validationError) {
    return res.status(400).json({ error: validationError });
}

const questions = readJSON("questions.json", []);
const index = questions.findIndex((q) => q.id === id);

if (index === -1) {
    return res.status(404).json({ error: "No se encontró la página solicitada" });
}

const { category, text, options, correctIndex, points } = req.body;
questions[index] = {
...questions[index],
category: category.trim(),
text: text.trim(),
options: options.map((opt) => String(opt).trim()),
correctIndex: Number(correctIndex),
points: points ? Number(points) : questions[index].points
};

writeJSON("questions.json", questions);
res.json(questions[index]);
});

// DELETE /api/questions/:id -> Eliminación de pregunta
router.delete("/:id", requireAdmin, (req, res) => {
const { id } = req.params;
const questions = readJSON("questions.json", []);
const exists = questions.some((q) => q.id === id);

if (!exists) {
    return res.status(404).json({ error: "No se encontró la página solicitada." });
}

const updated = questions.filter((q) => q.id !== id);
writeJSON("questions.json", updated);

res.json({ error: "Pregunta eliminada correctamente.", id});
});