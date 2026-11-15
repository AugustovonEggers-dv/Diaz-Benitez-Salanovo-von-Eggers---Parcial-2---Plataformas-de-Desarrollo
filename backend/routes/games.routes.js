const express = require("express");
const router = express.Router();
const { readJSON, writeJSON } = require("../utils/storage");

//POST /api/games -> Guardar partida completada o abandonada

router.post("/", (req, res) => {
const gameData = req.body;

if (!gameData || !gameData.userId || !gameData.score || !gameData.category) {
return res.status(400).json({ message: "Datos de partida incompletos." });
}

const games = readJSON("games.json", []);
const newGame = {
    id: gameData.id || `game-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    username: gameData.username,
    category: gameData.category,
    status: gameData.status || "completed",
    score: Number(gameData.score) || 0,
    correctCount: Number(gameData.correctCount) || 0,
    bestStreak: Number(gameData.bestStreak) || 0,
    durationSeconds: Number(gameData.durationSeconds) || 0,
    startedAt: gameData.startedAt || new Date().toISOString(),
    finishedAt: gameData.finishedAt || new Date().toISOString(),
    answers: Array.isArray(gameData.answers) ? gameData.answers : [],
}

games.push(newGame);
writeJSON("games.json", games);

res.status(201).json(newGame);
});


//GET /api/game/user/:username -> Historial ordenado del más reciente al más antiguo
router.get("/user/:username", (req, res) => {
    const { username } = req.params;
    const { category, status } = req.query;
    const games = readJSON("games.json", []);

    let userGames = games
    .filter((g) => g.username.toLowerCase() === username.toLowerCase())
    .sort((a, b) => new Date(b.finishedAt || b.startedAt ) - new Date(a.finishedAt || a.startedAt));

    if (category && category !== "all") {
        userGames = userGames.filter((g) => g.category === category);
    }

    if (status && status !== "all") { 
        userGames = userGames.filter((g) => g.status === status);
    }

    res.json(userGames);
});

//GET /api/games/stats/:username -> Estadísticas del usuario + por categoría
router.get("/stats/:username", (req, res) => {
    const { username } = req.params;
    const games = readJSON("games.json", []);
    const questions = readJSON("questions.json", []);

    const history = games.filter((g) => g.username.toLowerCase() === username.toLowerCase());
    const completed = history.filter((g) => g.status === "completed");
    const abandoned = history.filter((g) => g.status === "abandoned");

    const totalQuestions = completed.reduce((acc, g) => acc + g.answers.length, 0);
    const totalCorrect = completed.reduce((acc, g) => acc + g.correctCount, 0);

    const personalStats = {
        completedGames: completed.length,
        abandonedGames: abandoned.length,
        totalQuestions,
        globalPercentage: totalQuestions === 0 ? 0 : Math.round((totalCorrect / totalQuestions) * 100),
        highestScore: completed.reduce((max, g) => Math.max(max, g.score), 0),
        accumulatedScore: completed.reduce((sum, g) => sum + g.score, 0),
        beststreak: completed.reduce((sum, g) => Math.max(max, g.bestStreak), 0)
    }

    //Estadísticas desglosadas por categoría

    const categories  =  [...new Set(questions.map((q)  => q.category))]; 
    const categoryStats = categories.map((cat) => {
        const catAnswers = history
        .filter((g) => g.category  ===  cat)
        .flatMap((g) => g.answers);
    
    const correct = catAnswers.filter((a) =>  a.correct === true).length(); 
    const total =  catAnswers.length; 

    return {
        category: cat,
        correct, 
        total,
        percentage: total ===  0 ? 0 : Math.round((correct / total) *  100 )
    }; 
    });
    
    res.json({ personalStats, categoryStats });
});

// GET /api/games/ranking -> Tabla de posiciones global (mejor puntaje y acumulado por usuario)

router.get("/ranking", (req, res) => {
const games = readJSON("games.json", []);
const completed = games.filter((g) => g.status === "completed");

const mapByUser = {};
completed.forEach((g) => {
    const key = g.username.toLowerCase();
 if (!mapByUser[key]) {
      mapByUser[key] = {
        username: g.username,
        highestScore: 0,
        totalScore: 0,
        gamesPlayed: 0
      };
    }
    mapByUser[key].highestScore = Math.max(mapByUser[key].highestScore, g.score);
    mapByUser[key].totalScore += g.score;
    mapByUser[key].gamesPlayed += 1;
});

const ranking = Object.values(mapByUser).sort(
    (a, b) => b.highestScore - a.highestScore || b.totalScore - a.totalScore
);

res.json(ranking);
});

module.exports = router;