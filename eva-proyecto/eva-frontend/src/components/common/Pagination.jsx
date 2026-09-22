import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Componente de paginación reutilizable
 */
const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  loading = false,
  showInfo = true,
  maxVisiblePages = 5
}) => {
  // Solo ocultar si no hay ítems en absoluto
  if (totalItems === 0) return null;

  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t bg-gray-50 gap-4">
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-between">
        {showInfo && totalItems > 0 && (
          <div className="text-sm text-gray-600 font-medium order-2 sm:order-1">
            Mostrando {startItem} - {endItem} de {totalItems} registros
          </div>
        )}
        
        <div className="flex items-center space-x-2 order-1 sm:order-2">
          {/* First page */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1 || loading}
            className="p-2 h-8 w-8"
            title="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          
          {/* Previous page */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="p-2 h-8 w-8"
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Page numbers */}
          <div className="hidden sm:flex items-center space-x-2">
            {(() => {
              const pages = [];
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              
              if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }
              
              if (startPage > 1) {
                pages.push(
                  <Button
                    key={1}
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    className="h-8 min-w-[2rem]"
                    disabled={loading}
                  >
                    1
                  </Button>
                );
                if (startPage > 2) {
                  pages.push(<span key="ellipsis-start" className="px-1 text-gray-400 text-xs">...</span>);
                }
              }
              
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant={currentPage === i ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(i)}
                    disabled={loading}
                    className={`h-8 min-w-[2rem] ${
                      currentPage === i 
                        ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 font-bold" 
                        : "hover:bg-blue-50 border-gray-300"
                    }`}
                  >
                    {i}
                  </Button>
                );
              }
              
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(<span key="ellipsis-end" className="px-1 text-gray-400 text-xs">...</span>);
                }
                pages.push(
                  <Button
                    key={totalPages}
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    className="h-8 min-w-[2rem]"
                    disabled={loading}
                  >
                    {totalPages}
                  </Button>
                );
              }
              
              return pages;
            })()}
          </div>

          <div className="sm:hidden text-sm font-medium">
            Pág. {currentPage} de {totalPages}
          </div>
          
          {/* Next page */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="p-2 h-8 w-8"
            title="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* Last page */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages || loading}
            className="p-2 h-8 w-8"
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
