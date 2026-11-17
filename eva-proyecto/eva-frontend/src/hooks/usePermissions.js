import { useState, useCallback } from 'react';
import api from '../config/apiClient';

const API_BASE_URL = '/v1';

export const usePermissions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Obtener permisos de un usuario específico
  const fetchUserPermissions = useCallback(async (userId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`${API_BASE_URL}/usuarios/${userId}/permissions`);
      const data = response.data;

      if (data.success) {
        return data.data || [];
      } else {
        throw new Error(data.message || 'Error al obtener permisos');
      }
    } catch (err) {
      console.error('Error fetching user permissions:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Actualizar permisos de un usuario
  const updateUserPermissions = useCallback(async (userId, permissions) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`${API_BASE_URL}/usuarios/${userId}/permissions`, {
        permissions
      });
      const data = response.data;

      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || 'Error al actualizar permisos');
      }
    } catch (err) {
      console.error('Error updating user permissions:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Asignar permisos por defecto basados en el rol
  const assignDefaultPermissions = useCallback(async (userId) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post(`${API_BASE_URL}/usuarios/${userId}/assign-default-permissions`);
      const data = response.data;

      if (data.success) {
        return data;
      } else {
        throw new Error(data.message || 'Error al asignar permisos por defecto');
      }
    } catch (err) {
      console.error('Error assigning default permissions:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener lista de módulos disponibles
  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`${API_BASE_URL}/modulos`);
      const data = response.data;

      if (data.success) {
        return data.data || [];
      } else {
        throw new Error(data.message || 'Error al obtener módulos');
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError(err.message);
      
      // Sin fallback a propósito: la lista que había aquí tenía los ids cambiados
      // (ponía 2 = "equipos industriales" cuando en la base 2 es "usuarios"), y como
      // guardar permisos escribe por modulo_id, bastaba con que fallara esta petición
      // para asignarle al usuario permisos sobre módulos que no eran.
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchUserPermissions,
    updateUserPermissions,
    assignDefaultPermissions,
    fetchModules
  };
};

export default usePermissions;
