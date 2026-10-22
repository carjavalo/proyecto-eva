import { useState, useEffect, useCallback } from "react";
import api from "../config/apiClient";

const API_BASE_URL = "/v1";

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    last_page: 1,
  });

  // Obtener lista de usuarios
  const fetchUsuarios = useCallback(
    async (page = 1, perPage = 10, search = "", sortBy = "id", sortDirection = "desc") => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          per_page: perPage.toString(),
          ...(search && { search }),
          sort_by: sortBy,
          sort_direction: sortDirection,
        });

        const response = await api.get(`${API_BASE_URL}/usuarios-public?${params}`);

        const data = response.data;

        if (data.success) {
          setUsuarios(data.data.data || []);
          setPagination({
            current_page: data.data.current_page || 1,
            per_page: data.data.per_page || 10,
            total: data.data.total || 0,
            last_page: data.data.last_page || 1,
          });
        } else {
          throw new Error(data.message || "Error al obtener usuarios");
        }
      } catch (err) {
        console.error("Error fetching usuarios:", err);
        setError(err.message);
        setUsuarios([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Crear usuario
  const createUsuario = useCallback(
    async (userData) => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.post(`${API_BASE_URL}/usuarios`, userData);

        const data = response.data;

        if (data.success) {
          // Refrescar la lista después de crear
          await fetchUsuarios(pagination.current_page, pagination.per_page);
          return data.data;
        } else {
          throw new Error(data.message || "Error al crear usuario");
        }
      } catch (err) {
        console.error("Error creating usuario:", err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [pagination.current_page, pagination.per_page, fetchUsuarios]
  );

  // Actualizar usuario
  const updateUsuario = useCallback(
    async (id, userData) => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.put(`${API_BASE_URL}/usuarios/${id}`, userData);

        const data = response.data;

        if (data.success) {
          // Refrescar la lista después de actualizar
          await fetchUsuarios(pagination.current_page, pagination.per_page);
          return data.data;
        } else {
          throw new Error(data.message || "Error al actualizar usuario");
        }
      } catch (err) {
        // El backend responde 422 con el motivo real (correo repetido, formato, longitud).
        // Sin esto axios solo deja "Request failed with status code 422" y el usuario no sabe que corregir.
        const motivo =
          err.response?.data?.message ||
          Object.values(err.response?.data?.errors || {})[0]?.[0] ||
          err.message;
        console.error("Error updating usuario:", err);
        setError(motivo);
        throw new Error(motivo);
      } finally {
        setLoading(false);
      }
    },
    [pagination.current_page, pagination.per_page, fetchUsuarios]
  );

  // Eliminar usuario (eliminación lógica)
  const deleteUsuario = useCallback(
    async (id) => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.delete(`${API_BASE_URL}/usuarios/${id}`);

        const data = response.data;

        if (data.success) {
          // Refrescar la lista después de eliminar
          await fetchUsuarios(pagination.current_page, pagination.per_page);
          return true;
        } else {
          throw new Error(data.message || "Error al eliminar usuario");
        }
      } catch (err) {
        console.error("Error deleting usuario:", err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [pagination.current_page, pagination.per_page, fetchUsuarios]
  );

  // Dar de baja definitiva (libera email para reutilización, conserva historial)
  const darDeBajaUsuario = useCallback(
    async (id) => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.post(`${API_BASE_URL}/usuarios/${id}/dar-de-baja`);

        const data = response.data;

        if (data.success) {
          await fetchUsuarios(pagination.current_page, pagination.per_page);
          return data;
        } else {
          throw new Error(data.message || "Error al dar de baja al usuario");
        }
      } catch (err) {
        console.error("Error dando de baja usuario:", err);
        setError(err.message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [pagination.current_page, pagination.per_page, fetchUsuarios]
  );

  // Obtener usuario específico
  const getUsuario = useCallback(async (id) => {
    try {
      // NO setLoading(true) para evitar recarga visual de la tabla
      setError(null);

      const response = await api.get(`${API_BASE_URL}/usuarios/${id}`);

      const data = response.data;

      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || "Error al obtener usuario");
      }
    } catch (err) {
      console.error("Error fetching usuario:", err);
      setError(err.message);
      throw err;
    }
    // NO setLoading(false) porque no se estableció en true
  }, []);

  // Cambiar página
  const changePage = useCallback(
    (page) => {
      fetchUsuarios(page, pagination.per_page);
    },
    [fetchUsuarios, pagination.per_page]
  );

  // Cambiar tamaño de página
  const changePageSize = useCallback(
    (perPage) => {
      fetchUsuarios(1, perPage);
    },
    [fetchUsuarios]
  );

  // Buscar usuarios
  const searchUsuarios = useCallback(
    (searchTerm) => {
      fetchUsuarios(1, pagination.per_page, searchTerm);
    },
    [fetchUsuarios, pagination.per_page]
  );

  // Cargar usuarios al montar el componente
  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  return {
    usuarios,
    loading,
    error,
    pagination,
    fetchUsuarios,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    darDeBajaUsuario,
    getUsuario,
    changePage,
    changePageSize,
    searchUsuarios,
    refresh: () => fetchUsuarios(pagination.current_page, pagination.per_page),
  };
};
