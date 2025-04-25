import axios from 'axios';

const API_URL = 'http://localhost:5002';

// Configuración de axios
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Servicios para servidores
export const serverService = {
  // Obtener todos los servidores
  getAll: async () => {
    const response = await api.get('/servers');
    return response.data;
  },

  // Obtener un servidor por ID
  getById: async (id: number) => {
    const response = await api.get(`/servers/${id}`);
    return response.data;
  },

  // Crear un nuevo servidor
  create: async (serverData: any) => {
    const response = await api.post('/servers', serverData);
    return response.data;
  },

  // Actualizar un servidor existente
  update: async (id: number, serverData: any) => {
    const response = await api.put(`/servers/${id}`, serverData);
    return response.data;
  },

  // Eliminar un servidor
  delete: async (id: number) => {
    const response = await api.delete(`/servers/${id}`);
    return response.data;
  },

  // Realizar ping a un servidor
  ping: async (ip: string) => {
    const response = await api.post('/ping', { ip });
    return response.data;
  },

  // Iniciar monitoreo de un servidor
  startMonitor: async (ip: string) => {
    const response = await api.post(`/monitor/start/${ip}`);
    return response.data;
  },

  // Obtener datos de monitoreo
  getMonitorData: async (ip: string) => {
    const response = await api.get(`/monitor/data/${ip}`);
    return response.data;
  },

  // Detener monitoreo de un servidor
  stopMonitor: async (ip: string) => {
    const response = await api.post(`/monitor/stop/${ip}`);
    return response.data;
  },
};

// Servicios para tickets
export const ticketService = {
  // Obtener todos los tickets
  getAll: async (page = 1, perPage = 50) => {
    const response = await api.get(`/tickets?page=${page}&per_page=${perPage}`);
    return response.data;
  },

  // Obtener un ticket por ID
  getById: async (id: number) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  // Crear un nuevo ticket
  create: async (ticketData: any) => {
    const response = await api.post('/tickets', ticketData);
    return response.data;
  },

  // Actualizar un ticket existente
  update: async (id: number, ticketData: any) => {
    const response = await api.put(`/tickets/${id}`, ticketData);
    return response.data;
  },

  // Eliminar un ticket
  delete: async (id: number) => {
    const response = await api.delete(`/tickets/${id}`);
    return response.data;
  },
};

export default api;
