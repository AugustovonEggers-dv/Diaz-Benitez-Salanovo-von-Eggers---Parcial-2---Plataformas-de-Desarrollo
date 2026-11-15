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
        console.error(`Error leyendo ${fileName}:`, error);
        return fallback;
    }
  }

    function writeJSON(fileName, data) {
        try {
            const filePath = path.join(__dirname, "..", "data", fileName);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
            return true;
        } catch (error) {
            console.error(`Error escribiendo ${fileName}:`, error);
            return false;
    }
}

module.exports = { readJSON, writeJSON };