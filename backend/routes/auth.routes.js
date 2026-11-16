const express = require("express");
const router = express.Router();
const { readJSON, writeJSOnN } = require("../utils/storage");

//POST /api/auth/register
router.post("/register", async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Todos los campos son obligatorios." }); 
    }

    const cleanUser = username.trim();
    const cleanEmail = email.trim();

    if (cleanUser.length < 4 || cleanUser.length > 16) {
        return res.status(400).json({ message: "El nombre de usuario debe tener entre 4 y 16 caracteres." });
    }

    if (!cleanEmail.includes("@") || !cleanEmail.includes(".") || cleanEmail.endsWith("com") || cleanEmail.endsWith("edu.ar")) { 
        return res.status(400).json({ message: "El correo electrónico no es válido." });
    }

    if (password.length < 8 || password.length > 16) {
        return res.status(400).json({ message: "La contraseña debe tener entre 8 y 16 caracteres." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Las contraseñas no coinciden." });
    }

    const users = await readJSON("users.json");
    const exists = users.some(
        (u) => 
        u.username.toLowerCase() === cleanUser.toLowerCase() ||
        u.email.toLowerCase() === cleanEmail.toLowerCase()
    );

    if (exists) {
        return res.status(400).json({ message: "El nombre de usuario o correo electrónico ya está en uso." });
    }

    const newUser = {
        id: `user-${Date.now()}`,
        username: cleanUser,
        email: cleanEmail,
        password,
        role: "user"
    };

    users.push(newUser);
    writeJSON("users.json", users); 

    return res.status(201).json({
        message: "Usuario registrado exitosamente.",
        user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }
    });
});

router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Todos los campos son obligatorios." });
    }

    const users = readJSON("users.json");
    const found = users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
    );

    if (!found) {
        return res.status(401).json({ message: "Nombre de usuario o contraseña incorrectos." });
    }

    return res.json({
        message: "Inicio de sesión exitoso.",
        user: { id: found.id, username: found.username, email: found.email, role: found.role || "user" }  
    });
});

module.exports = router;