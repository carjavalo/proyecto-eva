import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer';

const stripHtml = (html) => html ? String(html).replace(/<[^>]*>/g, '') : '';

// Estilos para PDF que replican el modal
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 20,
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1d293d',
    marginBottom: 15
  },
  logo: {
    width: 100,
    height: 100,
    marginRight: 15
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    marginLeft: 20,
    marginRight: 20
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1d293d',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: '#1d293d',
    fontWeight: 'bold'
  },
  systemInfo: {
    fontSize: 8,
    color: '#1d293d'
  },
  equipmentSection: {
    flexDirection: 'row',
    gap: 15,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10
  },
  equipmentInfo: {
    flex: 1
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1d293d',
    marginBottom: 8
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  equipmentItem: {
    width: '48%',
    fontSize: 9,
    marginBottom: 4
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff'
  },
  noImage: {
    fontSize: 8,
    color: '#6b7280',
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#1d293d',
    padding: 8,
    marginBottom: 0,
    marginTop: 15
  },
  table: {
    borderWidth: 1,
    borderColor: '#4a5568',
    marginBottom: 15
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#4a5568'
  },
  tableCellHeader: {
    width: '25%',
    backgroundColor: '#e2e8f0',
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#4a5568',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#1d293d'
  },
  tableCellData: {
    width: '25%',
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#4a5568',
    fontSize: 9
  },
  dataTable: {
    borderWidth: 1,
    borderColor: '#4a5568',
    marginBottom: 10
  },
  dataTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6'
  },
  dataTableHeaderCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#4a5568',
    fontSize: 8,
    fontWeight: 'bold',
    color: '#1d293d'
  },
  dataTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#4a5568'
  },
  dataTableCell: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#4a5568',
    fontSize: 8
  },
  historyButton: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    alignItems: 'center',
    marginTop: 10
  },
  historyButtonText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: 'bold'
  },
  footer: {
    backgroundColor: '#fef3cd',
    borderWidth: 1,
    borderColor: '#d97706',
    borderStyle: 'solid',
    padding: 8,
    marginTop: 15,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 9,
    color: '#92400e',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  footerSubText: {
    fontSize: 8,
    color: '#b45309',
    textAlign: 'center',
    marginTop: 2
  },
  link: {
    color: '#1d293d',
    textDecoration: 'underline',
    fontSize: 9
  },
  emptyState: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#6b7280',
    padding: 10
  },
  equipmentImage: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid'
  },
  noImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5
  },
  logoImage: {
    width: 100,
    height: 100,
    objectFit: 'contain'
  },
  emptyHistoryContainer: {
    textAlign: 'center',
    padding: 20
  },
  emptyHistoryText: {
    fontStyle: 'italic',
    color: '#6b7280'
  }
});

const EquipmentModalReplicaPDF = ({ data }) => {
  // 🖼️ Logs de debug para imagen
  console.log('🖼️ [PDF Component] Recibiendo datos:', {
    hasData: !!data,
    hasEquipmentImageBase64: !!data?.equipmentImageBase64,
    imageType: typeof data?.equipmentImageBase64,
    imageLength: data?.equipmentImageBase64?.length || 0,
    isValidBase64: data?.equipmentImageBase64?.startsWith('data:image/') || false,
    imagePreview: data?.equipmentImageBase64?.substring(0, 50) || 'N/A'
  });

  const safeValue = (value, defaultValue = 'N/A') => {
    if (value === null || value === undefined || value === '') return defaultValue;
    if (value === 0) return '0';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object' && value !== null) {
      if (value.name) return value.name;
      if (value.nombre) return value.nombre;
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Normaliza un valor a YYYY-MM-DD usando la MISMA regla que el modal de editar
  // (toDateInputValue): se queda con la parte de fecha y exige formato estricto.
  // Si el valor no es una fecha válida devuelve null -> nunca se parsea con
  // new Date() de forma laxa (eso causaba que un dato mal formado mostrara el
  // año actual, p. ej. 2026, en equipos sin año de fabricación).
  const normalizeDateString = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const s = String(value).split(/[ T]/)[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  };

  const formatDate = (dateString, fallback = 'N/A') => {
    const s = normalizeDateString(dateString);
    if (!s) return fallback;
    try {
      // Interpretar como fecha local (evita desfase por zona horaria)
      const d = new Date(s + 'T00:00:00');
      return isNaN(d.getTime()) ? fallback : d.toLocaleDateString('es-ES');
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return fallback;
    }
  };

  const formatYear = (dateString, fallback = 'N/A') => {
    const s = normalizeDateString(dateString);
    if (!s) return fallback;
    try {
      const year = new Date(s + 'T00:00:00').getFullYear();
      return isNaN(year) ? fallback : String(year);
    } catch (error) {
      console.warn('Error formatting year:', dateString, error);
      return fallback;
    }
  };

  // Logo del hospital - usar ruta pública directamente
  const logoHUV = '/images/logo_huv.jpg';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER IDÉNTICO AL MODAL CON LOGO GRANDE */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image 
              src={logoHUV}
              style={styles.logoImage}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              HOSPITAL UNIVERSITARIO DEL VALLE "EVARISTO GARCÍA"
            </Text>
            <Text style={styles.subtitle}>
              HOJA DE VIDA - {safeValue(data?.name?.toUpperCase())}
            </Text>
            <Text style={styles.systemInfo}>
              Sistema de Gestión EVA - Electromedicina
            </Text>
          </View>
        </View>

        {/* SECCIÓN DE EQUIPO CON IMAGEN */}
        <View style={styles.equipmentSection}>
          <View style={styles.equipmentInfo}>
            <Text style={styles.equipmentName}>
              {safeValue(data?.name)}
            </Text>
            <View style={styles.equipmentGrid}>
              <Text style={styles.equipmentItem}>ID: {safeValue(data?.id)}</Text>
              <Text style={styles.equipmentItem}>Código: {safeValue(data?.code)}</Text>
              <Text style={styles.equipmentItem}>Serie: {safeValue(data?.serial)}</Text>
              <Text style={styles.equipmentItem}>Marca: {safeValue(data?.marca)}</Text>
              <Text style={styles.equipmentItem}>Modelo: {safeValue(data?.modelo)}</Text>
              <Text style={styles.equipmentItem}>Estado: {safeValue(data?.estado_nombre)}</Text>
            </View>
          </View>
          <View style={styles.imageContainer}>
            {data?.equipmentImageBase64 ? (
              <>
                {console.log('✅ [PDF] Renderizando imagen en PDF:', {
                  hasImage: true,
                  imageLength: data.equipmentImageBase64.length,
                  imageStart: data.equipmentImageBase64.substring(0, 30)
                })}
                <Image 
                  src={data.equipmentImageBase64} 
                  style={styles.equipmentImage}
                />
              </>
            ) : (
              <>
                {console.log('⚠️ [PDF] NO HAY IMAGEN - Mostrando placeholder')}
                <View style={styles.noImageContainer}>
                  <Text style={styles.noImage}>
                    Sin imagen
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* INFORMACIÓN GENERAL Y UBICACIÓN - ESTILO TABULAR */}
        <Text style={styles.sectionTitle}>INFORMACIÓN GENERAL Y UBICACIÓN</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>ID del Equipo</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.id)}</Text>
            <Text style={styles.tableCellHeader}>Código</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.code)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Serie</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.serial)}</Text>
            <Text style={styles.tableCellHeader}>Estado</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.estado_nombre)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Sede</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.sede_nombre)}</Text>
            <Text style={styles.tableCellHeader}>Servicio</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.servicio_nombre)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Área</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.area_nombre)}</Text>
            <Text style={styles.tableCellHeader}>Piso</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.piso)}</Text>
          </View>
        </View>

        {/* CARACTERÍSTICAS TÉCNICAS Y ESPECIFICACIONES */}
        <Text style={styles.sectionTitle}>CARACTERÍSTICAS TÉCNICAS Y ESPECIFICACIONES</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Marca</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.marca)}</Text>
            <Text style={styles.tableCellHeader}>Modelo</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.modelo)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Potencia</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.potencia)}</Text>
            <Text style={styles.tableCellHeader}>Corriente</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.corriente)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>País Origen</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.pais_origen)}</Text>
            <Text style={styles.tableCellHeader}>Frecuencia</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.frecuencia)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Año Fabricación</Text>
            <Text style={styles.tableCellData}>{formatYear(data?.fecha_fabricacion)}</Text>
            <Text style={styles.tableCellHeader}>Garantía</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.garantia)} años</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Vida Útil</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.vida_util)} años</Text>
            <Text style={styles.tableCellHeader}>Voltaje</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.voltaje || data?.v1)}</Text>
          </View>
        </View>

        {/* Lista completa de especificaciones técnicas registradas */}
        {data?.especificaciones && data.especificaciones.length > 0 && (
          <View style={styles.table}>
            {data.especificaciones.map((esp, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCellHeader, { width: '35%' }]}>
                  {safeValue(esp.especificacion_nombre || esp.nombre)}
                </Text>
                <Text style={[styles.tableCellData, { width: '65%', borderRightWidth: 0 }]}>
                  {safeValue(esp.valor)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* INFORMACIÓN REGULATORIA Y FECHAS CRÍTICAS */}
        <Text style={styles.sectionTitle}>INFORMACIÓN REGULATORIA Y FECHAS CRÍTICAS</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Reg. INVIMA</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.invima || data?.numero_invima || data?.invima_numero_registro || data?.registro_sanitario_invima)}</Text>
            <Text style={styles.tableCellHeader}>Estado INVIMA</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.invima_estado || data?.estado_invima)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>F. Adquisición</Text>
            <Text style={styles.tableCellData}>{formatDate(data?.fecha_ad)}</Text>
            <Text style={styles.tableCellHeader}>F. Fabricación</Text>
            <Text style={styles.tableCellData}>{formatDate(data?.fecha_fabricacion)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>F. Instalación</Text>
            <Text style={styles.tableCellData}>{formatDate(data?.fecha_instalacion)}</Text>
            <Text style={styles.tableCellHeader}>F. Operación</Text>
            <Text style={styles.tableCellData}>{formatDate(data?.fecha_inicio_operacion)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>F. Venc. Garantía</Text>
            <Text style={[styles.tableCellData, { flex: 3 }]}>{formatDate(data?.fecha_vencimiento_garantia)}</Text>
          </View>
        </View>

        {/* INFORMACIÓN FINANCIERA Y CONTRACTUAL */}
        <Text style={styles.sectionTitle}>INFORMACIÓN FINANCIERA Y CONTRACTUAL</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Costo</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.costo)}</Text>
            <Text style={styles.tableCellHeader}>Propietario</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.propietario_nombre)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Propiedad</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.propiedad)}</Text>
            <Text style={styles.tableCellHeader}>Comodato</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.activo_comodato)}</Text>
          </View>
        </View>

        {/* PLAN DE EJECUCIÓN */}
        <Text style={styles.sectionTitle}>PLAN DE EJECUCIÓN</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Incluido en Plan</Text>
            <Text style={styles.tableCellData}>
              {data?.incluido_en_plan > 0 
                ? `Incluido en Plan ${data?.anio_vigente || 'Vigente'}` 
                : 'No incluido'}
            </Text>
          </View>
          {data?.incluido_en_plan > 0 && (
            <>
              <View style={styles.tableRow}>
                <Text style={styles.tableCellHeader}>Responsable</Text>
                <Text style={styles.tableCellData}>{safeValue(data?.responsable_plan)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCellHeader}>Frecuencia</Text>
                <Text style={styles.tableCellData}>{safeValue(data?.frecuencia_plan || data?.frecuencia)}</Text>
              </View>
              {(data?.mes_programado1 || data?.mes_programado2 || data?.mes_programado3) && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableCellHeader}>Meses Programados</Text>
                  <Text style={styles.tableCellData}>
                    {data?.mes_programado1 && `Fecha 1: ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][data.mes_programado1 - 1]}`}
                    {data?.mes_programado2 && ` | Fecha 2: ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][data.mes_programado2 - 1]}`}
                    {data?.mes_programado3 && ` | Fecha 3: ${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][data.mes_programado3 - 1]}`}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* EVALUACIÓN DE DESEMPEÑO */}
        <Text style={styles.sectionTitle}>EVALUACIÓN DE DESEMPEÑO</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Evaluación de Desempeño</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.evaluacion_desempenio)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Calibración</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.calibracion)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Periodicidad</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.periodicidad)}</Text>
          </View>
        </View>

        {/* MANTENIMIENTOS PREVENTIVOS */}
        <Text style={styles.sectionTitle}>MANTENIMIENTOS PREVENTIVOS RECIENTES</Text>
        <View style={styles.dataTable}>
          <View style={styles.dataTableHeader}>
            <Text style={styles.dataTableHeaderCell}>Número de Preventivo</Text>
            <Text style={styles.dataTableHeaderCell}>Fecha</Text>
            <Text style={styles.dataTableHeaderCell}>Observación</Text>
            <Text style={styles.dataTableHeaderCell}>Estado</Text>
            <Text style={styles.dataTableHeaderCell}>Archivo</Text>
          </View>
          {data?.mantenimientos_preventivos && data.mantenimientos_preventivos.length > 0 ? (
            data.mantenimientos_preventivos.slice(0, 10).map((mant, index) => (
              <View key={index} style={styles.dataTableRow}>
                <Text style={styles.dataTableCell}>{mant.description || '-'}</Text>
                <Text style={styles.dataTableCell}>{formatDate(mant.fecha_mantenimiento || mant.fecha_programada)}</Text>
                <Text style={styles.dataTableCell}>{mant.observacion ? (mant.observacion.length > 80 ? mant.observacion.substring(0, 80) + '...' : mant.observacion) : 'Sin observación'}</Text>
                <Text style={styles.dataTableCell}>{mant.status === 1 ? 'Completado' : 'Pendiente'}</Text>
                <Text style={styles.dataTableCell}>
                  {mant.file ? (
                    <Link src={`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.56.1:8001'}/api/storage/mantenimientos/${mant.file}`} style={styles.link}>Ver</Link>
                  ) : (
                    'Sin archivo'
                  )}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.dataTableRow}>
              <Text style={[styles.dataTableCell, { textAlign: 'center', fontStyle: 'italic', color: '#6b7280' }]}>
                No hay mantenimientos preventivos registrados
              </Text>
            </View>
          )}
        </View>

        {/* CALIBRACIONES RECIENTES */}
        <Text style={styles.sectionTitle}>CALIBRACIONES RECIENTES</Text>
        <View style={styles.dataTable}>
          <View style={styles.dataTableHeader}>
            <Text style={styles.dataTableHeaderCell}>Fecha Calibración</Text>
            <Text style={styles.dataTableHeaderCell}>Número de Calibración</Text>
            <Text style={styles.dataTableHeaderCell}>Próxima</Text>
            <Text style={styles.dataTableHeaderCell}>Resultado</Text>
          </View>
          {data?.calibraciones && data.calibraciones.length > 0 ? (
            data.calibraciones.slice(0, 4).map((cal, index) => (
              <View key={index} style={styles.dataTableRow}>
                <Text style={styles.dataTableCell}>{formatDate(cal.fecha_calibracion)}</Text>
                <Text style={styles.dataTableCell}>{safeValue(cal.description || cal.tipo_calibracion)}</Text>
                <Text style={styles.dataTableCell}>{formatDate(cal.proxima_calibracion)}</Text>
                <Text style={styles.dataTableCell}>{safeValue(cal.resultado)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.dataTableRow}>
              <Text style={[styles.dataTableCell, { textAlign: 'center', fontStyle: 'italic', color: '#6b7280' }]}>
                No hay calibraciones registradas
              </Text>
            </View>
          )}
        </View>

        {/* TICKETS/MANTENIMIENTOS CORRECTIVOS */}
        <Text style={styles.sectionTitle}>MANTENIMIENTOS CORRECTIVOS / TICKETS</Text>
        <View style={styles.dataTable}>
          <View style={styles.dataTableHeader}>
            <Text style={styles.dataTableHeaderCell}>ID Ticket</Text>
            <Text style={styles.dataTableHeaderCell}>Descripción</Text>
            <Text style={styles.dataTableHeaderCell}>Estado</Text>
            <Text style={styles.dataTableHeaderCell}>Archivo</Text>
          </View>
          {data?.equipmentTickets && data.equipmentTickets.length > 0 ? (
            data.equipmentTickets.slice(0, 10).map((ticket, index) => (
              <View key={index} style={styles.dataTableRow}>
                <Text style={styles.dataTableCell}>#{ticket.id}</Text>
                <Text style={styles.dataTableCell}>
                  {ticket.descripcion_completa 
                    ? (ticket.descripcion_completa.length > 80 
                        ? stripHtml(ticket.descripcion_completa).substring(0, 80) + '...' 
                        : stripHtml(ticket.descripcion_completa))
                    : stripHtml(ticket.descripcion_problema || ticket.descripcion) || 'Sin descripción'}
                </Text>
                <Text style={styles.dataTableCell}>{ticket.estado || ticket.estado_nombre || ({1:'Abierto',2:'Asignado',3:'Diagnosticado',4:'Cerrado',5:'Esperando cierre'}[Number(ticket.estado_id)]) || 'Sin estado'}</Text>
                <Text style={styles.dataTableCell}>
                  {(() => {
                    // Mismos archivos que muestra la tabla en pantalla: evidencia, diagnóstico y cierre
                    const archivos = [
                      { campo: ticket.image, etiqueta: 'Evidencia' },
                      { campo: ticket.file_diagnostico, etiqueta: 'Diagnóstico' },
                      { campo: ticket.file_cierre, etiqueta: 'Cierre' },
                    ].filter((a) => a.campo && String(a.campo).trim() !== '');

                    if (archivos.length === 0) return 'Sin archivo';

                    const base = import.meta.env.VITE_API_BASE_URL || 'http://192.168.56.1:8001';

                    return archivos.map((a, i) => (
                      <Link
                        key={a.etiqueta}
                        src={`${base}/storage/correctivos_generales/${String(a.campo).replace(/^correctivos_generales\//, '')}`}
                        style={styles.link}
                      >
                        {i > 0 ? ` · ${a.etiqueta}` : a.etiqueta}
                      </Link>
                    ));
                  })()}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.dataTableRow}>
              <Text style={[styles.dataTableCell, { textAlign: 'center', fontStyle: 'italic', color: '#6b7280' }]}>
                No hay tickets asociados a este equipo
              </Text>
            </View>
          )}
        </View>

        {/* CORRECTIVOS GENERALES */}
        <Text style={styles.sectionTitle}>CORRECTIVOS GENERALES</Text>
        <View style={styles.dataTable}>
          <View style={styles.dataTableHeader}>
            <Text style={[styles.dataTableHeaderCell, { flex: 1.5 }]}>Código / Orden</Text>
            <Text style={[styles.dataTableHeaderCell, { flex: 1.5 }]}>F. Inicio</Text>
            <Text style={[styles.dataTableHeaderCell, { flex: 4 }]}>Descripción Cierre</Text>
            <Text style={[styles.dataTableHeaderCell, { flex: 1 }]}>Archivo</Text>
          </View>
          {data?.correctivos_generales && data.correctivos_generales.length > 0 ? (
            data.correctivos_generales.map((correctivo, index) => (
              <View key={index} style={styles.dataTableRow}>
                <Text style={[styles.dataTableCell, { flex: 1.5 }]}>{correctivo.code_orden || `-`} / {correctivo.orden || `-`}</Text>
                <Text style={[styles.dataTableCell, { flex: 1.5 }]}>{formatDate(correctivo.fecha_inicio)}</Text>
                <Text style={[styles.dataTableCell, { flex: 4, fontSize: 7 }]}>
                  {correctivo.descripcion_codigo ? `${correctivo.codigo_cierre} - ${correctivo.descripcion_codigo}` : 'Pendiente'}
                  {correctivo.description ? `\nDescripción: ${correctivo.description}` : ''}
                  {`\nF. Cierre: ${formatDate(correctivo.fecha_mantenimiento)}`}
                </Text>
                <Text style={[styles.dataTableCell, { flex: 1 }]}>
                  {correctivo.file ? (
                    <Link 
                      src={`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.56.1:8001'}/storage/correctivos_generales/${correctivo.file.split('/').pop()}`}
                      style={styles.link}
                    >
                      Ver
                    </Link>
                  ) : (
                    'Sin archivo'
                  )}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.dataTableRow}>
              <Text style={[styles.dataTableCell, { textAlign: 'center', fontStyle: 'italic', color: '#6b7280' }]}>
                No hay correctivos generales registrados para este equipo
              </Text>
            </View>
          )}
        </View>

        {/* OBSERVACIONES DEL EQUIPO */}
        <Text style={styles.sectionTitle}>OBSERVACIONES DEL EQUIPO</Text>
        <View style={styles.dataTable}>
          <View style={styles.dataTableHeader}>
            <Text style={styles.dataTableHeaderCell}>Fecha</Text>
            <Text style={styles.dataTableHeaderCell}>Usuario</Text>
            <Text style={styles.dataTableHeaderCell}>Descripción</Text>
            <Text style={styles.dataTableHeaderCell}>Archivo</Text>
          </View>
          {data?.observaciones && data.observaciones.length > 0 ? (
            data.observaciones.slice(0, 10).map((obs, index) => (
              <View key={index} style={styles.dataTableRow}>
                <Text style={styles.dataTableCell}>{formatDate(obs.created_at || obs.fecha_nota)}</Text>
                <Text style={styles.dataTableCell}>{safeValue(obs.usuario_nombre || 'Usuario')}</Text>
                <Text style={styles.dataTableCell}>
                  {obs.description 
                    ? (obs.description.length > 80 
                        ? obs.description.substring(0, 80) + '...' 
                        : obs.description)
                    : 'Sin descripción'}
                </Text>
                <Text style={styles.dataTableCell}>
                  {obs.file ? (
                    <Link 
                      src={`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.56.1:8001'}/api/storage/observaciones/${obs.file}`}
                      style={styles.link}
                    >
                      Ver
                    </Link>
                  ) : (
                    'Sin archivo'
                  )}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.dataTableRow}>
              <Text style={[styles.dataTableCell, { textAlign: 'center', fontStyle: 'italic', color: '#6b7280' }]}>
                No hay observaciones registradas para este equipo
              </Text>
            </View>
          )}
        </View>

        {/* CONTINGENCIAS / EVENTOS */}
        <Text style={styles.sectionTitle}>CONTINGENCIAS / EVENTOS</Text>
        <View style={styles.dataTable}>
          <View style={styles.dataTableHeader}>
            <Text style={styles.dataTableHeaderCell}>Fecha</Text>
            <Text style={styles.dataTableHeaderCell}>Usuario</Text>
            <Text style={styles.dataTableHeaderCell}>Observación</Text>
            <Text style={styles.dataTableHeaderCell}>Archivo</Text>
          </View>
          {data?.contingencias && data.contingencias.length > 0 ? (
            data.contingencias.slice(0, 10).map((cont, index) => (
              <View key={index} style={styles.dataTableRow}>
                <Text style={styles.dataTableCell}>{formatDate(cont.fecha || cont.created_at)}</Text>
                <Text style={styles.dataTableCell}>
                  {cont.usuario_nombre 
                    ? `${cont.usuario_nombre} ${cont.usuario_apellido || ''}`.trim()
                    : 'Usuario'}
                </Text>
                <Text style={styles.dataTableCell}>
                  {cont.observacion 
                    ? (cont.observacion.length > 80 
                        ? cont.observacion.substring(0, 80) + '...' 
                        : cont.observacion)
                    : 'Sin observación'}
                </Text>
                <Text style={styles.dataTableCell}>
                  {cont.file ? (
                    <Link 
                      src={`${import.meta.env.VITE_API_BASE_URL || 'http://api.eva2.huv.gov.co'}/storage/contingencias/${cont.file}`}
                      style={styles.link}
                    >
                      Ver
                    </Link>
                  ) : (
                    'Sin archivo'
                  )}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.dataTableRow}>
              <Text style={[styles.dataTableCell, { textAlign: 'center', fontStyle: 'italic', color: '#6b7280' }]}>
                No hay contingencias registradas para este equipo
              </Text>
            </View>
          )}
        </View>

        {/* DOCUMENTOS ASOCIADOS CON ENLACES FUNCIONALES */}
        <Text style={styles.sectionTitle}>DOCUMENTOS ASOCIADOS</Text>
        <View style={styles.dataTable}>
          <View style={styles.dataTableHeader}>
            <Text style={styles.dataTableHeaderCell}>Nombre</Text>
            <Text style={styles.dataTableHeaderCell}>Tipo de Documento</Text>
            <Text style={styles.dataTableHeaderCell}>Fecha</Text>
            <Text style={styles.dataTableHeaderCell}>Archivo</Text>
          </View>
          {data?.documentos && data.documentos.length > 0 ? (
            data.documentos.slice(0, 6).map((doc, index) => (
              <View key={index} style={styles.dataTableRow}>
                <Text style={styles.dataTableCell}>{safeValue(doc.nombre_archivo)}</Text>
                <Text style={styles.dataTableCell}>{doc.tipo_personalizado ? `${doc.tipo_personalizado} (Personalizado)` : safeValue(doc.tipo_documento)}</Text>
                <Text style={styles.dataTableCell}>{safeValue(doc.fecha_documento)}</Text>
                <Text style={styles.dataTableCell}>
                  {doc.vinculo ? (
                    <Link src={`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.2.146:8001'}/api/storage/equipos/archivos/${doc.vinculo}`} style={styles.link}>
                      Ver
                    </Link>
                  ) : (
                    'Sin archivo'
                  )}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.dataTableRow}>
              <Text style={[styles.dataTableCell, { textAlign: 'center', fontStyle: 'italic', color: '#6b7280' }]}>
                No hay documentos asociados
              </Text>
            </View>
          )}
        </View>

        {/* DOCUMENTACIÓN ASOCIADA */}
        <Text style={styles.sectionTitle}>DOCUMENTACIÓN ASOCIADA</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Manual Asociado</Text>
            <Text style={styles.tableCellData}>
              {data?.selectedManualInfo ? (
                <Link src={data.selectedManualInfo.url} style={styles.link}>
                  {data.selectedManualInfo.descripcion}
                </Link>
              ) : data?.manual_id ? (
                'Cargando manual...'
              ) : (
                'Sin manual asociado'
              )}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Guía Rápida Asociada</Text>
            <Text style={styles.tableCellData}>
              {data?.selectedGuideInfo ? (
                <Link 
                  src={`${import.meta.env.VITE_API_BASE_URL || 'http://192.168.2.146:8001'}/storage/guias/${data.selectedGuideInfo.file}`} 
                  style={styles.link}
                >
                  {data.selectedGuideInfo.name}
                </Link>
              ) : data?.guia_id ? (
                'Cargando guía...'
              ) : (
                'Sin guía rápida asociada'
              )}
            </Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Accesorios</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.accesorios) || 'No especificados'}</Text>
          </View>
        </View>

        {/* INFORMACIÓN ADICIONAL */}
        <Text style={styles.sectionTitle}>INFORMACIÓN ADICIONAL</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Verificación Inventario</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.verificacion_inventario)}</Text>
            <Text style={styles.tableCellHeader}>Código Antiguo</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.codigo_antiguo)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableCellHeader}>Repuesto Pendiente</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.repuesto_pendiente)}</Text>
            <Text style={styles.tableCellHeader}>Plan Mantenimiento</Text>
            <Text style={styles.tableCellData}>{safeValue(data?.plan)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Modo Solo Lectura
          </Text>
          <Text style={styles.footerSubText}>
            Esta vista es de solo consulta. Los datos se obtienen directamente de la base de datos del sistema EVA.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default EquipmentModalReplicaPDF;
