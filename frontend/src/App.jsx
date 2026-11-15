import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth} from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import MenuPrincipal from "./pages/MenuPrincipal";
import Partida from "./pages/Partida";
import Resultados from "./pages/Resultados";
import Historial from "./pages/Historial";
import Ranking from "./pages/Ranking";

//Protección de datos sin no hay sesión
function protectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />  
      <main className="container">
        <Routes>

          //Rutas públicas
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />

          //Rutas privadas
          <Route path="/" element={<protectedRoute><MenuPrincipal /></protectedRoute>} />
          <Route path="/jugar" element={<protectedRoute><Partida /></protectedRoute>} />
          <Route path="/resultados" element={<protectedRoute><Resultados /></protectedRoute>} />
          <Route path="/historial" element={<protectedRoute><Historial /></protectedRoute>} />
          <Route path="/ranking" element={<protectedRoute><Ranking /></protectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>         
      </main>

      </BrowserRouter>
      </AuthProvider>
  );
}

