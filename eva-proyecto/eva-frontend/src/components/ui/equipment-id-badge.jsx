import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState, memo } from "react";

/**
 * Componente para mostrar el ID del equipo de manera prominente
 * Incluye funcionalidad de copiado al clipboard
 */
export const EquipmentIdBadge = memo(function EquipmentIdBadge({ 
  equipmentId, 
  variant = "default",
  size = "default",
  showCopyButton = true,
  className = ""
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(equipmentId.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar ID:', err);
    }
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    default: "text-sm px-3 py-1.5", 
    lg: "text-base px-4 py-2"
  };

  const variantClasses = {
    default: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
    primary: "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200",
    secondary: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200",
    success: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200",
    danger: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Badge 
        variant="outline"
        className={`
          equipment-id-badge font-mono font-bold border-2 transition-all duration-300 cursor-default
          transform hover:scale-105
          ${sizeClasses[size]}
          ${variantClasses[variant]}
        `}
      >
        <span className="mr-1.5 text-xs opacity-75 font-normal">ID:</span>
        <span className="font-black tracking-wider">{equipmentId}</span>
      </Badge>
      
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className={`
            equipment-action-button p-1.5 rounded-lg transition-all duration-300 hover:scale-110 active:scale-95
            backdrop-blur-sm
            ${copied 
              ? "text-green-600 bg-green-50 hover:bg-green-100 border border-green-200" 
              : "text-gray-500 hover:text-gray-700 bg-white/80 hover:bg-white border border-gray-200 hover:border-gray-300"
            }
          `}
          title={copied ? "¡ID copiado!" : "Copiar ID"}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
      
      {copied && (
        <div className="flex items-center gap-1 animate-bounce">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-green-600 font-semibold">
            ¡Copiado!
          </span>
        </div>
      )}
    </div>
  );
})
