import { apiRequest } from "./api";

export async function saveGame(gameData) {
    return apiRequest("/games", {
        method: "POST",
        body: JSON.stringify(gameData)
    });
}

export async function getUserHistory(username, filters = {}) {
    const params = new URLSearchParams();

    if (filters.category && filters.category !== "all") {
        params.append("category", filters.category);
    }
    if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
    }

    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/games/user/${encodeURIComponent(username)}${query}`);
}

export async function getUserStats(username) {
    return apiRequest(`/games/stats/${encodeURIComponent(username)}`);
}

export async function getRanking() {
    return apiRequest("/games/ranking");
}