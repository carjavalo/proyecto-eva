import { memo } from "react";
import { Eye, Edit, Paperclip, FileText, Trash2, Files, UserX, AlertTriangle, FileStack, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAuth } from "../../hooks/useAuth.jsx";

/**
 * Tooltip animado que se despliega al lado del icono (a la izquierda, porque
 * la columna de acciones queda al borde derecho). Usa el Tooltip de Radix:
 * aparece con animación fluida (fade + zoom + slide) y en portal (no se recorta).
 */
function ActionTip({ label, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="left"
        sideOffset={8}
        className="bg-slate-800 text-white font-medium shadow-lg [&_svg]:bg-slate-800 [&_svg]:fill-slate-800"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Componente reutilizable para botones de acciones por fila de equipo
 * Funciona tanto para equipos biomédicos como industriales
 */
export const RowActionButtons = memo(function RowActionButtons({
  equipment,
  onViewClick,
  onEditClick,
  onDocumentsClick,
  onUploadClick,
  onDeleteClick,
  onCopyClick,
  onDecommissionClick,
  onContingenciasClick,
  onMovimientosClick,
  onCapacitacionesClick,
  onMigrateTypeClick,
  equipmentType = "biomedical", // "biomedical" | "industrial"
  showCopyButton = true,
  showDecommissionButton = true,
}) {
  const getTooltips = () => {
    switch (equipmentType) {
      case "industrial":
        return {
          view: "Consultar Equipo Industrial",
          edit: "Editar Información",
          documents: "Documentos Técnicos",
          upload: "Cargar Documentos",
          delete: "Eliminar Equipo",
          copy: "Copiar Equipo",
          decommission: "Dar de Baja",
          contingencias: "Contingencias",
          movimientos: "Movimientos",
          capacitaciones: "Capacitaciones",
          migrateType: "Migrar a Biomédico",
        };
      case "biomedical":
      default:
        return {
          view: "Consultar Equipo Médico",
          edit: "Editar Información",
          documents: "Documentos Técnicos",
          upload: "Cargar Documentos",
          delete: "Eliminar Equipo",
          copy: "Copiar Equipo",
          decommission: "Dar de Baja",
          contingencias: "Contingencias",
          movimientos: "Movimientos",
          capacitaciones: "Capacitaciones",
          migrateType: "Migrar a Industrial",
        };
    }
  };

  const tooltips = getTooltips();
  const { canEdit, canDelete } = useAuth();

  const moduleName = equipmentType === "industrial" ? "equipos industriales" : "equipos";

  // Validar si es Usuario Básico (por lo general rol_id 4)

  return (
    <div className=" w-full h-full flex flex-col gap-2 items-center justify-center xs:gap-1">
      {/* View Button */}
      <ActionTip label={tooltips.view}>
        <Button
          size="sm"
          className={`bg-cyan-50 hover:bg-cyan-100 text-cyan-600 rounded-sm transition-all w-8 h-8 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0`}
          onClick={() => onViewClick(equipment)}
        >
          <Eye className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
        </Button>
      </ActionTip>

      {/* Edit Button */}
      <ActionTip label={tooltips.edit}>
        <Button
          size="sm"
          disabled={!canEdit(moduleName)}
          className={`bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-sm transition-all w-8 h-8 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 ${!canEdit(moduleName) ? 'opacity-50 cursor-not-allowed hidden' : ''
            }`}
          onClick={() => onEditClick(equipment)}
        >
          <Edit className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
        </Button>
      </ActionTip>

      {/* Documents Button */}
      <ActionTip label={tooltips.documents}>
        <Button
          size="sm"
          className={`bg-pink-50 hover:bg-purple-100 text-purple-600 rounded-sm transition-all w-8 h-8 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0`}
          onClick={() => onDocumentsClick(equipment)}
        >
          <FileText className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
        </Button>
      </ActionTip>

      {/* Upload Button */}
      <ActionTip label={tooltips.upload}>
        <Button
          size="sm"
          disabled={!canEdit(moduleName)}
          className={`bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-sm transition-all w-8 h-8 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 ${!canEdit(moduleName) ? 'opacity-50 cursor-not-allowed hidden' : ''
            }`}
          onClick={() => onUploadClick(equipment)}
        >
          <Paperclip className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
        </Button>
      </ActionTip>

      {/* Contingencias Button */}
      {onContingenciasClick && (
        <ActionTip label={tooltips.contingencias}>
          <Button
            size="sm"
            className={`bg-red-600 hover:bg-red-700 text-white h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0`}
            onClick={() => onContingenciasClick(equipment)}
          >
            <AlertTriangle className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
          </Button>
        </ActionTip>
      )}

      {/* Movimientos Button */}
      {onMovimientosClick && (
        <ActionTip label={tooltips.movimientos}>
          <Button
            size="sm"
            className={`bg-indigo-500 hover:bg-indigo-600 text-white h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0`}
            onClick={() => onMovimientosClick(equipment)}
          >
            <FileStack className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
          </Button>
        </ActionTip>
      )}

      {/* Capacitaciones Button */}
      {onCapacitacionesClick && (
        <ActionTip label={tooltips.capacitaciones}>
          <Button
            size="sm"
            className={`bg-teal-500 hover:bg-teal-600 text-white h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0`}
            onClick={() => onCapacitacionesClick(equipment)}
          >
            <FileText className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
          </Button>
        </ActionTip>
      )}

      {/* Copy Button (conditional) */}
      {showCopyButton && onCopyClick && (
        <ActionTip label={tooltips.copy}>
          <Button
            size="sm"
            disabled={!canEdit(moduleName)}
            className={`bg-green-500 hover:bg-green-600 text-white h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 ${!canEdit(moduleName) ? 'opacity-50 cursor-not-allowed hidden' : ''
              }`}
            onClick={() => onCopyClick(equipment)}
          >
            <Files className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
          </Button>
        </ActionTip>
      )}

      {/* Decommission Button (conditional) */}
      {showDecommissionButton && onDecommissionClick && equipment?.estado !== 'BAJA' && (
        <ActionTip label={tooltips.decommission}>
          <Button
            size="sm"
            disabled={!canEdit(moduleName)}
            className={`bg-yellow-50 hover:bg-yellow-100 text-yellow-600 rounded-sm transition-all w-8 h-8 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 ${!canEdit(moduleName) ? 'opacity-50 cursor-not-allowed hidden' : ''
              }`}
            onClick={() => onDecommissionClick(equipment)}
          >
            <UserX className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
          </Button>
        </ActionTip>
      )}

      {/* Migrate Type Button (biomédico <-> industrial) */}
      {onMigrateTypeClick && (
        <ActionTip label={tooltips.migrateType}>
          <Button
            size="sm"
            disabled={!canEdit(moduleName)}
            className={`bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-sm transition-all w-8 h-8 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 ${!canEdit(moduleName) ? 'opacity-50 cursor-not-allowed hidden' : ''
              }`}
            onClick={() => onMigrateTypeClick(equipment)}
          >
            <ArrowLeftRight className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
          </Button>
        </ActionTip>
      )}

      {/* Delete Button */}
      <ActionTip label={tooltips.delete}>
        <Button
          size="sm"
          disabled={!canDelete(moduleName)}
          className={`bg-red-50 hover:bg-red-100 text-red-600 rounded-sm transition-all w-8 h-8 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0 ${!canDelete(moduleName) ? 'opacity-50 cursor-not-allowed hidden' : ''
            }`}
          onClick={() => onDeleteClick(equipment)}
        >
          <Trash2 className="w-2 h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
        </Button>
      </ActionTip>
    </div>
  );
})
