import React, { useState, useEffect } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAuth as usePermisos } from "../hooks/useAuth";
import { Loader2, Lock } from "lucide-react";

/** Pantalla que ve quien llega a una página para la que no tiene el módulo habilitado. */
const SinAcceso = ({ modulo }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#F6F8FB] px-4">
    <div className="w-full max-w-md rounded-[18px] border border-[#E2E7EE] bg-white p-7 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-[12px] bg-[#EEF3FF]">
        <Lock className="h-5 w-5 text-[#2A377E]" />
      </div>
      <h1 className="text-[19px] font-semibold tracking-tight text-[#1B2335]">
        No tienes acceso a esta página
      </h1>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[#5E6A82]">
        Tu usuario no tiene habilitado el módulo <strong className="text-[#1B2335]">{modulo}</strong>.
        Pídele a un administrador que te lo active desde Usuarios → editar tu usuario → Permisos.
      </p>
      <Link
        to="/home"
        className="mt-5 inline-flex items-center rounded-[10px] bg-[#1D293D] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#2A3B52]"
      >
        Volver al inicio
      </Link>
    </div>
  </div>
);

const Cargando = ({ texto }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#F6F8FB]">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#2A377E]" />
      <p className="text-[#5E6A82]">{texto}</p>
    </div>
  </div>
);

/**
 * Envuelve una ruta.
 * - `requireAuth`: exige sesión (por defecto sí).
 * - `modulo`: nombre del módulo de la tabla `modulos` que hace falta para entrar.
 *   Sin él la ruta solo pide sesión, como antes. Con él se comprueba el permiso de lectura,
 *   así que ya no basta con escribir la URL a mano para saltarse el menú.
 */
const ProtectedRoute = ({ children, requireAuth = true, modulo }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasModuleAccess, loading: cargandoPermisos } = usePermisos();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  // Timeout de seguridad para el estado de loading (aumentado a 20s)
  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), 20000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Si el loading se atascó, limpiar sesión y redirigir al login
  if (isLoading && timedOut) {
    console.warn("⚠️ [ProtectedRoute] Timeout de carga alcanzado, limpiando sesión");
    localStorage.removeItem("eva_auth_token");
    localStorage.removeItem("eva_user");
    return <Navigate to="/" replace />;
  }

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return <Cargando texto="Verificando autenticación..." />;
  }

  // Si requiere autenticación y no está autenticado, redirigir a login
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Si no requiere autenticación y está autenticado, redirigir a home
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  if (modulo) {
    // Los permisos llegan en una segunda petición: hasta que estén, no se puede
    // decidir, y negar aquí mostraría un "sin acceso" falso al recargar la página.
    if (cargandoPermisos) {
      return <Cargando texto="Cargando permisos..." />;
    }
    if (!hasModuleAccess(modulo)) {
      return <SinAcceso modulo={modulo} />;
    }
  }

  return children;
};

export default ProtectedRoute;
