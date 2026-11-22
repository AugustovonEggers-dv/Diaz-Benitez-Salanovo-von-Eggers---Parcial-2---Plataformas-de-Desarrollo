import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/protectedRoutes";
import Navbar from "./components/Navbar";

// Pantallas
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Game from "./pages/Game";
import Results from "./pages/Results";
import History from "./pages/History";
import CategoryStats from "./pages/CategoryStats";
import Ranking from "./pages/Ranking";
import AdminQuestions from "./pages/AdminQuestions";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="container">
          <Routes>
            {/* Rutas públicas (solo sin sesión) */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/registro"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Rutas protegidas para cualquier usuario autenticado */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jugar"
              element={
                <ProtectedRoute>
                  <Game />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resultados"
              element={
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              }
            />
            <Route
              path="/historial"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estadisticas"
              element={
                <ProtectedRoute>
                  <CategoryStats />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ranking"
              element={
                <ProtectedRoute>
                  <Ranking />
                </ProtectedRoute>
              }
            />

            {/* Ruta exclusiva de Administrador */}
            <Route
              path="/admin/preguntas"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminQuestions />
                </ProtectedRoute>
              }
            />

            {/* Cualquier ruta desconocida redirige al inicio */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}