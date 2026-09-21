"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import authService from "../../services/authService";
import httpService from "../../services/httpService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import RichTextarea from "../ui/rich-textarea";
import { sanitizeRichHtml } from "@/utils/sanitizeRichText";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Building,
  Calendar,
  MapPin,
  Wrench,
  ClipboardList,
  Search,
  X,
  FileText,
  Camera,
  PenTool,
  Upload,
  User,
} from "lucide-react";
import DigitalSignatureModal from "./digital-signature-modal";
import EvidenceUploadModal from "./evidence-upload-modal";
import EquipmentSearchModal from "./equipment-search-modal";
import SearchableSelect from "../ui/searchable-select";

export default function HospitalTicketModal({
  isOpen,
  onClose,
  ticketType: initialTicketType = "biomedico",
  onSuccess,
}) {

  const [ticketType, setTicketType] = useState(initialTicketType);
  useEffect(() => {
    if (isOpen) setTicketType(initialTicketType);
  }, [isOpen, initialTicketType]);


  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [isEquipmentSearchModalOpen, setIsEquipmentSearchModalOpen] =
    useState(false);
  const [currentSigner, setCurrentSigner] = useState("");

  // Estados nuevos para control de UI
  const [reportadoPorMi, setReportadoPorMi] = useState(true); // true = yo, false = otro
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null); // Equipo de la BD
  const [modoIngresoEquipo, setModoIngresoEquipo] = useState("inicial"); // "inicial", "manual", "seleccionado"

  // Estados para datos de los searchable selects
  const [sedes, setSedes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loadingSedes, setLoadingSedes] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para tipos de mantenimiento (Industrial)
  const [tiposMantenimiento, setTiposMantenimiento] = useState([]);
  const [loadingMantenimiento, setLoadingMantenimiento] = useState(false);
  const [subcategoriasDisponibles, setSubcategoriasDisponibles] = useState([]);

  const initialFormData = {
    sede: "",
    servicio: "",
    numeroOT: "",
    fecha: "",
    area: "",
    equipo: "",
    equipo_id: null,
    modelo: "",
    serie: "",
    marca: "",
    numeroInventario: "",
    solicitadoPor: "",
    correoElectronico: "",
    tipoArreglo: "",
    descripcionProblema: "",
    descripcionProblemaHtml: "",
    reportanteNombre: "",
    evidencias: [],
    tipoMantenimientoId: "",
    subcategoriaMantenimientoId: "",
    file_diagnostico: null,
  };

  const [formData, setFormData] = useState(initialFormData);





  // Función para resetear el formulario completamente
  const resetForm = () => {
    setFormData(initialFormData);
    setReportadoPorMi(true);
    setEquipoSeleccionado(null);
    setModoIngresoEquipo("inicial");
    setSubcategoriasDisponibles([]);
    setCurrentSigner("");
  };

  const changeTicketType = (type) => {
  setTicketType(type);
  // Limpia lo que depende del tipo para no enviar datos del tipo anterior
  setFormData((prev) => ({
    ...prev,
    tipoArreglo: type === "biomedico" ? "BIOMEDICO" : initialFormData.tipoArreglo,
    tipoMantenimientoId: "",
    subcategoriaMantenimientoId: "",
  }));
  if (type !== "biomedico" && tiposMantenimiento.length === 0) fetchTiposMantenimiento();
};

  // Funciones para cargar datos de APIs
  const loadFilterOptions = async () => {
    setLoadingSedes(true);
    setLoadingServicios(true);
    setLoadingAreas(true);
    try {
      const response = await httpService.get("/v1/equipos/filter-options");
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        // Transformar los datos al formato que usa SearchableSelect (con 'nombre')
        setSedes((data.sedes || []).map(s => ({ ...s, nombre: s.name })));
        setServicios((data.servicios || []).map(s => ({ ...s, nombre: s.name })));
        setAreas((data.areas || []).map(a => ({ ...a, nombre: a.name })));

        // Si hay empresas en 'filter-options', también las cargamos
        if (data.proveedores) {
          setEmpresas(data.proveedores.map(p => ({ ...p, id: p.id.toString(), nombre: p.name })));
        }
      }
    } catch (error) {
      console.error("Error al cargar opciones de filtros:", error);
      toast.error("Error al cargar ubicaciones y servicios");
    } finally {
      setLoadingSedes(false);
      setLoadingServicios(false);
      setLoadingAreas(false);
    }
  };

  const fetchEmpresas = async () => {
    setLoadingEmpresas(true);
    try {
      const response = await httpService.get("/v1/empresas");
      if (response.data?.success && response.data?.data) {
        setEmpresas(
          response.data.data.map((empresa) => ({
            id: empresa.id.toString(),
            nombre: empresa.name || empresa.nombre,
          }))
        );
      }
    } catch (error) {
      console.error("Error al cargar empresas:", error);
      // Fallback con datos por defecto
      setEmpresas([
        { id: "1", nombre: "Hospital Universitario del Valle" },
        { id: "2", nombre: "TecnoMed S.A." },
        { id: "3", nombre: "Biomedical Solutions" },
        { id: "4", nombre: "Servicios Técnicos Hospitalarios" },
        { id: "5", nombre: "MedEquip Colombia" },
        { id: "6", nombre: "Ingeniería Biomédica HUV" },
        { id: "7", nombre: "Soporte Técnico Especializado" },
        { id: "8", nombre: "Mantenimiento Hospitalario S.A.S." },
      ]);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const fetchTiposMantenimiento = async () => {
    setLoadingMantenimiento(true);
    try {
      console.log("🌐 [TICKETS] Cargando tipos de mantenimiento...");
      const response = await httpService.get("/v1/tipos-mantenimiento");
      if (response.data?.success && response.data?.data) {
        console.log("✅ [TICKETS] Tipos de mantenimiento cargados:", response.data.data.length);
        setTiposMantenimiento(response.data.data);
      } else {
        console.warn("⚠️ [TICKETS] Respuesta inesperada del servidor:", response.data);
      }
    } catch (error) {
      console.error("❌ [TICKETS] Error al cargar tipos de mantenimiento:", error);
    } finally {
      setLoadingMantenimiento(false);
    }
  };

  // useEffect para cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      // Reset inicial y luego autocompletado
      resetForm();

      loadFilterOptions();
      // Solo cargamos empresas si no vinieron en filter-options
      if (empresas.length === 0) {
        fetchEmpresas();
      }

      if (initialTicketType === "industrial" || initialTicketType === "infraestructura") {
        fetchTiposMantenimiento();
      }

      // Autocompletar fecha actual y tipo de arreglo
      const today = new Date().toLocaleDateString('sv-SE');
      setFormData(prev => ({
        ...prev,
        fecha: today,
        ...(initialTicketType === "biomedico" ? { tipoArreglo: "BIOMEDICO" } : {})
      }));

      // Autocompletar datos del usuario actual
      const user = authService.getStoredUser();
      if (user) {
        const userName = user.username || user.nombre || user.name || '';
        const userEmail = user.email || user.correo || '';
        setFormData(prev => ({
          ...prev,
          solicitadoPor: userName,
          correoElectronico: userEmail
        }));
      }
    }
  }, [isOpen]);

  // useEffect separado para manejar cambio de reportante
  useEffect(() => {
    if (!isOpen) return; // Solo ejecutar si el modal está abierto

    const user = authService.getStoredUser();
    if (reportadoPorMi && user) {
      // Si cambia a "reportado por mí", autocompletar con datos del usuario
      const userName = user.username || user.nombre || user.name || '';
      const userEmail = user.email || user.correo || '';
      setFormData(prev => ({
        ...prev,
        solicitadoPor: userName,
        correoElectronico: userEmail,
        reportanteNombre: '' // Limpiar el campo de reportante
      }));
    } else if (!reportadoPorMi) {
      // Si cambia a "reportado por otro", limpiar campos para ingreso manual
      setFormData(prev => ({
        ...prev,
        solicitadoPor: '',
        correoElectronico: ''
      }));
    }
  }, [reportadoPorMi]);

  // Funciones helper para obtener nombres de los IDs
  const getSedeNombre = (id) => {
    const sede = sedes.find((s) => s.id.toString() === id);
    return sede ? sede.nombre : id;
  };


  const getServicioNombre = (id) => {
    const servicio = servicios.find((s) => s.id.toString() === id);
    return servicio ? servicio.nombre : id;
  };

  const getAreaNombre = (id) => {
    const area = areas.find((a) => a.id.toString() === id);
    return area ? area.nombre : id;
  };

  const getEmpresaNombre = (id) => {
    const empresa = empresas.find((e) => e.id.toString() === id);
    return empresa ? empresa.nombre : id;
  };

  

  const handleInputChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));
  const handleSignature = (signerType) => {
    setCurrentSigner(signerType);
    setIsSignatureModalOpen(true);
  };
  const saveSignature = (signatureData) =>
    setFormData((prev) => ({
      ...prev,
      [`firma${currentSigner}`]: signatureData,
    }));
  const saveEvidences = (evidences) =>
    setFormData((prev) => ({ ...prev, evidencias: evidences }));

  // Función para manejar la selección de equipo desde el modal de búsqueda
  const handleSelectEquipment = (equipo) => {
    setEquipoSeleccionado(equipo);
    setModoIngresoEquipo("seleccionado");
    setFormData((prev) => ({
      ...prev,
      equipo: equipo.name || "",
      equipo_id: equipo.id || null,
      modelo: equipo.modelo || "",
      serie: equipo.serial || "",
      marca: equipo.marca || "",
      numeroInventario: equipo.code || "",
      // Actualizar servicio y área si viene con el equipo
      servicio: equipo.servicio_id
        ? equipo.servicio_id.toString()
        : prev.servicio,
      area: equipo.area_id ? equipo.area_id.toString() : prev.area,
    }));
  };

  // Manejar cambio de tipo de mantenimiento para cargar subcategorías
  const handleTipoMantenimientoChange = (value) => {
    handleInputChange("tipoMantenimientoId", value);
    handleInputChange("subcategoriaMantenimientoId", ""); // Reset subcategoria

    const selected = tiposMantenimiento.find(t => t.id.toString() === value.toString());
    if (selected && selected.subcategories) {
      setSubcategoriasDisponibles(selected.subcategories);
    } else {
      setSubcategoriasDisponibles([]);
    }
  };

  const handleSubmit = async () => {
    // Detectar campos completados
    const filledFields = [];
    if (formData.sede) filledFields.push("Sede");
    if (formData.servicio) filledFields.push("Servicio");
    if (formData.equipo) filledFields.push("Equipo");
    if (formData.descripcionProblema)
      filledFields.push("Descripción del Problema");
    if (formData.diagnostico) filledFields.push("Diagnóstico");
    if (formData.tipoTrabajoRealizado) filledFields.push("Trabajo Realizado");
    if (formData.avances) filledFields.push("Avances");
    if (formData.firmaCierre) filledFields.push("Firma de Cierre");

    // VALIDACIONES OBLIGATORIAS SOLICITADAS POR EL USUARIO
    if (!formData.sede) {
      toast.error("Campo obligatorio", {
        description: "Debe seleccionar una sede para continuar."
      });
      return;
    }

    if (!formData.servicio) {
      toast.error("Campo obligatorio", {
        description: "Debe seleccionar un servicio para continuar."
      });
      return;
    }

    if (!formData.equipo && ticketType !== "infraestructura") {
      toast.error("Campo obligatorio", {
        description: "Debe especificar o seleccionar un equipo."
      });
      return;
    }

    if (filledFields.length === 0) {
      toast.error("Creación cancelada", {
        description: "No se completó ningún campo"
      });
      return;
    }

    if (!formData.descripcionProblema || formData.descripcionProblema.trim().length < 30) {
      toast.error("Descripción muy corta", {
        description: "La descripción del problema debe tener un mínimo de 30 caracteres."
      });
      return;
    }

    // Obtener usuario actual
    const getCurrentUser = () => {
      try {
        // Usar authService primero
        const user = authService.getStoredUser();
        if (user) {
          return user;
        }

        // Fallback al localStorage con clave correcta
        const userData = localStorage.getItem("eva_user");
        if (userData) {
          const userParsed = JSON.parse(userData);
          return userParsed;
        }
      } catch (error) {
        console.error("❌ Error obteniendo usuario actual:", error);
      }
      return null;
    };

    const currentUser = getCurrentUser();
    if (!currentUser) {
      toast.error("Error de autenticación", {
        description: "No se puede identificar el usuario actual. Por favor, inicia sesión nuevamente."
      });
      return;
    }

    // Preparar información legible para mostrar
    const sedeTexto = formData.sede
      ? getSedeNombre(formData.sede)
      : "No especificado";
    const servicioTexto = formData.servicio
      ? getServicioNombre(formData.servicio)
      : "No especificado";
    const areaTexto = formData.area
      ? getAreaNombre(formData.area)
      : "No especificado";
    const empresaTexto = formData.empresaAsignada
      ? getEmpresaNombre(formData.empresaAsignada)
      : "No especificado";

    const message = `Tipo: ${ticketType.toUpperCase()}\nSede: ${sedeTexto}\nServicio: ${servicioTexto}\nÁrea: ${areaTexto}${ticketType !== "infraestructura" ? `\nEquipo: ${formData.equipo || "No especificado"}` : ""}\nEmpresa: ${empresaTexto}\n\nCampos completados: ${filledFields.join(", ")}`;

    setConfirmMessage(message);
    setShowConfirmDialog(true);
  };

  const handleConfirmCreate = () => {
    if (isSubmitting) return; // Prevents double click
    setIsSubmitting(true);
    setShowConfirmDialog(false);

    // Obtener usuario actual
    const getCurrentUser = () => {
      try {
        const user = authService.getStoredUser();
        if (user) return user;
        const userData = localStorage.getItem("eva_user");
        if (userData) return JSON.parse(userData);
      } catch (error) {
        console.error("❌ Error obteniendo usuario actual:", error);
      }
      return null;
    };

    const currentUser = getCurrentUser();

    // Función que crea el ticket (retorna una promesa)
    const createTicketPromise = async () => {
      // Preparar datos para el backend
      const ticketData = {
        descripcion: sanitizeRichHtml(formData.descripcionProblemaHtml || formData.descripcionProblema) || "Ticket creado desde el sistema",
        subproceso_id: ticketType === "biomedico" ? 1 : ticketType === "industrial" ? 2 : 3,
        equipo_id: ticketType !== "infraestructura" ? (formData.equipo_id || null) : null,
        nombre_equipo: ticketType === "infraestructura" ? "N/A - Infraestructura" : (formData.equipo || "No especificado"),
        codigo_equipo: ticketType === "infraestructura" ? null : (formData.numeroInventario || null),
        serie_equipo: ticketType === "infraestructura" ? null : (formData.serie || null),
        marca_equipo: ticketType === "infraestructura" ? null : (formData.marca || null),
        modelo_equipo: ticketType === "infraestructura" ? null : (formData.modelo || null),
        reportante_id: currentUser?.id || currentUser?.user_id || 1,
        servicio_id: formData.servicio || null,
        area_id: formData.area || null,
        estado_id: 1,
        prioridad: 2,
        empresa_id: formData.empresaAsignada || null,
        observaciones: formData.avances || null,
        tecnico_id: 1,
        electrico: 0,
        mecanico: 0,
        locativo: 0,
        cierre_active: 0,
        usuario_final_id: currentUser?.id || currentUser?.user_id || 1,
        trabajo_id: 1,
        listado_industrial_id: 1,
        tipo_mantenimiento_id: formData.tipoMantenimientoId || null,
        subcategoria_mantenimiento_id: formData.subcategoriaMantenimientoId || null,
      };

      console.log("📤 Enviando ticket al backend:", ticketData);

      // Usar FormData si hay un archivo para subir
      let dataToSend = ticketData;
      let headers = {};

      if (formData.file_diagnostico) {
        dataToSend = new FormData();
        Object.keys(ticketData).forEach(key => {
          if (ticketData[key] !== null) {
            dataToSend.append(key, ticketData[key]);
          }
        });
        dataToSend.append('file_diagnostico', formData.file_diagnostico);
        headers = { 'Content-Type': 'multipart/form-data' };
      }

      // Llamar al endpoint
      const response = await httpService.post("/v1/crear-ticket", dataToSend, { headers });
      const result = response;

      // Verificar si fue exitoso
      if (!result.success && !result.data) {
        throw new Error(result.message || "Error desconocido al crear el ticket");
      }

      const ticketId = result.data?.data?.ticket_id || result.data?.data?.id || result.data?.ticket_id || result.data?.id;

      // Guardar firma si existe
      if (formData.firmaCierre && ticketId) {
        try {
          const firmaData = {
            firma_data: formData.firmaCierre,
            tipo_firma: "cierre",
            firmante_id: currentUser?.id || currentUser?.user_id || 1,
            firmante_nombre: currentUser?.username || currentUser?.nombre || "Usuario Sistema",
          };

          await httpService.post(`/v1/tickets/${ticketId}/firma`, firmaData);
        } catch (firmaError) {
          console.error("❌ Error guardando firma digital:", firmaError);
        }
      }

      return { ticketId, ticketType };
    };

    // Usar toast.promise para manejar loading, success y error
    toast.promise(createTicketPromise(), {
      loading: 'Creando orden de trabajo...',
      success: (data) => {
        setIsSubmitting(false);
        resetForm(); // ✅ LIMPIAR FORMULARIO DESPUÉSU DEL ÉXITO
        onClose();
        if (onSuccess) onSuccess();
        return `¡Orden de Trabajo #${data.ticketId} creada exitosamente! Tipo: ${data.ticketType.toUpperCase()}`;
      },
      error: (err) => {
        setIsSubmitting(false);
        return `Error: ${err.message || 'No se pudo crear la orden de trabajo'}`;
      },
    });
  };

  if (!isOpen) return null;

  const getHeaderColor = () => {
    switch (ticketType) {
      case "biomedico":
        return "bg-blue-600";
      case "industrial":
        return "bg-orange-600";
      case "infraestructura":
        return "bg-green-600";
      default:
        return "bg-blue-600";
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className="w-[95vw] max-w-7xl h-[90vh] overflow-y-auto p-6"
          style={{ width: "95vw", maxWidth: "1400px" }}
        >
          <DialogHeader className="border-b border-gray-200 pb-4 mb-6">
            <DialogTitle className="sr-only">
              Orden de Trabajo Hospital Universitario del Valle
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulario para crear una nueva orden de trabajo en el Hospital
              Universitario del Valle
            </DialogDescription>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <img
                  src="/images/logo_huv.jpg"
                  alt="Logo HUV"
                  className="w-12 h-12 mr-3 object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://www.huv.gov.co/wp-content/uploads/2020/01/logo-huv.png';
                  }}
                />
                <div className="text-left">
                  <h1 className="text-lg font-semibold text-gray-900">
                    Hospital Universitario del Valle
                  </h1>
                  <h2 className="text-xs text-gray-600">Evaristo García</h2>
                </div>
              </div>
              <div className="inline-flex items-center px-3 py-1 bg-gray-100 rounded-full">
                <span className="text-xs font-medium text-gray-700">
                  ORDEN DE TRABAJO
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 px-2">
            {/* Sección Reportante */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                ¿Quién reporta el ticket?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Button
                  type="button"
                  variant={reportadoPorMi ? "default" : "outline"}
                  onClick={() => setReportadoPorMi(true)}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <User className="w-6 h-6 mb-1" />
                  <span className="font-semibold">Reportado por mí</span>
                  <span className="text-xs opacity-75">Yo soy quien reporta</span>
                </Button>
                <Button
                  type="button"
                  variant={!reportadoPorMi ? "default" : "outline"}
                  onClick={() => setReportadoPorMi(false)}
                  className="h-20 flex flex-col items-center justify-center"
                >
                  <User className="w-6 h-6 mb-1" />
                  <span className="font-semibold">Reportado por otro</span>
                  <span className="text-xs opacity-75">Otra persona reporta</span>
                </Button>
              </div>

              {!reportadoPorMi && (
                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Nombre del reportante
                  </Label>
                  <Input
                    value={formData.reportanteNombre}
                    onChange={(e) => handleInputChange("reportanteNombre", e.target.value)}
                    placeholder="Nombre del reportante"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>


            {ticketType == 'infraestructura' && (
              <div className="bg-yellow-50 border border-dotted border-3 border-yellow-300 rounded-lg p-4 mb-4">
                {/* Contenido específico para infraestructura */}
               <p><h3 className="font-semibold">TENER EN CUENTA</h3></p>
               <p className="text-xs text-gray-500 mt-1">Asegúrese de no reportar equipos por medio de este formulario. Si desea reportar un equipo, utilice el formulario correspondiente de orden industrial o biomedica.</p>
               <div className="mt-2 space-x-1">
               <button type="button" onClick={() => changeTicketType("biomedico")} className="px-4 py-1.5 cursor-pointer bg-blue-100  text-blue-700 font-semibold rounded-l-lg">
                Reportar Biomédico
                </button>
                <button type="button" onClick={() => changeTicketType("industrial")} className="px-4 py-1.5 cursor-pointer bg-green-100 text-green-700 font-semibold rounded-r-lg">
                Reportar Industrial
                </button>
               </div>
              </div>
            )}

            {/* Información General */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                Información General
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    O.T. # (Autoincremental)
                  </Label>
                  <Input
                    value="Autogenerado"
                    disabled
                    className="h-9 text-sm bg-gray-100 border-gray-300 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Se asignará automáticamente</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Fecha de Registro
                  </Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    disabled
                    className="h-9 text-sm bg-gray-100 border-gray-300 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fecha actual</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Usuario
                  </Label>
                  <Input
                    value={formData.solicitadoPor}
                    disabled={reportadoPorMi}
                    onChange={(e) => handleInputChange("solicitadoPor", e.target.value)}
                    className={`h-9 text-sm ${reportadoPorMi ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">{reportadoPorMi ? 'Usuario actual' : 'Editable'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Correo Electrónico
                  </Label>
                  <Input
                    type="email"
                    value={formData.correoElectronico}
                    disabled={reportadoPorMi}
                    onChange={(e) => handleInputChange("correoElectronico", e.target.value)}
                    className={`h-9 text-sm ${reportadoPorMi ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">{reportadoPorMi ? 'Email actual' : 'Editable'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Sede *
                  </Label>
                  <SearchableSelect
                    placeholder="Seleccionar sede..."
                    options={sedes}
                    value={formData.sede}
                    onValueChange={(value) => {
                      handleInputChange("sede", value);
                      // ✅ Limpiar servicio y área cuando cambie la sede
                      handleInputChange("servicio", "");
                      handleInputChange("area", "");
                    }}
                    loading={loadingSedes}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Servicio *
                  </Label>
                  <SearchableSelect
                    placeholder="Seleccionar servicio..."
                    options={
                      formData.sede
                        ? servicios.filter(
                          (servicio) =>
                            servicio.sede_id?.toString() === formData.sede.toString()
                        )
                        : servicios
                    }
                    value={formData.servicio}
                    onValueChange={(value) => {
                      handleInputChange("servicio", value);
                      // ✅ Limpiar área cuando cambie el servicio
                      handleInputChange("area", "");
                    }}
                    loading={loadingServicios}
                    disabled={!formData.sede}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Área
                  </Label>
                  <SearchableSelect
                    placeholder="Seleccionar área..."
                    options={
                      formData.servicio
                        ? areas.filter(
                          (area) => area.servicio_id?.toString() === formData.servicio.toString()
                        )
                        : areas
                    }
                    value={formData.area}
                    onValueChange={(value) => handleInputChange("area", value)}
                    loading={loadingAreas}
                    disabled={!formData.servicio}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Información del Equipo - No aplica para infraestructura */}
            {ticketType !== "infraestructura" && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Información del Equipo
              </h3>

              {/* Botones iniciales */}
              {modoIngresoEquipo === "inicial" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    type="button"
                    onClick={() => setIsEquipmentSearchModalOpen(true)}
                    className="h-16 flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700"
                  >
                    <Search className="w-5 h-5 mb-1" />
                    <span className="text-sm">Buscar en Base de Datos</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setModoIngresoEquipo("manual")}
                    variant="outline"
                    className="h-16 flex flex-col items-center justify-center"
                  >
                    <FileText className="w-5 h-5 mb-1" />
                    <span className="text-sm">Ingresar Manualmente</span>
                  </Button>
                </div>
              )}

              {/* Card de equipo seleccionado */}
              {modoIngresoEquipo === "seleccionado" && equipoSeleccionado && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-md font-semibold text-blue-900">Equipo Seleccionado</h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setModoIngresoEquipo("inicial");
                        setEquipoSeleccionado(null);
                        setFormData(prev => ({
                          ...prev,
                          equipo: "",
                          equipo_id: null,
                          modelo: "",
                          serie: "",
                          marca: "",
                          numeroInventario: ""
                        }));
                      }}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cambiar Equipo
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-600">Nombre</p>
                      <p className="text-sm font-medium text-gray-900">{equipoSeleccionado.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Código</p>
                      <p className="text-sm font-medium text-gray-900">{equipoSeleccionado.code || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Marca</p>
                      <p className="text-sm font-medium text-gray-900">{equipoSeleccionado.marca || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Modelo</p>
                      <p className="text-sm font-medium text-gray-900">{equipoSeleccionado.modelo || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Serie</p>
                      <p className="text-sm font-medium text-gray-900">{equipoSeleccionado.serial || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Campos manuales */}
              {modoIngresoEquipo === "manual" && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex justify-end mb-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setModoIngresoEquipo("inicial")}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Equipo *
                      </Label>
                      <Input
                        value={formData.equipo}
                        onChange={(e) => handleInputChange("equipo", e.target.value)}
                        className="h-9 text-sm"
                        placeholder="Nombre del equipo"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Modelo
                      </Label>
                      <Input
                        value={formData.modelo}
                        onChange={(e) => handleInputChange("modelo", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Serie
                      </Label>
                      <Input
                        value={formData.serie}
                        onChange={(e) => handleInputChange("serie", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Marca
                      </Label>
                      <Input
                        value={formData.marca}
                        onChange={(e) => handleInputChange("marca", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        No. Inventario
                      </Label>
                      <Input
                        value={formData.numeroInventario}
                        onChange={(e) => handleInputChange("numeroInventario", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Tipo de Arreglo
                      </Label>
                      <Select
                        value={formData.tipoArreglo}
                        onValueChange={(value) => handleInputChange("tipoArreglo", value)}
                        disabled={ticketType === "biomedico"}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BIOMEDICO">BIOMÉDICO</SelectItem>
                          <SelectItem value="LOCATIVO">LOCATIVO</SelectItem>
                          <SelectItem value="SISTEMAS">SISTEMAS</SelectItem>
                          <SelectItem value="ELECTRICO">ELÉCTRICO</SelectItem>
                          <SelectItem value="MECANICO">MECÁNICO</SelectItem>
                          <SelectItem value="CALDERA">CALDERA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Adjuntar Archivo Asociado */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                  <Upload className="w-4 h-4 mr-2 text-blue-600" />
                  Evidencia
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Input
                      type="file"
                      id="file_diagnostico"
                      className="max-w-xs cursor-pointer"
                      onChange={(e) => handleInputChange("file_diagnostico", e.target.files[0])}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                    />
                    <p className="text-xs text-gray-500">
                      Soporta: PDF, Word, Imágenes, ZIP (Límite amplio: 50MB+)
                    </p>
                    {formData.file_diagnostico && (
                      <div className="text-xs font-medium text-green-600 flex items-center bg-green-50 px-2 py-1 rounded">
                        <FileText className="w-3 h-3 mr-1" />
                        {formData.file_diagnostico.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Evidencia para infraestructura (sin sección de equipo) */}
            {ticketType === "infraestructura" && (
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                <Upload className="w-4 h-4 mr-2 text-green-600" />
                Evidencia
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Input
                    type="file"
                    id="file_diagnostico"
                    className="max-w-xs cursor-pointer"
                    onChange={(e) => handleInputChange("file_diagnostico", e.target.files[0])}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
                  />
                  <p className="text-xs text-gray-500">
                    Soporta: PDF, Word, Imágenes, ZIP (Límite amplio: 50MB+)
                  </p>
                  {formData.file_diagnostico && (
                    <div className="text-xs font-medium text-green-600 flex items-center bg-green-50 px-2 py-1 rounded">
                      <FileText className="w-3 h-3 mr-1" />
                      {formData.file_diagnostico.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Campos de Tipo de Mantenimiento para Industrial/Infraestructura */}
            {(ticketType === "industrial" || ticketType === "infraestructura") && (
              <div className="mt-6 border-t pt-4">
                <h3 className={`text-sm font-semibold mb-4 flex items-center ${ticketType === "industrial" ? "text-orange-700" : "text-green-700"}`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${ticketType === "industrial" ? "bg-orange-500" : "bg-green-500"}`}></div>
                  Categorización de Mantenimiento ({ticketType === "industrial" ? "Industrial" : "Infraestructura"})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Categoría de Mantenimiento
                    </Label>
                    <SearchableSelect
                      placeholder="Seleccionar tipo..."
                      options={tiposMantenimiento.map(t => ({ id: t.id, nombre: t.nombre }))}
                      value={formData.tipoMantenimientoId}
                      onValueChange={handleTipoMantenimientoChange}
                      loading={loadingMantenimiento}
                      className="h-9 text-sm"
                    />
                  </div>

                  {subcategoriasDisponibles.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        Subcategoría
                      </Label>
                      <SearchableSelect
                        placeholder="Seleccionar subcategoría..."
                        options={subcategoriasDisponibles.map(s => ({ id: s.id, nombre: s.nombre }))}
                        value={formData.subcategoriaMantenimientoId}
                        onValueChange={(value) => handleInputChange("subcategoriaMantenimientoId", value)}
                        className="h-9 text-sm border-orange-200 focus:border-orange-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Descripción del Problema */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                Descripción del Problema *
              </h3>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Descripción detallada del problema presentado
                </Label>
                <RichTextarea
                  value={formData.descripcionProblemaHtml}
                  onChange={(plain, html) => {
                    handleInputChange("descripcionProblema", plain);
                    handleInputChange("descripcionProblemaHtml", html);
                  }}
                  rows={6}
                  placeholder="Descripción detallada del problema... (Ej: El equipo no enciende, emite ruidos extraños, etc.)"
                  minLength={30}
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-8 px-4 text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`${getHeaderColor()} hover:opacity-90 h-8 px-4 text-xs`}
              >
                Crear Orden
              </Button>
            </div>
          </div>

          <DigitalSignatureModal
            isOpen={isSignatureModalOpen}
            onClose={() => setIsSignatureModalOpen(false)}
            onSave={saveSignature}
            signerName={currentSigner}
          />
          <EvidenceUploadModal
            isOpen={isEvidenceModalOpen}
            onClose={() => setIsEvidenceModalOpen(false)}
            onSave={saveEvidences}
            ticketType={ticketType}
          />
          <EquipmentSearchModal
            isOpen={isEquipmentSearchModalOpen}
            onClose={() => setIsEquipmentSearchModalOpen(false)}
            onSelectEquipment={handleSelectEquipment}
            ticketType={ticketType}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Crear Orden de Trabajo
            </h3>
            <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
              ¿Desea crear la Orden de Trabajo?
              {confirmMessage && `\n\n${confirmMessage}`}
            </p>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmCreate}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isSubmitting ? "Creando..." : "Crear Orden"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
