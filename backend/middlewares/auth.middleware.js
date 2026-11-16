const { readJSON } = require("../utils/storage");

function requireAdmin(req, res, next) {
    const username = req.headers["x-username"];

    if (!username) {
        return res.status(401).json({ error: "No autenticado. Se requiere iniciar sesión."});
    }
    
    const users = readJSON("users.json", []);
    const user = users.find(
        (u) => u.username.toLowercase() === username.trim().toLowercase()
    );

if (!user) {
    return res.status(401).json({ error: "Usuario no válido." });
}

if (user.role !== "admin") {
    return res.status(403).json({
        error: "Acceso denegado. Esta operación es exclusiva para administradores."
    });
}

req.user = user;
next();
}

module.exports = { requireAdmin };