const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const questionRoutes = require("./routes/questions.routes");
const gameRoutes = require("./routes/games.routes");

const app = express();
const PORT = 3000;

//Middlewares
app.use(cors());
app.use(express.json());

//Rutas de la API REST
app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/games", gameRoutes);

//Ruta de prueba
app.get('/', (req, res) => {
    res.json({ status: "OK", message: "API de desafío mental funcionando" });
});

//Manejo de rutas inexistentes (404)
app.use((req, res) => {
res.status(404).json({ error: "Endpoint no encontrado." });
});

// Manejo global de errores inesperados en el servidor (500)
app.use((err, req, res, next) => {
console.error("Error interno.", err);
res.status(500).json({ error: "Error interno en el servidor." });
});


app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`)
});