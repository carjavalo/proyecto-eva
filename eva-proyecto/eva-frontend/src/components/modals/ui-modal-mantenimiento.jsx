import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Wrench, Plus, Trash2, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";

export default function UIModalMantenimiento({ 
  isOpen, 
  onClose, 
  mode = "add", // "add", "edit", "view"
  data = null, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    nombre: "",
    codigo: "",
    hasSubcategory: false,
    subcategories: [] // Array of subcategory names
  });

  const [newSubName, setNewSubName] = useState("");

  // Generate random code: TM-XXXX
  const generateRandomCode = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TM-${random}`;
  };

  useEffect(() => {
    if (isOpen) {
      if (mode === "add") {
        setFormData({
          nombre: "",
          codigo: generateRandomCode(),
          aplicaIndustrial: true,
          aplicaInfraestructura: true,
          hasSubcategory: false,
          subcategories: []
        });
      } else if (data) {
        // Map backend subcategories to names array
        const subNames = data.subcategories?.map(sc => sc.nombre) || [];
        setFormData({
          codigo: data.codigo,
          nombre: data.nombre,
          // Las categorías creadas antes de esta opción sirven para las dos líneas
          aplicaIndustrial: data.aplica_industrial ?? true,
          aplicaInfraestructura: data.aplica_infraestructura ?? true,
          hasSubcategory: subNames.length > 0,
          subcategories: subNames
        });
      }
      setNewSubName("");
    }
  }, [isOpen, mode, data]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSubcategory = () => {
    if (!newSubName.trim()) return;
    setFormData(prev => ({
      ...prev,
      subcategories: [...prev.subcategories, newSubName.trim()]
    }));
    setNewSubName("");
  };

  const removeSubcategory = (index) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "view") {
      onClose();
      return;
    }

    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    if (!formData.aplicaIndustrial && !formData.aplicaInfraestructura) {
      toast.error("Elige al menos una línea: industrial o infraestructura");
      return;
    }

    onSave({
      ...formData
    });
  };

  const isView = mode === "view";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-w-[95vw] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 border-b pb-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            {mode === "add" ? "Nuevo Tipo de Mantenimiento" : mode === "edit" ? "Editar Tipo" : "Ver Detalles"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Código Autogenerado</Label>
              <Input 
                value={formData.codigo} 
                disabled 
                className="bg-gray-50 border-gray-200 font-mono text-blue-700 font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre" className="text-sm font-semibold text-gray-700">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => handleInputChange("nombre", e.target.value)}
                placeholder="Ej: Mantenimiento Preventivo"
                disabled={isView}
                required
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-slate-900">¿Para qué tickets sirve?</Label>
              <p className="text-xs text-slate-500">
                Solo se ofrecerá al crear tickets de las líneas marcadas
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm text-slate-700">Tickets industriales</Label>
              <Switch
                checked={formData.aplicaIndustrial}
                onCheckedChange={(val) => handleInputChange("aplicaIndustrial", val)}
                disabled={isView}
              />
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <Label className="text-sm text-slate-700">Tickets de infraestructura</Label>
              <Switch
                checked={formData.aplicaInfraestructura}
                onCheckedChange={(val) => handleInputChange("aplicaInfraestructura", val)}
                disabled={isView}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-900">¿Tiene subcategorías?</Label>
                <p className="text-xs text-slate-500">Permite agregar niveles inferiores al tipo</p>
              </div>
              <Switch 
                checked={formData.hasSubcategory}
                onCheckedChange={(val) => handleInputChange("hasSubcategory", val)}
                disabled={isView}
              />
            </div>

            {formData.hasSubcategory && (
              <div className="space-y-3 pt-2">
                {!isView && (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Nombre de subcategoría..." 
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubcategory())}
                      className="bg-white"
                    />
                    <Button type="button" size="icon" onClick={addSubcategory} className="shrink-0 bg-blue-600">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <div className="space-y-2">
                  {formData.subcategories && formData.subcategories.length > 0 ? (
                    formData.subcategories.map((sub, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-slate-200 text-sm shadow-sm group">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {sub}
                        </span>
                        {!isView && (
                          <button 
                            type="button" 
                            onClick={() => removeSubcategory(idx)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 text-center py-2 flex items-center justify-center gap-2">
                      <Info className="w-4 h-4" />
                      No hay subcategorías registradas
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {isView ? "Cerrar" : "Cancelar"}
            </Button>
            {!isView && (
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {mode === "add" ? "Crear Registro" : "Guardar Cambios"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
