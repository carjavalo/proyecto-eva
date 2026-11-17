import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./contexts/AuthContext";
import { AuthProvider as PermissionAuthProvider } from "./hooks/useAuth.jsx";
import { ToastProvider } from "./contexts/ToastContext";
import { EquipmentSearchProvider } from "./contexts/EquipmentSearchContext";
import { TicketsProvider } from "./contexts/TicketsContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { useLocation } from "react-router-dom";
import { useIdleTimeout } from "./hooks/useIdleTimeout";
import { toast } from "sonner";

import "./App.css";
// Componentes críticos (no lazy)
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// 🚀 Lazy loading de vistas para mejor rendimiento
const ContingenciesView = lazy(() => import("./components/contingencies-view"));
const HomePage = lazy(() => import("./components/HomePage"));
const LoginPage = lazy(() => import("./components/LoginPage"));
const ManualesView = lazy(() => import("./components/manuales-view"));
const MedicalDevicesView = lazy(() => import("./components/medical-devices-view"));
const PlanesMantenimientoView = lazy(() => import("./components/planes-mantenimiento-view"));
const PurchaseOrdersView = lazy(() => import("./components/purchase-orders-view"));
const ProfilePage = lazy(() => import("./components/ProfilePage"));
const MyTickets = lazy(() => import("./components/MyTickets"));
const ClosedTickets = lazy(() => import("./components/ClosedTickets"));
const DashboardView = lazy(() => import("./components/Dashboard"));
const DashboardUnificado = lazy(() => import("./components/DashboardUnificado"));
const ContactsView = lazy(() => import("./components/vista-contactos-principal"));
const VistaAreasPrincipal = lazy(() => import("./components/vista-areas-principal"));
const VistaPropietariosPrincipal = lazy(() => import("./components/vista-propietarios-principal"));
const VistaServiciosPrincipal = lazy(() => import("./components/vista-servicios-principal"));
const VistaTiposMantenimiento = lazy(() => import("./components/vista-tipos-mantenimiento"));
const Usuarios = lazy(() => import("./components/Usuarios"));
const IndustrialDevicesView = lazy(() => import("./components/IndustrialDevices"));
const GestionTickets = lazy(() => import("./components/GestionTickets"));
const EquiposBajas = lazy(() => import("./components/EquiposBajas"));
const GuiasRapidas = lazy(() => import("./components/GuiasRapidas"));
const RepuestosView = lazy(() => import("./components/RepuestosView"));
const CapacitacionesView = lazy(() => import("./components/CapacitacionesView"));
const ConsultaIndustrialView = lazy(() => import("./components/ConsultaIndustrialView"));
const VistaMateriales = lazy(() => import("./components/vista-materiales"));
const VistaSedes = lazy(() => import("./components/vista-sedes"));
const VistaEmpresasMantenimiento = lazy(() => import("./components/vista-empresas-mantenimiento"));
const DebugRegistration = lazy(() => import("./components/DebugRegistration"));
const CompleteDebugTest = lazy(() => import("./components/CompleteDebugTest"));
const LogoutPage = lazy(() => import("./components/LogoutPage"));
const ConfirmarCuenta = lazy(() => import("./pages/ConfirmarCuenta"));
const ReenviarVerificacion = lazy(() => import("./pages/ReenviarVerificacion"));
const VerificacionPendiente = lazy(() => import("./pages/VerificacionPendiente"));

// Componente de loading para páginas standalone (login, etc.)
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F1F4F6] to-[#1d293d]/5">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1d293d] mx-auto mb-4"></div>
      <p className="text-slate-600 text-sm">Cargando...</p>
    </div>
  </div>
);

// Componente de loading ligero para el área de contenido (sidebar/navbar se mantienen)
const ContentLoadingFallback = () => (
  <div className="flex items-center justify-center py-32">
    <div className="text-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1d293d] mx-auto mb-3"></div>
      <p className="text-slate-500 text-sm">Cargando módulo...</p>
    </div>
  </div>
);


// Componente que gestiona el timeout de sesión inactiva
function SessionIdleManager() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleIdle = React.useCallback(async () => {
    toast.warning("Tu sesión ha expirado por inactividad. Inicia sesión de nuevo.", { duration: 6000 });
    await logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  const { showWarning, secondsLeft, stayLoggedIn } = useIdleTimeout({
    idleMinutes: 30,
    warningMinutes: 2,
    onIdle: handleIdle,
    enabled: isAuthenticated,
  });

  if (!showWarning) return null;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center border border-amber-200">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Sesión a punto de expirar</h2>
        <p className="text-gray-600 text-sm mb-4">
          Por inactividad, tu sesión se cerrará automáticamente en:
        </p>
        <div className="text-4xl font-mono font-bold text-amber-600 mb-6">
          {mm}:{ss}
        </div>
        <div className="flex gap-3">
          <button
            onClick={stayLoggedIn}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Continuar sesión
          </button>
          <button
            onClick={handleIdle}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente interno que usa useLocation
function AppContent() {
  const location = useLocation();
  // Páginas que NO deben tener sidebar/navbar (standalone)
  const standalonePages = [
    "/",
    "/login",
    "/confirmar-cuenta",
    "/verificacion-pendiente",
    "/resend-verification"
  ];
  const isStandalonePage = standalonePages.some(page =>
    location.pathname === page || location.pathname.startsWith(page + "/")
  );

  return (
    <ErrorBoundary>
      {/* Gestor de timeout de sesión por inactividad */}
      <SessionIdleManager />
      {/* Rutas standalone sin sidebar/navbar */}
      {isStandalonePage ? (
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute requireAuth={false}>
                  <LoginPage />
                </ProtectedRoute>
              }
            />
          <Route
            path="/login"
            element={
              <ProtectedRoute requireAuth={false}>
                <LoginPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/confirmar-cuenta/:token"
            element={
              <ProtectedRoute requireAuth={false}>
                <ConfirmarCuenta />
              </ProtectedRoute>
            }
          />
          <Route
            path="/verificacion-pendiente"
            element={
              <ProtectedRoute requireAuth={false}>
                <VerificacionPendiente />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resend-verification"
            element={
              <ProtectedRoute requireAuth={false}>
                <ReenviarVerificacion />
              </ProtectedRoute>
            }
          />
          </Routes>
        </Suspense>
      ) : (
        /* Rutas con sidebar/navbar (layout principal) */
        <SidebarProvider>
          <ErrorBoundary>
            <Navbar />
          </ErrorBoundary>
          <SidebarInset className="bg-[#F1F4F6]">
            <div className="pt-16 bg-[#F1F4F6]">
              <Suspense fallback={<ContentLoadingFallback />}>
                <Routes>
                <Route
                  path="/perfil"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/salir"
                  element={
                    <ProtectedRoute>
                      <LogoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipos/contingencias"
                  element={
                    <ProtectedRoute modulo="contingencias">
                      <ContingenciesView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipos/manuales"
                  element={
                    <ProtectedRoute modulo="manuales">
                      <ManualesView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipos/biomedicos"
                  element={
                    <ProtectedRoute modulo="equipos">
                      <MedicalDevicesView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/planes/preventivo"
                  element={
                    <ProtectedRoute modulo="planes mantenimiento">
                      <PlanesMantenimientoView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/repuestos"
                  element={
                    <ProtectedRoute modulo="repuestos">
                      <RepuestosView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipos/industriales"
                  element={
                    <ProtectedRoute modulo="equipos industriales">
                      <IndustrialDevicesView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipos/bajas"
                  element={
                    <ProtectedRoute modulo="bajas biomedicos">
                      <EquiposBajas />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipos/guias-rapidas"
                  element={
                    <ProtectedRoute modulo="guias rapidas">
                      <GuiasRapidas />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipos/consultas"
                  element={
                    <ProtectedRoute>
                      <ConsultaIndustrialView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/equipos/ordenes-compra"
                  element={
                    <ProtectedRoute modulo="soportes compra">
                      <PurchaseOrdersView />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/ordenes/mis-tickets"
                  element={
                    <ProtectedRoute modulo="tickets propios">
                      <MyTickets />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ordenes/tickets-cerrados"
                  element={
                    <ProtectedRoute modulo="tickets cerrados">
                      <ClosedTickets />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ordenes/gestion-tickets"
                  element={
                    <ProtectedRoute modulo="tickets activos">
                      <GestionTickets />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/reportes"
                  element={
                    <ProtectedRoute modulo="reportes">
                      <DashboardUnificado />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/config/contactos"
                  element={
                    <ProtectedRoute modulo="contactos">
                      <ContactsView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/graficas"
                  element={
                    <ProtectedRoute>
                      <DashboardUnificado />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/config/areas"
                  element={
                    <ProtectedRoute modulo="areas">
                      <VistaAreasPrincipal />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/propietarios"
                  element={
                    <ProtectedRoute modulo="propietarios">
                      <AdminRoute>
                        <VistaPropietariosPrincipal />
                      </AdminRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/usuarios"
                  element={
                    <ProtectedRoute modulo="usuarios">
                      <AdminRoute>
                        <Usuarios />
                      </AdminRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={"/config/tipos-mantenimiento"}
                  element={
                    <ProtectedRoute>
                      <AdminRoute allowAdvanced={true}>
                        <VistaTiposMantenimiento />
                      </AdminRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/config/servicios"
                  element={
                    <ProtectedRoute modulo="servicios">
                      <VistaServiciosPrincipal />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/config/materiales"
                  element={
                    <ProtectedRoute>
                      <AdminRoute allowAdvanced={true}>
                        <VistaMateriales />
                      </AdminRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/config/sedes"
                  element={
                    <ProtectedRoute>
                      <AdminRoute allowAdvanced={true}>
                        <VistaSedes />
                      </AdminRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/config/empresas-mantenimiento"
                  element={
                    <ProtectedRoute>
                      <AdminRoute allowAdvanced={true}>
                        <VistaEmpresasMantenimiento />
                      </AdminRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/capacitaciones"
                  element={
                    <ProtectedRoute modulo="capacitaciones">
                      <CapacitacionesView />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/debug/register"
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <DebugRegistration />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/debug/complete"
                  element={
                    <ProtectedRoute requireAuth={false}>
                      <CompleteDebugTest />
                    </ProtectedRoute>
                  }
                />
              </Routes>
              </Suspense>
              <div className="mt-10">
                <Footer />
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      )}
    </ErrorBoundary>
  );
}

// Componente principal que envuelve todo en Router
export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ToastProvider>
          <AuthProvider>
            <PermissionAuthProvider>
              <EquipmentSearchProvider>
                <TicketsProvider>
                  <AppContent className="bg-gray-100" />
                </TicketsProvider>
              </EquipmentSearchProvider>
            </PermissionAuthProvider>
          </AuthProvider>
        </ToastProvider>
      </Router>
    </ErrorBoundary>
  );
}
