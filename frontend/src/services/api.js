const API_BASE_URL = "http://localhost:3000/api";
const STORAGE_KEY = import.meta.env.VITE_USER_STORAGE_KEY || "desafioMental.user";

export async function apiRequest(endpoint, options = {}) {
  const savedUser = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

  const headers = {
    "Content-Type": "application/json",
    ...(savedUser?.username ? { "x-username": savedUser.username } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Verificá que el backend esté encendido.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Error HTTP ${response.status}`);
  }

  return data;
}