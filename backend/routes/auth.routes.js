const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const USERS_FILE = path.join(__dirname, "../data/users.json");

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
      fs.writeFileSync(USERS_FILE, "[]", "utf-8");
      return [];
    }
    const raw = fs.readFileSync(USERS_FILE, "utf-8").trim();
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Error leyendo users.json:", err);
    return [];
  }
}

function writeUsers(users) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// POST /api/auth/register
router.post("/register", (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || username.trim().length < 4 || username.trim().length > 16) {
      return res.status(400).json({ message: "El nombre de usuario debe tener entre 4 y 16 caracteres." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      return res.status(400).json({ message: "El correo electrónico no es válido." });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres." });
    }

    const users = readUsers();
    const normalizedUser = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    if (users.some((u) => u.username.toLowerCase() === normalizedUser)) {
      return res.status(400).json({ message: "Ese nombre de usuario ya está en uso." });
    }

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(400).json({ message: "Ese correo electrónico ya está registrado." });
    }

    const newUser = {
      id: Date.now().toString(),
      username: username.trim(),
      email: normalizedEmail,
      password,
      role: "user",
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);

    const { password: _, ...safeUser } = newUser;
    return res.status(201).json({
      message: "Usuario registrado correctamente.",
      user: safeUser,
    });
  } catch (error) {
    console.error("Error en /register:", error);
    return res.status(500).json({ error: "Error interno en el servidor." });
  }
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Completá usuario y contraseña." });
    }

    const users = readUsers();
    const found = users.find(
      (u) =>
        u.username.toLowerCase() === username.trim().toLowerCase() &&
        u.password === password
    );

    if (!found) {
      return res.status(401).json({ message: "Usuario o contraseña incorrectos." });
    }

    const { password: _, ...safeUser } = found;
    return res.json({
      message: "Inicio de sesión exitoso.",
      user: safeUser,
    });
  } catch (error) {
    console.error("Error en /login:", error);
    return res.status(500).json({ error: "Error interno en el servidor." });
  }
});

module.exports = router;