import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "../../hooks/useAuth.jsx";

/**
 * Componente reutilizable para botones de estadísticas y mantenimiento
 * Funciona tanto para equipos biomédicos como industriales
 */
export function StatsActionButtons({
  onPreventiveClick,
  onCalibrationClick,
  onCorrectiveClick,
  onParadaEquipoClick,
  equipmentType = "biomedical", // "biomedical" | "industrial"
}) {
  const { canEdit, user } = useAuth();
  const moduleName = equipmentType === "industrial" ? "equipos industriales" : "equipos";
  const getLabels = () => {
    switch (equipmentType) {
      case "industrial":
        return {
          preventive: "Preventivos",
          calibration: "Calibraciones",
          corrective: "Correctivos",
          paradaEquipo: "Parada Equipo",
          icons: {
            preventive: "🔧",
            calibration: "⚖️",
            corrective: "🚨",
            paradaEquipo: "🏭",
          },
        };
      case "biomedical":
      default:
        return {
          preventive: "Preventivos",
          calibration: "Calibraciones",
          corrective: "Correctivos",
          paradaEquipo: "Parada Equipo",
          icons: {
            preventive: "🔧",
            calibration: "⚖️",
            corrective: "🔧",
            paradaEquipo: "🏥",
          },
        };
    }
  };

  const labels = getLabels();
  
  // Validar si es Usuario Básico (rol_id === 4)
  const isBasicUser = user && parseInt(user.rol_id) === 4;

  return (
    <Card className="bg-slate-800 border-slate-700 shadow-none flex-1">
      <CardContent className="p-0.5 sm:p-1">
        <div className="flex gap-0.5">
          <Button
            onClick={onPreventiveClick}
            variant="ghost"
            size="sm"
            disabled={isBasicUser}
            className={`text-white hover:bg-slate-700 hover:text-white text-[10px] xs:text-xs sm:text-sm h-6 xs:h-7 sm:h-8 md:h-9 px-1 xs:px-1.5 sm:px-2 md:px-3 flex-1 min-w-0 ${
              isBasicUser ? "opacity-50 cursor-not-allowed hidden" : ""
            }`}
          >
            <span className="mr-0.5 xs:mr-1 text-xs xs:text-sm sm:text-base">
              {labels.icons.preventive}
            </span>
            <span className="truncate text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
              {labels.preventive}
            </span>
          </Button>

          <Button
            onClick={onCalibrationClick}
            variant="ghost"
            size="sm"
            disabled={isBasicUser}
            className={`text-white hover:bg-slate-700 hover:text-white text-[10px] xs:text-xs sm:text-sm h-6 xs:h-7 sm:h-8 md:h-9 px-1 xs:px-1.5 sm:px-2 md:px-3 flex-1 min-w-0 ${
              isBasicUser ? "opacity-50 cursor-not-allowed hidden" : ""
            }`}
          >
            <span className="mr-0.5 xs:mr-1 text-xs xs:text-sm sm:text-base">
              {labels.icons.calibration}
            </span>
            <span className="truncate text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
              {labels.calibration}
            </span>
          </Button>

          <Button
            onClick={onCorrectiveClick}
            variant="ghost"
            size="sm"
            disabled={isBasicUser}
            className={`text-white hover:bg-slate-700 hover:text-white text-[10px] xs:text-xs sm:text-sm h-6 xs:h-7 sm:h-8 md:h-9 px-1 xs:px-1.5 sm:px-2 md:px-3 flex-1 min-w-0 ${
              isBasicUser ? "opacity-50 cursor-not-allowed hidden" : ""
            }`}
          >
            <span className="mr-0.5 xs:mr-1 text-xs xs:text-sm sm:text-base">
              {labels.icons.corrective}
            </span>
            <span className="truncate text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
              {labels.corrective}
            </span>
          </Button>

          {onParadaEquipoClick && (
            <Button
              onClick={onParadaEquipoClick}
              variant="ghost"
              size="sm"
              disabled={!canEdit(moduleName) || isBasicUser}
              className={`text-white hover:bg-slate-700 hover:text-white text-[10px] xs:text-xs sm:text-sm h-6 xs:h-7 sm:h-8 md:h-9 px-1 xs:px-1.5 sm:px-2 md:px-3 flex-1 min-w-0 ${
                (!canEdit(moduleName) || isBasicUser) ? 'opacity-50 cursor-not-allowed hidden' : ''
              }`}
              title={`Exportar Parada de Equipo ${equipmentType === 'industrial' ? 'Industrial' : 'Biomédico'}`}
            >
              <span className="mr-0.5 xs:mr-1 text-xs xs:text-sm sm:text-base">
                {labels.icons.paradaEquipo}
              </span>
              <span className="truncate text-[9px] xs:text-[10px] sm:text-xs md:text-sm">
                {labels.paradaEquipo}
              </span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
