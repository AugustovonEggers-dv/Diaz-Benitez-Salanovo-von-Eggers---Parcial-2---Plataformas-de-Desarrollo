const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const GAMES_FILE = path.join(__dirname, "../data/games.json");

function getGames() {
  try {
    if (!fs.existsSync(GAMES_FILE)) {
      fs.mkdirSync(path.dirname(GAMES_FILE), { recursive: true });
      fs.writeFileSync(GAMES_FILE, "[]", "utf-8");
      return [];
    }
    const raw = fs.readFileSync(GAMES_FILE, "utf-8").trim();
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error leyendo games.json:", error);
    return [];
  }
}

function saveGames(games) {
  fs.mkdirSync(path.dirname(GAMES_FILE), { recursive: true });
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2), "utf-8");
}

// POST /api/games
router.post("/", (req, res) => {
  try {
    const games = getGames();
    const newGame = {
      id: `game-${Date.now()}`,
      ...req.body,
      playedAt: req.body.playedAt || new Date().toISOString(),
    };

    games.push(newGame);
    saveGames(games);
    return res.status(201).json(newGame);
  } catch (error) {
    return res.status(500).json({ error: "Error al guardar la partida." });
  }
});

// GET /api/games/user/:username
router.get("/user/:username", (req, res) => {
  try {
    const { username } = req.params;
    const { category, status } = req.query;

    let userGames = getGames().filter(
      (g) => g.username && g.username.toLowerCase() === username.toLowerCase()
    );

    if (category && category !== "all") {
      userGames = userGames.filter(
        (g) => g.category && g.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (status && status !== "all") {
      userGames = userGames.filter(
        (g) => g.status && g.status.toLowerCase() === status.toLowerCase()
      );
    }

    userGames.sort((a, b) => new Date(b.playedAt || 0) - new Date(a.playedAt || 0));
    return res.json(userGames);
  } catch (error) {
    return res.status(500).json({ error: "Error al obtener el historial." });
  }
});

// GET /api/games/stats/:username
router.get("/stats/:username", (req, res) => {
  try {
    const { username } = req.params;
    const userGames = getGames().filter(
      (g) => g.username && g.username.toLowerCase() === username.toLowerCase()
    );

    const totalGames = userGames.length;
    const totalPoints = userGames.reduce((acc, g) => acc + (Number(g.score ?? g.points) || 0), 0);
    const totalCorrect = userGames.reduce((acc, g) => acc + (Number(g.correctAnswers ?? g.correct) || 0), 0);
    const totalQuestions = userGames.reduce((acc, g) => acc + (Number(g.totalQuestions ?? g.total) || 0), 0);
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const bestStreak = userGames.reduce(
      (max, g) => Math.max(max, Number(g.bestStreak ?? g.maxStreak ?? g.streak) || 0),
      0
    );

    return res.json({
      username,
      totalGames,
      gamesPlayed: totalGames,
      totalPoints,
      totalScore: totalPoints,
      totalCorrect,
      totalQuestions,
      accuracy,
      bestStreak,
    });
  } catch (error) {
    return res.status(500).json({ error: "Error al calcular estadísticas." });
  }
});

// GET /api/games/ranking
router.get("/ranking", (req, res) => {
  try {
    const games = getGames();
    const map = new Map();

    for (const g of games) {
      if (!g.username) continue;
      const key = g.username.toLowerCase();
      const current = map.get(key) || {
        username: g.username,
        totalPoints: 0,
        totalScore: 0,
        gamesPlayed: 0,
        totalGames: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        bestStreak: 0,
      };

      const pts = Number(g.score ?? g.points) || 0;
      const correct = Number(g.correctAnswers ?? g.correct) || 0;
      const total = Number(g.totalQuestions ?? g.total) || 0;
      const streak = Number(g.bestStreak ?? g.maxStreak ?? g.streak) || 0;

      current.totalPoints += pts;
      current.totalScore += pts;
      current.gamesPlayed += 1;
      current.totalGames += 1;
      current.totalCorrect += correct;
      current.totalQuestions += total;
      current.bestStreak = Math.max(current.bestStreak, streak);

      map.set(key, current);
    }

    const ranking = Array.from(map.values())
      .map((entry) => ({
        ...entry,
        accuracy:
          entry.totalQuestions > 0
            ? Math.round((entry.totalCorrect / entry.totalQuestions) * 100)
            : 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    return res.json(ranking);
  } catch (error) {
    return res.status(500).json({ error: "Error al obtener el ranking." });
  }
});

module.exports = router;