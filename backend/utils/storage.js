const fs = require("fs");
const path = require("path");

function readJSON(filename, fallback = []) {
    try {
        const filePath = path.join (__dirname, "..", "data", fileName);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf-8");
            return fallback;
        }
        const rawData = fs.readFileSync(filePath, "utf-8");
        return rawData ? JSON.parse(rawData) : fallback;
    } catch (error) {
        console.error(`Error leyendo ${filename}:`, error);
        return fallback;
    }
  }

    function writeJSON(filename, data) {
        try {
            const filePath = path.join(__dirname, "..", "data", filename);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
            return true;
        } catch (error) {
            console.error(`Error escribiendo ${filename}:`, error);
            return false;
    }
}

module.exports = { readJSON, writeJSON };