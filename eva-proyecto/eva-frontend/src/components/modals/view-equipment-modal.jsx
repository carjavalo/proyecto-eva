"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Settings,
  FileText,
  Download,
  Building,
  Wrench,
  Shield,
  DollarSign,
  User,
  AlertCircle,
  Info,
  Package,
  History,
  Clock,
  UserCheck,
  Eye,
  ExternalLink,
} from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { EquipmentLifecyclePDFCompact   } from "../pdf/equipment-lifecycle-pdf-compact";
import { MinimalTestPDF } from "../pdf/minimal-test-pdf";
import EquipmentModalReplicaPDF from "../pdf/equipment-modal-replica-pdf";
import { toast } from "sonner";
import httpService from "@/services/httpService";
import { resolverManualParaFicha } from "@/services/manualesService";
import { prefetchEquipmentData, prefetchUserHistory, prefetchEquipmentTickets, prefetchCambiosHdv, refreshEquipmentCache } from "@/services/equipmentPrefetchCache";
import { ManualSearchModal } from "./manual-search-modal";
import { QuickGuideSearchModal } from "./quick-guide-search-modal";
import TicketDetailsComplete from "./ticket-details-complete";

export function ViewEquipmentModal({
  open,
  onOpenChange,
  equipment,
  equipmentType = "biomedical", // "biomedical" | "industrial"
}) {
  const [equipmentDetails, setEquipmentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [cambiosHdv, setCambiosHdv] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [equipmentTickets, setEquipmentTickets] = useState([]);
  // La tabla muestra los más recientes y deja desplegar el resto: hay equipos con decenas de tickets
  const TICKETS_VISIBLES = 5;
  const [verTodosLosTickets, setVerTodosLosTickets] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showTicketDetailsModal, setShowTicketDetailsModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loadingTicketDetails, setLoadingTicketDetails] = useState(false);
  
  // Estados para modales de apoyo técnico
  const [showManualSearchModal, setShowManualSearchModal] = useState(false);
  const [showGuideSearchModal, setShowGuideSearchModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCambiosHdv, setShowCambiosHdv] = useState(false);

  // Estados para información completa de manuales y guías
  const [selectedManualInfo, setSelectedManualInfo] = useState(null);
  const [selectedGuideInfo, setSelectedGuideInfo] = useState(null);
  
  // Estado para imagen del equipo en base64
  const [equipmentImageBase64, setEquipmentImageBase64] = useState(null);

  // Control de generación de PDF a demanda para evitar caché indeseada o lags
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Función para obtener imagen en base64 usando el endpoint del backend (evita CORS)
  const getImageBase64FromBackend = async (filename) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api";
      const endpoint = `${apiUrl}/v1/equipos/image-base64/${filename}`;
      
      console.log('🌐 [BACKEND REQUEST] URL:', endpoint);
      
      const response = await fetch(endpoint);
      
      console.log('📡 [BACKEND RESPONSE] Status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [BACKEND ERROR] Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('📦 [BACKEND DATA]:', {
        success: data.success,
        hasData: !!data.data,
        hasBase64: !!data.data?.base64,
        size: data.data?.size,
        mimeType: data.data?.mime_type
      });
      
      if (data.success && data.data && data.data.base64) {
        console.log(`✅ Imagen obtenida del backend: ${(data.data.size / 1024).toFixed(2)} KB`);
        return data.data.base64;
      } else {
        console.warn('⚠️ [BACKEND] No hay imagen en la respuesta:', data.message);
        throw new Error(data.message || 'No se pudo obtener la imagen');
      }
    } catch (error) {
      console.error(`❌ [BACKEND ERROR] Error getting image:`, error);
      return null;
    }
  };

  // Function to fetch user history for equipment (PUBLIC ENDPOINT)
  const fetchUserHistory = async (equipmentId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/equipos/${equipmentId}/user-history`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUserHistory(data.data || []);
      } else {
        console.warn('API returned success: false for user history');
        setUserHistory([]);
      }
      
    } catch (error) {
      console.error('Error fetching user history:', error);
      setUserHistory([]);
    }
  };

  // Function to fetch cambios HDV (historial completo) for equipment (PUBLIC ENDPOINT)
  const fetchCambiosHdv = async (equipmentId) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/equipos/${equipmentId}/cambios-hdv`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setCambiosHdv(data.data || []);
      } else {
        console.warn('API returned success: false for cambios HDV');
        setCambiosHdv([]);
      }
      
    } catch (error) {
      console.error('Error fetching cambios HDV:', error);
      setCambiosHdv([]);
    }
  };

  // ✅ Función para cargar tickets asociados al equipo
  const fetchEquipmentTickets = async (equipmentId) => {
    setLoadingTickets(true);
    try {
      const response = await httpService.get('/v1/gestion-tickets', {
        params: {
          equipo_id: equipmentId,
          per_page: 300,
          page: 1
        }
      });

      if (response.data?.success && response.data?.data?.data) {
        // ✅ Construir descripción completa para cada ticket
        const ticketsArray = Array.isArray(response.data.data.data) 
          ? response.data.data.data 
          : [];
        
        const ESTADO_MAP = { 1: 'Abierto', 2: 'Asignado', 3: 'Diagnosticado', 4: 'Cerrado', 5: 'Esperando cierre' };
        const ticketsConDescripcionCompleta = ticketsArray.map(ticket => {
          let descripcionCompleta = '';
          
          // REPORTE INICIAL
          if (ticket.descripcion_problema || ticket.descripcion) {
            descripcionCompleta += `REPORTE: ${ticket.descripcion_problema || ticket.descripcion}`;
            if (ticket.fecha_inicio) {
              const fecha = new Date(ticket.fecha_inicio).toLocaleString('es-CO', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
              });
              descripcionCompleta += ` (Fecha: ${fecha})`;
            }
          }
          
          // DIAGNÓSTICO
          if (ticket.diagnostico) {
            if (descripcionCompleta) descripcionCompleta += ' | ';
            descripcionCompleta += `DIAGNÓSTICO: ${ticket.diagnostico}`;
            if (ticket.fecha_diagnostico) {
              const fecha = new Date(ticket.fecha_diagnostico).toLocaleString('es-CO', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
              });
              descripcionCompleta += ` (Fecha: ${fecha})`;
            }
          }
          
          // TRABAJO REALIZADO
          if (ticket.reparacion) {
            if (descripcionCompleta) descripcionCompleta += ' | ';
            descripcionCompleta += `TRABAJO REALIZADO: ${ticket.reparacion}`;
            if (ticket.fecha_fin) {
              const fecha = new Date(ticket.fecha_fin).toLocaleString('es-CO', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
              });
              descripcionCompleta += ` (Fecha: ${fecha})`;
            }
          }
          
          return {
            ...ticket,
            estado: ticket.estado || ticket.estado_nombre || ESTADO_MAP[ticket.estado_id] || 'Sin estado',
            descripcion_completa: descripcionCompleta || ticket.descripcion_problema || ticket.descripcion || 'Sin descripción'
          };
        });
        
        setEquipmentTickets(ticketsConDescripcionCompleta);
      } else {
        setEquipmentTickets([]);
      }
    } catch (error) {
      console.error('Error al cargar tickets del equipo:', error);
      setEquipmentTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  // Función para cargar detalles completos de un ticket individual
  const fetchTicketDetails = async (ticketId) => {
    setLoadingTicketDetails(true);
    try {
      const response = await httpService.get(`/v1/gestion-tickets/${ticketId}`);
      if (response.data?.success && response.data?.data) {
        setSelectedTicket(response.data.data);
        setShowTicketDetailsModal(true);
      } else {
        toast.error('No se pudieron cargar los detalles del ticket');
      }
    } catch (error) {
      console.error('Error al cargar detalles del ticket:', error);
      toast.error('Error al cargar los detalles del ticket');
    } finally {
      setLoadingTicketDetails(false);
    }
  };

  // Define fetchEquipmentDetailsPublic function first
  const fetchEquipmentDetailsPublic = async (equipmentId) => {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || "http://192.168.2.146:8001/api"}/v1/equipos/${equipmentId}/complete-info`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      setEquipmentDetails(data.data);
      // Load user history and cambios HDV after equipment details
      await fetchUserHistory(equipmentId);
      await fetchCambiosHdv(equipmentId);
    } else {
      throw new Error(data.message || "Error al obtener datos del equipo");
    }
  };

  // Define fetchEquipmentDetails function with useCallback
  const fetchEquipmentDetails = useCallback(async (equipmentId) => {
    setLoading(true);
    setError(null);

    try {
      // Auto-refresh: limpiar la caché de este equipo para SIEMPRE traer datos
      // frescos al abrir la hoja de vida (refleja especificaciones y demás cambios
      // sin tener que recargar la página).
      refreshEquipmentCache(equipmentId);

      // Cargar todo en paralelo (comparten una sola petición a complete-info por dedupe)
      const [cachedData, userHistoryData, cambiosHdvData] = await Promise.all([
        prefetchEquipmentData(equipmentId),
        prefetchUserHistory(equipmentId).catch(() => []),
        prefetchCambiosHdv(equipmentId).catch(() => []),
      ]);

      if (cachedData) {
        setEquipmentDetails(cachedData);
        setUserHistory(userHistoryData || []);
        setCambiosHdv(cambiosHdvData || []);
        return;
      }

      // Fallback: authenticated request
      const authToken =
        localStorage.getItem("eva_auth_token") ||
        localStorage.getItem("auth_token");

      if (authToken) {
        try {
          const response = await httpService.get(
            `/v1/equipos/${equipmentId}/complete-info`
          );
          if (response.data?.success) {
            setEquipmentDetails(response.data.data);
            setUserHistory(userHistoryData || []);
            setCambiosHdv(cambiosHdvData || []);
            return;
          }
        } catch (authError) {
          if (authError.response?.status === 401) {
            toast.error(
              "Error de autenticación. Intentando endpoint público..."
            );
          }
        }
      }

      // Fallback to public endpoint
      await fetchEquipmentDetailsPublic(equipmentId);
    } catch (err) {
      console.error("Error fetching equipment details:", err);
      setError("Error al cargar los detalles del equipo");
      toast.error("Error al cargar los detalles del equipo");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch complete equipment information when modal opens
  useEffect(() => {
    if (open && equipment?.id) {
      // ✅ Limpiar explicitamente los estados anteriores. 
      // Esto previene un bug donde se descargaba el PDF en caché de la visualización del equipo anterior.
      setEquipmentDetails(null);
      setEquipmentImageBase64(null);
      setEquipmentTickets([]);
      setUserHistory([]);
      setCambiosHdv([]);
      
      setImageError(false); // Reset image error state
      fetchEquipmentDetails(equipment.id);
      // Cargar tickets desde cache (en paralelo con el resto)
      setVerTodosLosTickets(false); // cada equipo arranca con la lista plegada
      setLoadingTickets(true);
      prefetchEquipmentTickets(equipment.id)
        .then(tickets => {
          const ESTADO_MAP = { 1: 'Abierto', 2: 'Asignado', 3: 'Diagnosticado', 4: 'Cerrado', 5: 'Esperando cierre' };
          const ticketsConDescripcion = (tickets || []).map(ticket => {
            let descripcionCompleta = '';
            if (ticket.descripcion_problema || ticket.descripcion) {
              descripcionCompleta += `REPORTE: ${ticket.descripcion_problema || ticket.descripcion}`;
              if (ticket.fecha_inicio) {
                const fecha = new Date(ticket.fecha_inicio).toLocaleString('es-CO', {
                  year: 'numeric', month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit'
                });
                descripcionCompleta += ` (Fecha: ${fecha})`;
              }
            }
            if (ticket.diagnostico) {
              if (descripcionCompleta) descripcionCompleta += ' | ';
              descripcionCompleta += `DIAGNÓSTICO: ${ticket.diagnostico}`;
            }
            if (ticket.reparacion) {
              if (descripcionCompleta) descripcionCompleta += ' | ';
              descripcionCompleta += `TRABAJO REALIZADO: ${ticket.reparacion}`;
            }
            return {
              ...ticket,
              estado: ticket.estado || ticket.estado_nombre || ESTADO_MAP[ticket.estado_id] || 'Sin estado',
              descripcion_completa: descripcionCompleta || ticket.descripcion_problema || ticket.descripcion || 'Sin descripción'
            };
          });
          setEquipmentTickets(ticketsConDescripcion);
        })
        .catch(() => setEquipmentTickets([]))
        .finally(() => setLoadingTickets(false));
    }
  }, [open, equipment?.id, fetchEquipmentDetails]);

  // Limpiar memoria cuando el modal se cierra
  useEffect(() => {
    if (!open) {
      setEquipmentDetails(null);
      setEquipmentImageBase64(null);
      setEquipmentTickets([]);
      setUserHistory([]);
      setCambiosHdv([]);
    }
  }, [open]);

  // Cargar información completa de manuales y guías cuando se cargan los detalles del equipo
  useEffect(() => {
    const loadAssociatedInfo = async () => {
      if (!equipmentDetails) return;

      // Limpiar estados previos
      setSelectedManualInfo(null);
      setSelectedGuideInfo(null);

      // Cargar información del manual si existe manual_id
      if (equipmentDetails.manual_id && equipmentDetails.manual_id !== 0) {
        try {
          // Se resuelve POR ID (ver manualesService): el listado pagina de a 10
          // sobre ~180 manuales y antes casi nunca encontraba el asociado.
          const manual = await resolverManualParaFicha(equipmentDetails.manual_id);
          if (manual) {
            setSelectedManualInfo(manual);
          } else {
            console.warn("📖 Manual no encontrado con ID:", equipmentDetails.manual_id);
          }
        } catch (error) {
          console.error("Error loading manual in view:", error);
        }
      }

      // Cargar información de la guía si existe guia_id
      if (equipmentDetails.guia_id && equipmentDetails.guia_id !== 0) {
        try {
          const response = await httpService.get(`/v1/guias-rapidas`);
          console.log("🚀 Respuesta completa de guías:", response.data);
          
          let guiasArray = [];
          
          // Manejar diferentes estructuras de respuesta
          if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
            // Estructura con paginación: { data: { data: [...] } }
            guiasArray = response.data.data.data;
          } else if (response.data?.data && Array.isArray(response.data.data)) {
            // Estructura simple: { data: [...] }
            guiasArray = response.data.data;
          } else if (Array.isArray(response.data)) {
            // Array directo: [...]
            guiasArray = response.data;
          }
          
          console.log("🚀 Array de guías procesado:", guiasArray);
          
          if (guiasArray.length > 0) {
            const guide = guiasArray.find(g => 
              g.id.toString() === equipmentDetails.guia_id.toString()
            );
            console.log("🚀 Guía encontrada:", guide);
            if (guide) {
              setSelectedGuideInfo(guide);
              console.log("🚀 Guía cargada en vista:", guide.name);
            } else {
              console.warn("🚀 Guía no encontrada con ID:", equipmentDetails.guia_id);
            }
          }
        } catch (error) {
          console.error("Error loading guide in view:", error);
        }
      }
    };

    loadAssociatedInfo();
  }, [equipmentDetails]);

  // Convertir imagen del equipo a base64 cuando se cargan los detalles
  useEffect(() => {
    const loadEquipmentImage = async () => {
      if (!equipmentDetails) {
        console.log('⚠️ No hay equipmentDetails, limpiando imagen');
        setEquipmentImageBase64(null);
        return;
      }

      console.log('🔍 [MODAL] Buscando imagen del equipo en:', {
        id: equipmentDetails.id,
        code: equipmentDetails.code,
        allFields: Object.keys(equipmentDetails)
      });

      // Buscar la URL de la imagen en diferentes campos posibles
      const imageFields = [
        equipmentDetails?.image_url,
        equipmentDetails?.imagen_url,
        equipmentDetails?.image,
        equipmentDetails?.imagen,
        equipmentDetails?.foto_url,
        equipmentDetails?.archivo_imagen,
        equipmentDetails?.foto
      ];

      console.log('🔍 [MODAL] Campos de imagen evaluados:', imageFields);

      const imageFileName = imageFields.find(field => field && field.trim() !== '');

      if (imageFileName) {
        console.log('📸 [MODAL] Valor de imagen encontrado:', imageFileName);
        
        try {
          // Extraer solo el nombre del archivo si es una URL completa
          let filename = imageFileName;
          
          if (imageFileName.includes('http://') || imageFileName.includes('https://')) {
            // Es una URL completa, extraer solo el nombre del archivo
            const urlParts = imageFileName.split('/');
            filename = urlParts[urlParts.length - 1];
            console.log('🔧 [MODAL] Extrayendo nombre de archivo de URL:', filename);
          } else if (imageFileName.includes('/')) {
            // Es una ruta relativa, extraer solo el nombre del archivo
            const pathParts = imageFileName.split('/');
            filename = pathParts[pathParts.length - 1];
            console.log('🔧 [MODAL] Extrayendo nombre de archivo de ruta:', filename);
          }
          
          console.log('📸 [MODAL] Nombre final del archivo:', filename);
          
          // Usar el endpoint del backend que evita problemas de CORS
          console.log('🔄 [MODAL] Obteniendo imagen desde el backend...');
          const base64Image = await getImageBase64FromBackend(filename);
          
          if (base64Image) {
            console.log(`✅ [MODAL] Imagen del equipo cargada exitosamente para PDF`);
            console.log(`📦 [MODAL] Tamaño de base64: ${(base64Image.length / 1024).toFixed(2)} KB`);
            console.log(`🔍 [MODAL] Validación de imagen:`, {
              isString: typeof base64Image === 'string',
              startsWithData: base64Image.startsWith('data:image/'),
              length: base64Image.length,
              preview: base64Image.substring(0, 50) + '...'
            });
            setEquipmentImageBase64(base64Image);
          } else {
            console.warn(`⚠️ [MODAL] No se pudo obtener la imagen: ${filename}`);
            setEquipmentImageBase64(null);
          }
        } catch (error) {
          console.error('❌ [MODAL] Error loading equipment image:', error);
          setEquipmentImageBase64(null);
        }
      } else {
        console.log('ℹ️ [MODAL] No se encontró campo de imagen en los datos del equipo');
        setEquipmentImageBase64(null);
      }
    };

    loadEquipmentImage();
  }, [equipmentDetails]);

  // Handle PDF download generating explicitly on click
  const handleDownloadPDF = async () => {
    let toastId = null;
    try {
      if (!equipmentDetails) {
        toast.error("Datos del equipo incompletos. Intente nuevamente.");
        return;
      }
      
      setIsGeneratingPDF(true);
      toastId = toast.loading("Generando PDF, por favor espere...", {
        position: "bottom-right",
      });

      // Preparar data exacta del equipo actual (limpia y sin caché)
      const pdfData = {
        ...equipmentDetails,
        selectedManualInfo,
        selectedGuideInfo,
        userHistory,
        equipmentTickets, // ✅ Incluir tickets
        equipmentImageBase64 // Incluir la imagen convertida a base64
      };

      // Generación a demanda (evita bug de PDFs cruzados)
      const blob = await pdf(<EquipmentModalReplicaPDF data={pdfData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `equipo_${equipmentDetails?.code || equipment?.id}_reporte.pdf`;
      link.click();
      
      // Limpiar memoria manualmente
      setTimeout(() => URL.revokeObjectURL(url), 500);
      
      // Manejar el cierre del loading
      if (toastId) toast.dismiss(toastId);
      toast.success("Reporte PDF descargado exitosamente");
      
    } catch (error) {
      console.error("Error in PDF download:", error);
      if (toastId) toast.dismiss(toastId);
      toast.error("Error al generar el PDF. Intente nuevamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Enhanced safe value function with better data handling
  const safeValue = (value, fallback = "No disponible") => {
    if (value === null || value === undefined || value === "") return fallback;
    if (value === 0) return "0"; // Handle zero values properly
    if (typeof value === "boolean") return value ? "Sí" : "No";
    if (typeof value === "object" && value !== null) {
      if (value.name) return value.name;
      if (value.nombre) return value.nombre;
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Enhanced date formatting with better error handling
  const formatDate = (date, fallback = "No disponible") => {
    if (!date || date === null || date === undefined || date === "")
      return fallback;
    
    try {
      if (typeof date === "string" && date.includes("-")) {
        // Si es solo fecha (YYYY-MM-DD), agregar T00:00:00 para interpretar como local
        const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + 'T00:00:00') : new Date(date);
        return d.toLocaleDateString("es-ES");
      }
      if (typeof date === "number") {
        return new Date(date).toLocaleDateString("es-ES");
      }
      return String(date);
    } catch (error) {
      console.warn("Error formatting date:", date, error);
      return fallback;
    }
  };

  const formatYear = (date, fallback = "No disponible") => {
    if (!date || date === null || date === undefined || date === "")
      return fallback;
    
    try {
      const s = String(date);
      const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
      const year = d.getFullYear();
      return isNaN(year) ? fallback : String(year);
    } catch (error) {
      console.warn("Error formatting year:", date, error);
      return fallback;
    }
  };

  // Handle manual selection (read-only modal, no actual selection)
  const handleSelectManual = (manual) => {
    console.log("Manual selection in view modal (read-only):", manual);
    // In view modal, this is just for logging/debugging
    // The modal will close automatically
  };

  // Handle guide selection (read-only modal, no actual selection)
  const handleSelectGuide = (guide) => {
    console.log("Guide selection in view modal (read-only):", guide);
    // In view modal, this is just for logging/debugging
    // The modal will close automatically
  };

  // Calculate age function
  const calculateAge = (fabricationDate) => {
    if (!fabricationDate) return "No disponible";
    try {
      const today = new Date();
      const fabDate = new Date(fabricationDate);
      const years = today.getFullYear() - fabDate.getFullYear();
      return `${years} años`;
    } catch {
      return "No calculable";
    }
  };

  // Handlers para manuales y guías (solo visualización en modal de vista)
  const handleViewManual = () => {
    const manualId = equipmentDetails?.manual_id;
    if (!manualId) {
      toast.error("No hay manual asociado a este equipo");
      return;
    }

    // Para el modal de vista, abrir modal de búsqueda para ver detalles
    setShowManualSearchModal(true);
  };

  const handleViewGuide = () => {
    const guideId = equipmentDetails?.guia_id;
    if (!guideId) {
      toast.error("No hay guía rápida asociada a este equipo");
      return;
    }

    // Para el modal de vista, abrir modal de búsqueda para ver detalles
    setShowGuideSearchModal(true);
  };

  // Use equipment details if available, otherwise fallback to passed equipment
  const displayData = equipmentDetails || equipment;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] xl:max-w-[1400px] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-gray-300 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building className="h-6 w-6" style={{color: '#1d293d'}} />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-800">
                  FORMATO DE HOJA DE VIDA PARA EQUIPOS{" "}
                  {equipmentType === "industrial"
                    ? "INDUSTRIALES"
                    : "BIOMÉDICOS"}
                </DialogTitle>
                <p className="text-sm text-gray-600">
                  Hospital Universitario del Valle Evaristo García
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownloadPDF}
              disabled={!equipmentDetails || isGeneratingPDF}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? "Generando..." : "Descargar PDF"}
            </Button>
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">
              Cargando información del equipo...
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">Error</span>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {displayData && (
          <div className="max-h-[70vh] overflow-y-auto">
            {/* HEADER IDÉNTICO AL PDF */}
            <div className="flex items-center justify-between p-6 border-b-2 bg-white" style={{borderBottomColor: '#1d293d'}}>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 flex-shrink-0">
                  <img 
                    src="/images/logo_huv.jpg" 
                    alt="Hospital Universitario del Valle"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
                <div className="text-center flex-1">
                  <h1 className="text-xl font-bold text-gray-800 mb-1">
                    HOSPITAL UNIVERSITARIO DEL VALLE "EVARISTO GARCÍA"
                  </h1>
                  <p className="text-lg text-gray-800 font-medium">
                    HOJA DE VIDA - {safeValue(displayData.name?.toUpperCase())}
                  </p>
                  <p className="text-sm text-gray-600">
                    Sistema de Gestión EVA - Electromedicina
                  </p>
                </div>
              </div>
            </div>

            {/* SECCIÓN DE EQUIPO CON IMAGEN */}
            <div className="flex gap-6 p-6 bg-gray-50 border-b">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  {safeValue(displayData.name)}
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>ID:</strong> {safeValue(displayData.id)}</div>
                  <div><strong>Código:</strong> {safeValue(displayData.code)}</div>
                  <div><strong>Serie:</strong> {safeValue(displayData.serial)}</div>
                  <div><strong>Marca:</strong> {safeValue(displayData.marca)}</div>
                  <div><strong>Modelo:</strong> {safeValue(displayData.modelo)}</div>
                  <div><strong>Estado:</strong> {safeValue(displayData.estado_nombre)}</div>
                </div>
              </div>
              <div className="w-24 h-24 border border-gray-300 rounded flex items-center justify-center bg-white">
                {displayData.image && !imageError ? (
                  <img
                    src={displayData.image_url || displayData.image}
                    alt={displayData.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                    onLoad={() => setImageError(false)}
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <FileText className="h-8 w-8" />
                    <span className="text-xs">Sin imagen</span>
                  </div>
                )}
              </div>
            </div>

            {/* INFORMACIÓN GENERAL Y UBICACIÓN - ESTILO TABULAR EXCEL */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                INFORMACIÓN GENERAL Y UBICACIÓN
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">ID del Equipo</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.id)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Código</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.code)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Serie</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.serial)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Estado</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.estado_nombre)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Sede</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.sede_nombre)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Servicio</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.servicio_nombre)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Área</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.area_nombre)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Piso</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.piso)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* CARACTERÍSTICAS TÉCNICAS - ESTILO TABULAR EXCEL */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                CARACTERÍSTICAS TÉCNICAS Y ESPECIFICACIONES
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Marca</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.marca)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Modelo</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.modelo)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Potencia</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.potencia)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Corriente</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.corriente)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Centro de Costo</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">
                        {displayData.centro_costo
                          ? (displayData.centro_costo_nombre
                              ? `${displayData.centro_costo} - ${displayData.centro_costo_nombre}`
                              : displayData.centro_costo)
                          : safeValue(null)}
                      </td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Frecuencia</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.frecuencia)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Año Fabricación</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{formatYear(displayData.fecha_fabricacion)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Garantía</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.garantia)} años</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Vida Útil</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.vida_util)} años</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Voltaje</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.voltaje || displayData.v1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lista completa de especificaciones técnicas registradas del equipo */}
              {displayData.especificaciones && displayData.especificaciones.length > 0 && (
                <div className="border border-gray-300 border-t-0">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left w-1/2">Especificación</th>
                        <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.especificaciones.map((esp, i) => (
                        <tr key={esp.id || i}>
                          <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
                            {safeValue(esp.especificacion_nombre || esp.nombre)}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">
                            {safeValue(esp.valor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* PLAN DE EJECUCIÓN - NUEVA SECCIÓN */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                PLAN DE EJECUCIÓN
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Incluido en Plan</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">
                        {displayData.incluido_en_plan > 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            Incluido en Plan {displayData.anio_vigente || 'Vigente'}
                          </Badge>
                        ) : (
                          <span className="text-gray-500">No incluido</span>
                        )}
                      </td>
                    </tr>
                    {displayData.incluido_en_plan > 0 && (
                      <>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Responsable</td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.responsable_plan)}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Frecuencia</td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.frecuencia_plan || displayData.frecuencia)}</td>
                        </tr>
                        {(displayData.mes_programado1 || displayData.mes_programado2 || displayData.mes_programado3) && (
                          <tr>
                            <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Meses Programados</td>
                            <td className="border border-gray-200 px-3 py-2 text-sm">
                              <div className="space-y-1">
                                {displayData.mes_programado1 && (
                                  <div>
                                    <span className="font-medium">Fecha 1:</span>{' '}
                                    <span className="text-emerald-700">
                                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][displayData.mes_programado1 - 1]}
                                    </span>
                                  </div>
                                )}
                                {displayData.mes_programado2 && (
                                  <div>
                                    <span className="font-medium">Fecha 2:</span>{' '}
                                    <span className="text-emerald-700">
                                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][displayData.mes_programado2 - 1]}
                                    </span>
                                  </div>
                                )}
                                {displayData.mes_programado3 && (
                                  <div>
                                    <span className="font-medium">Fecha 3:</span>{' '}
                                    <span className="text-emerald-700">
                                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][displayData.mes_programado3 - 1]}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* EVALUACIÓN DE DESEMPEÑO - NUEVA SECCIÓN */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                EVALUACIÓN DE DESEMPEÑO
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Evaluación de Desempeño</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.evaluacion_desempenio)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Calibración</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.calibracion)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Periodicidad</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.periodicidad)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* INFORMACIÓN REGULATORIA Y FECHAS CRÍTICAS - ESTILO TABULAR EXCEL */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                INFORMACIÓN REGULATORIA Y FECHAS CRÍTICAS
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Reg. INVIMA</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span>{safeValue(displayData.invima || displayData.numero_invima || displayData.registro_sanitario_invima)}</span>
                          {(displayData.invima_archivo || displayData.archivo_registro_sanitario) && (
                            <button
                              type="button"
                              onClick={() => {
                                const archivo = displayData.invima_archivo || displayData.archivo_registro_sanitario;
                                const base = import.meta.env.VITE_API_BASE_URL || "http://192.168.2.146:8001";
                                window.open(`${base}/storage/registros_sanitarios/${archivo}`, "_blank");
                              }}
                              className="inline-flex items-center justify-center w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                              title="Ver archivo del registro INVIMA"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Estado INVIMA</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.invima_estado || displayData.estado_invima)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">F. Adquisición</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{formatDate(displayData.fecha_ad)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">F. Fabricación</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{formatDate(displayData.fecha_fabricacion)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">F. Instalación</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{formatDate(displayData.fecha_instalacion)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">F. Operación</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{formatDate(displayData.fecha_inicio_operacion)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">F. Venc. Garantía</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm" colSpan="3">{formatDate(displayData.fecha_vencimiento_garantia)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* INFORMACIÓN FINANCIERA Y CONTRACTUAL - ESTILO TABULAR EXCEL */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                INFORMACIÓN FINANCIERA Y CONTRACTUAL
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Costo</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.costo)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Propietario</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.propietario_nombre)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Propiedad</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.propiedad)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Comodato</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.activo_comodato)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* MANTENIMIENTOS PREVENTIVOS RECIENTES - ESTILO TABULAR EXCEL */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                MANTENIMIENTOS PREVENTIVOS RECIENTES
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Número de Preventivo</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Fecha</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Observación</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Estado</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-center">Archivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.mantenimientos_preventivos && displayData.mantenimientos_preventivos.length > 0 ? (
                      displayData.mantenimientos_preventivos.map((mant, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800">{mant.description || '-'}</td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">{formatDate(mant.fecha_mantenimiento || mant.fecha_programada)}</td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">
                            {mant.observacion ? (mant.observacion.length > 80 ? mant.observacion.substring(0, 80) + '...' : mant.observacion) : 'Sin observación'}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">
                            <Badge className={mant.status === 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {mant.status === 1 ? 'Completado' : 'Pendiente'}
                            </Badge>
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-center">
                            {mant.file ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.2.146:8001'}/storage/mantenimientos/${mant.file.replace(/^mantenimientos\//, '')}`, '_blank')}
                                className="text-green-600 hover:bg-green-100 h-7 px-2"
                                title="Ver archivo de mantenimiento"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin archivo</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="border border-gray-200 px-3 py-4 text-center italic text-gray-500">
                          No hay mantenimientos preventivos registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CALIBRACIONES RECIENTES - ESTILO TABULAR EXCEL */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                CALIBRACIONES RECIENTES
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">ID Calibración</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Fecha Ejecución</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Fecha Programada</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-center">Archivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.calibraciones && displayData.calibraciones.length > 0 ? (
                      displayData.calibraciones.map((cal, index) => (
                        <tr key={index}>
                          <td className="border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800">{safeValue(cal.description || cal.tipo_calibracion)}</td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">{formatDate(cal.fecha_calibracion)}</td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">{formatDate(cal.fecha_programada || cal.proxima_calibracion)}</td>
                          <td className="border border-gray-200 px-3 py-2 text-center">
                            {cal.file ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.2.146:8001'}/storage/calibraciones/${cal.file.replace(/^calibraciones\//, '')}`, '_blank')}
                                className="text-blue-600 hover:bg-blue-100 h-7 px-2"
                                title="Ver archivo de calibración"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin archivo</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-gray-200 px-3 py-4 text-center italic text-gray-500">
                          No hay calibraciones registradas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TICKETS/MANTENIMIENTOS CORRECTIVOS ASOCIADOS - ESTILO TABULAR EXCEL */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                MANTENIMIENTOS CORRECTIVOS / TICKETS
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">ID Ticket</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Descripción</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Estado</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Archivo</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTickets ? (
                      <tr>
                        <td colSpan={5} className="border border-gray-200 px-3 py-4 text-center text-gray-500">
                          Cargando tickets...
                        </td>
                      </tr>
                    ) : equipmentTickets && equipmentTickets.length > 0 ? (
                      (verTodosLosTickets ? equipmentTickets : equipmentTickets.slice(0, TICKETS_VISIBLES)).map((ticket, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800">
                            #{ticket.id}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">
                            {ticket.descripcion_completa 
                              ? (ticket.descripcion_completa.length > 150 
                                  ? ticket.descripcion_completa.substring(0, 150) + '...' 
                                  : ticket.descripcion_completa)
                              : (ticket.descripcion_problema || ticket.descripcion || 'Sin descripción')}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">
                            {(() => {
                              const estadoId = Number(ticket.estado_id);
                              const estadoTxt = ticket.estado || ticket.estado_nombre || (
                                estadoId === 1 ? 'Abierto' :
                                estadoId === 2 ? 'Asignado' :
                                estadoId === 3 ? 'Diagnosticado' :
                                estadoId === 4 ? 'Cerrado' :
                                estadoId === 5 ? 'Esperando cierre' : 'Sin estado'
                              );
                              const cls =
                                estadoId === 1 ? 'bg-red-100 text-red-800' :
                                estadoId === 2 ? 'bg-yellow-100 text-yellow-800' :
                                estadoId === 3 ? 'bg-blue-100 text-blue-800' :
                                estadoId === 4 ? 'bg-green-100 text-green-800' :
                                estadoId === 5 ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800';
                              return <Badge className={cls}>{estadoTxt}</Badge>;
                            })()}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">
                            {(() => {
                              // Un ticket puede traer la evidencia del reporte, el soporte del
                              // diagnóstico y la orden de cierre. Antes solo se miraba el cierre,
                              // así que los otros dos aparecían como «Sin archivo».
                              const archivos = [
                                { campo: ticket.image, etiqueta: 'Evidencia' },
                                { campo: ticket.file_diagnostico, etiqueta: 'Diagnóstico' },
                                { campo: ticket.file_cierre, etiqueta: 'Cierre' },
                              ].filter((a) => a.campo && String(a.campo).trim() !== '');

                              if (archivos.length === 0) {
                                return <span className="text-gray-400 text-xs">Sin archivo</span>;
                              }

                              const base = import.meta.env.VITE_API_BASE_URL || 'http://192.168.2.146:8001';

                              return (
                                <div className="flex flex-wrap gap-1">
                                  {archivos.map((a) => (
                                    <Button
                                      key={a.etiqueta}
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => window.open(`${base}/storage/correctivos_generales/${String(a.campo).replace(/^correctivos_generales\//, '')}`, '_blank')}
                                      className="text-gray-800 hover:bg-gray-100 h-7 px-2"
                                      title={`Ver archivo de ${a.etiqueta.toLowerCase()}`}
                                    >
                                      <ExternalLink className="w-4 h-4 mr-1" />
                                      {a.etiqueta}
                                    </Button>
                                  ))}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fetchTicketDetails(ticket.id)}
                              disabled={loadingTicketDetails}
                              className="h-7 px-3"
                              title="Ver detalles del ticket"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {loadingTicketDetails ? 'Cargando...' : 'Ver Detalles'}
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="border border-gray-200 px-3 py-4 text-center italic text-gray-500">
                          No hay tickets asociados a este equipo
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {equipmentTickets.length > TICKETS_VISIBLES && (
                <div className="border border-t-0 border-gray-300 bg-gray-50 px-3 py-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setVerTodosLosTickets((v) => !v)}
                    className="text-gray-700 hover:bg-gray-100"
                  >
                    {verTodosLosTickets
                      ? `Ver solo los ${TICKETS_VISIBLES} más recientes`
                      : `Ver los ${equipmentTickets.length} tickets del equipo`}
                  </Button>
                </div>
              )}
            </div>

            {/* CORRECTIVOS GENERALES - NUEVA SECCIÓN */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                CORRECTIVOS GENERALES
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left w-[20%]">Código / Orden</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left w-[20%]">F. Inicio</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left w-[50%]">Descripción Cierre</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-center w-[10%]">Archivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.correctivos_generales && displayData.correctivos_generales.length > 0 ? (
                      displayData.correctivos_generales.map((correctivo, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800">
                            {correctivo.code_orden || `-`} / {correctivo.orden || `-`}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">
                            {formatDate(correctivo.fecha_inicio)}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">
                            <div className="flex flex-col gap-1 items-start">
                              {correctivo.descripcion_codigo ? (
                                <Badge className="bg-blue-100 text-blue-800 text-xs text-left whitespace-normal mb-1">
                                  {correctivo.codigo_cierre} - {correctivo.descripcion_codigo}
                                </Badge>
                              ) : (
                                <span className="text-gray-400">Pendiente</span>
                              )}
                              
                              {correctivo.description && (
                                <p className="text-xs text-gray-700 leading-tight mb-1 font-medium italic bg-gray-50 p-1 rounded border border-gray-100 w-full">
                                  {correctivo.description}
                                </p>
                              )}

                              <span className="text-xs text-gray-600 mt-1">
                                <strong>F. Cierre:</strong> {formatDate(correctivo.fecha_mantenimiento)}
                              </span>
                            </div>
                          </td>
                          <td className="border border-gray-200 px-3 py-2">
                            <div className="flex flex-col gap-1 items-center">
                              {correctivo.file && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.2.146:8001'}/storage/correctivos_generales/${correctivo.file.split('/').pop()}`, '_blank')}
                                  className="text-gray-800 hover:bg-gray-100 h-7 px-2 w-full"
                                  title="Ver archivo principal"
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Principal
                                </Button>
                              )}
                              {correctivo.archivos && correctivo.archivos.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 justify-center">
                                  {correctivo.archivos.map((arch) => (
                                    <a
                                      key={arch.id}
                                      href={`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.2.146:8001'}/storage/correctivos_generales/${arch.file}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={arch.titulo || arch.file}
                                      className="flex items-center gap-1 px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-indigo-600 hover:bg-indigo-100 transition-colors text-[10px] max-w-[120px]"
                                    >
                                      <FileText className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{arch.titulo || arch.file}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                              {!correctivo.file && (!correctivo.archivos || correctivo.archivos.length === 0) && (
                                <span className="text-gray-400 text-xs">Sin archivos</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-gray-200 px-3 py-4 text-center italic text-gray-500">
                          No hay correctivos generales registrados para este equipo
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* OBSERVACIONES DEL EQUIPO - NUEVA SECCIÓN */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                OBSERVACIONES DEL EQUIPO
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Fecha</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Usuario</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Descripción</th>
                      <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-center">Archivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.observaciones && displayData.observaciones.length > 0 ? (
                      displayData.observaciones.map((obs, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-3 py-2 text-sm">{formatDate(obs.created_at || obs.fecha_nota)}</td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(obs.usuario_nombre || 'Usuario')}</td>
                          <td className="border border-gray-200 px-3 py-2 text-sm">
                            {obs.description ? (obs.description.length > 100 ? obs.description.substring(0, 100) + '...' : obs.description) : 'Sin descripción'}
                          </td>
                          <td className="border border-gray-200 px-3 py-2 text-center">
                            {obs.file ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const base = import.meta.env.VITE_API_BASE_URL || 'http://192.168.2.146:8001';
                                  // El controller guarda 'observaciones/<archivo>' - normalizamos para evitar duplicar el segmento
                                  const raw = String(obs.file || '').replace(/^\/+/, '');
                                  const path = raw.startsWith('observaciones/') ? raw : `observaciones/${raw}`;
                                  window.open(`${base}/storage/${path}`, '_blank');
                                }}
                                className="text-purple-600 hover:bg-purple-100 h-7 px-2"
                                title="Ver archivo de observación"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin archivo</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-gray-200 px-3 py-4 text-center italic text-gray-500">
                          No hay observaciones registradas para este equipo
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CONTINGENCIAS DEL EQUIPO - NUEVA SECCIÓN */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white bg-orange-600 px-4 py-2 mb-0">
                CONTINGENCIAS / EVENTOS
              </h3>
              <div className="border border-orange-300">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-orange-100">
                      <th className="border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-800 text-left">Fecha</th>
                      <th className="border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-800 text-left">Usuario</th>
                      <th className="border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-800 text-left">Observación</th>
                      <th className="border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-800 text-center">Archivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.contingencias && displayData.contingencias.length > 0 ? (
                      displayData.contingencias.map((cont, index) => (
                        <tr key={index} className="hover:bg-orange-50">
                          <td className="border border-orange-200 px-3 py-2 text-sm">
                            {formatDate(cont.fecha || cont.created_at)}
                          </td>
                          <td className="border border-orange-200 px-3 py-2 text-sm">
                            {cont.usuario_nombre 
                              ? `${cont.usuario_nombre} ${cont.usuario_apellido || ''}`.trim()
                              : 'Usuario'}
                          </td>
                          <td className="border border-orange-200 px-3 py-2 text-sm">
                            {cont.observacion 
                              ? (cont.observacion.length > 150 
                                  ? cont.observacion.substring(0, 150) + '...' 
                                  : cont.observacion)
                              : 'Sin observación'}
                          </td>
                          <td className="border border-orange-200 px-3 py-2 text-center">
                            {cont.file ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.56.1:8001'}/storage/contingencias/${cont.file}`, '_blank')}
                                className="text-orange-600 hover:bg-orange-100 h-7 px-2"
                                title="Ver archivo de contingencia"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin archivo</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-orange-200 px-3 py-4 text-center italic text-gray-500">
                          No hay contingencias registradas para este equipo
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DOCUMENTOS ASOCIADOS - ESTILO TABULAR EXCEL CON ENLACES FUNCIONALES */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                DOCUMENTOS ASOCIADOS
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-gray-300">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Nombre</th>
                        <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Tipo de Documento</th>
                        <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-left">Fecha</th>
                        <th className="border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 text-center">Archivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.documentos && displayData.documentos.length > 0 ? (
                        displayData.documentos.map((doc, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(doc.nombre_archivo)}</td>
                            <td className="border border-gray-200 px-3 py-2 text-sm">
                              {doc.tipo_personalizado ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Personalizado</span>
                                  {safeValue(doc.tipo_personalizado)}
                                </span>
                              ) : (
                                safeValue(doc.tipo_documento)
                              )}
                            </td>
                            <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(doc.fecha_documento)}</td>
                            <td className="border border-gray-200 px-3 py-2 text-center">
                              {doc.vinculo ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.56.1:8001'}/storage/equipos/archivos/${doc.vinculo}`, '_blank')}
                                  className="text-gray-800 hover:bg-gray-100 h-7 px-2"
                                  title="Ver documento"
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                              ) : (
                                <span className="text-gray-400 text-xs">Sin archivo</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="border border-gray-200 px-3 py-4 text-center italic text-gray-500">
                            No hay documentos asociados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-4">
                  {/* Documentación Asociada con Enlaces Funcionales */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-0 bg-gray-50 px-4 py-3 border border-gray-200 rounded-t">
                      📚 Documentación Asociada
                    </h4>
                    <div className="space-y-5 border border-gray-300 border-t-0 p-5 rounded-b bg-white">
                      {/* Manual Asociado */}
                      <div className="space-y-2">
                        <div className="text-gray-700 text-sm font-semibold mb-2">
                          📖 Manual Asociado:
                        </div>
                        {selectedManualInfo ? (
                          <div className="flex items-center gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
                            <Badge className="bg-green-100 text-green-800 px-3 py-1.5 text-sm">
                              {selectedManualInfo.descripcion}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(selectedManualInfo.url, "_blank")}
                              className="text-green-600 hover:bg-green-200 h-8 w-8 p-0 flex-shrink-0 ml-auto"
                              title="Ver manual"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : displayData.manual_id ? (
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <Badge className="bg-yellow-100 text-yellow-800">Cargando manual...</Badge>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <span className="text-gray-500 text-sm">Sin manual asociado</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Guía Rápida Asociada */}
                      <div className="space-y-2">
                        <div className="text-gray-700 text-sm font-semibold mb-2">
                          🚀 Guía Rápida Asociada:
                        </div>
                        {selectedGuideInfo ? (
                          <div className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg border border-purple-200">
                            <Badge className="bg-purple-100 text-purple-800 px-3 py-1.5 text-sm">
                              {selectedGuideInfo.name}
                            </Badge>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const fileUrl = `${import.meta.env.VITE_API_BASE_URL || "http://192.168.2.146:8001"}/storage/guias/${selectedGuideInfo.file}`;
                                window.open(fileUrl, "_blank");
                              }}
                              className="text-purple-600 hover:bg-purple-200 h-8 w-8 p-0 flex-shrink-0 ml-auto"
                              title="Ver guía rápida"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : displayData.guia_id ? (
                          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <Badge className="bg-yellow-100 text-yellow-800">Cargando guía...</Badge>
                          </div>
                        ) : (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <span className="text-gray-500 text-sm">Sin guía rápida asociada</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Accesorios */}
                      <div className="pt-4 border-t border-gray-300">
                        <div className="text-gray-700 text-sm font-semibold mb-3">
                          Accesorios:
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div 
                            className="text-gray-600 text-sm leading-relaxed"
                            dangerouslySetInnerHTML={{
                              __html: displayData.accesorios || "No especificados"
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* INFORMACIÓN ADICIONAL - ESTILO TABULAR EXCEL */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-white px-4 py-2 mb-0" style={{backgroundColor: '#1d293d'}}>
                INFORMACIÓN ADICIONAL
              </h3>
              <div className="border border-gray-300">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Verificación Inventario</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.verificacion_inventario)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 w-1/4">Código Antiguo</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.codigo_antiguo)}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Repuesto Pendiente</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.repuesto_pendiente)}</td>
                      <td className="border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">Plan Mantenimiento</td>
                      <td className="border border-gray-200 px-3 py-2 text-sm">{safeValue(displayData.plan)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* BOTONES VER HISTORIAL FUERA DEL FORMATO PDF */}
            <div className="p-6 bg-gray-50">
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => setShowHistory(!showHistory)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                >
                  <History className="h-4 w-4 mr-2" />
                  {showHistory ? 'Ocultar Historial de Usuarios' : 'Ver Historial de Usuarios'}
                </Button>
                <Button
                  onClick={() => setShowCambiosHdv(!showCambiosHdv)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {showCambiosHdv ? 'Ocultar Historial de Cambios' : 'Ver Historial de Cambios'}
                </Button>
              </div>
            </div>

            {/* HISTORIAL DE USUARIOS CON ANIMACIÓN */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showHistory ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-6 bg-white border-t">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                  📋 HISTORIAL DE ACTIVIDAD DE USUARIOS
                </h3>
                
                {userHistory?.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {userHistory.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex-shrink-0 mt-1">
                          {entry.tipo === 'observacion' ? (
                            <UserCheck className="h-4 w-4 text-gray-800" />
                          ) : (
                            <FileText className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {entry.usuario}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {new Date(entry.fecha).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">{entry.accion}:</span> {entry.detalle}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">
                      No hay actividad registrada para este equipo
                    </p>
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-gray-800" />
                    <p className="text-xs text-gray-800">
                      <strong>Nota:</strong> Este historial muestra las últimas actividades de usuarios que han agregado observaciones o documentos a este equipo.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* HISTORIAL DE CAMBIOS DE HOJA DE VIDA CON ANIMACIÓN */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showCambiosHdv ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="p-6 bg-white border-t">
                <h3 className="text-lg font-bold text-purple-800 mb-4 border-b border-purple-200 pb-2">
                  📝 HISTORIAL COMPLETO DE CAMBIOS DEL EQUIPO
                </h3>
                
                {cambiosHdv?.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cambiosHdv.map((cambio) => (
                      <div key={cambio.id} className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200">
                        <div className="flex-shrink-0 mt-1">
                          <FileText className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-purple-600" />
                              <p className="text-sm font-medium text-gray-900">
                                {cambio.responsable_nombre || 'Sistema'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {cambio.fecha_formateada || new Date(cambio.fecha).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {cambio.descripcion}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">
                      No hay cambios registrados en la hoja de vida de este equipo
                    </p>
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-purple-600" />
                    <p className="text-xs text-purple-700">
                      <strong>Nota:</strong> Este historial registra automáticamente todos los cambios realizados al equipo, incluyendo ediciones de información, agregado/edición/eliminación de preventivos, calibraciones, correctivos y tickets.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Notice */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg m-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h4 className="font-semibold text-yellow-800">
                    Modo Solo Lectura
                  </h4>
                  <p className="text-sm text-yellow-700">
                    Esta vista es de solo consulta. Los datos se obtienen
                    directamente de la base de datos del sistema EVA.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Modal de búsqueda de manuales */}
      <ManualSearchModal
        open={showManualSearchModal}
        onOpenChange={setShowManualSearchModal}
        onSelectManual={handleSelectManual}
      />

      {/* Modal de búsqueda de guías */}
      <QuickGuideSearchModal
        open={showGuideSearchModal}
        onOpenChange={setShowGuideSearchModal}
        onSelectGuide={handleSelectGuide}
      />

      {/* Modal de detalles del ticket */}
      {showTicketDetailsModal && selectedTicket && (
        <TicketDetailsComplete
          isOpen={showTicketDetailsModal}
          onClose={() => {
            setShowTicketDetailsModal(false);
            setSelectedTicket(null);
            setSelectedTicketId(null);
            // Recargar tickets después de cerrar el modal por si hubo cambios
            if (equipment?.id) {
              fetchEquipmentTickets(equipment.id);
            }
          }}
          ticket={selectedTicket}
          readOnly={true}
          onRefresh={() => {
            // Recargar el ticket individual si se necesita
            if (selectedTicket?.id) {
              fetchTicketDetails(selectedTicket.id);
            }
          }}
        />
      )}
    </Dialog>
  );
}
