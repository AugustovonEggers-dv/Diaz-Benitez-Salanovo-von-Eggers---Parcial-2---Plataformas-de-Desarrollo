const express = require("express");
const router = express.Router();
const { readJSON } = require("../utils/storage");

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