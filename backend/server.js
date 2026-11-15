const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const questionsRoutes = require("./routes/questions.routes");
const gamesRoutes = require("./routes/games.routes");

const app = express();
const PORT = 3000;

//Middlewares
app.use(cors());
app.use(express.json());

//Rutas de la API REST
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionsRoutes);
app.use("/api/games", gamesRoutes);

//Ruta de prueba
app.get('/', (req, res) => {
    res.json({ status: "OK", message: "API de desafío mental funcionando" });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
});