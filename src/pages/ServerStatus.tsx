import React, { useState, useEffect, useRef } from 'react';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle,
  TextField,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { serverService } from '../services/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Interfaces para tipado
interface Server {
  id: number;
  branch: string;
  branch_code: string;
  dyndns: string;
  primary_service_provider: string;
  primary_service_ip: string;
  primary_service_speed: string;
  secondary_service_provider: string;
  secondary_service_ip: string;
  secondary_service_speed: string;
}

interface PingResult {
  success: boolean;
  message: string;
  latency: number;
  packet_loss: number;
}

interface MonitorData {
  latencies: number[];
  current_latency: number;
  avg_latency: number;
  loss_percentage: number;
  total_packets: number;
  lost_packets: number;
}

const ServerStatus: React.FC = () => {
  // Estados
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [newServer, setNewServer] = useState<Partial<Server>>({});
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [showPingResult, setShowPingResult] = useState<boolean>(false);
  const [monitoredIps, setMonitoredIps] = useState<{ [key: string]: boolean }>({});
  const [monitorData, setMonitorData] = useState<{ [key: string]: MonitorData }>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [serverToDelete, setServerToDelete] = useState<number | null>(null);

  // Referencias para los intervalos de monitoreo
  const monitorIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Cargar servidores al montar el componente
  useEffect(() => {
    fetchServers();
  }, []);

  // Limpiar intervalos al desmontar
  useEffect(() => {
    return () => {
      Object.values(monitorIntervals.current).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, []);

  // Función para cargar servidores
  const fetchServers = async () => {
    try {
      setLoading(true);
      const data = await serverService.getAll();
      setServers(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar servidores:', err);
      setError('Error al cargar los servidores. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editingServer) {
      setEditingServer({ ...editingServer, [name]: value });
    } else {
      setNewServer({ ...newServer, [name]: value });
    }
  };

  // Abrir diálogo para agregar/editar servidor
  const handleOpenDialog = (server: Server | null = null) => {
    if (server) {
      setEditingServer(server);
    } else {
      setNewServer({});
    }
    setOpenDialog(true);
  };

  // Cerrar diálogo
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingServer(null);
    setNewServer({});
  };

  // Guardar servidor (crear o actualizar)
  const handleSaveServer = async () => {
    try {
      if (editingServer) {
        await serverService.update(editingServer.id, editingServer);
      } else {
        await serverService.create(newServer);
      }
      fetchServers();
      handleCloseDialog();
    } catch (err) {
      console.error('Error al guardar servidor:', err);
      setError('Error al guardar el servidor. Por favor, intente nuevamente.');
    }
  };

  // Confirmar eliminación de servidor
  const handleConfirmDelete = (serverId: number) => {
    setServerToDelete(serverId);
    setDeleteConfirmOpen(true);
  };

  // Eliminar servidor
  const handleDeleteServer = async () => {
    if (serverToDelete !== null) {
      try {
        await serverService.delete(serverToDelete);
        fetchServers();
        setDeleteConfirmOpen(false);
        setServerToDelete(null);
      } catch (err) {
        console.error('Error al eliminar servidor:', err);
        setError('Error al eliminar el servidor. Por favor, intente nuevamente.');
      }
    }
  };

  // Realizar ping a un servidor
  const handlePing = async (ip: string) => {
    try {
      const result = await serverService.ping(ip);
      setPingResult(result);
      setShowPingResult(true);
    } catch (err) {
      console.error('Error al realizar ping:', err);
      setPingResult({
        success: false,
        message: 'Error al realizar ping. Por favor, intente nuevamente.',
        latency: 0,
        packet_loss: 100
      });
      setShowPingResult(true);
    }
  };

  // Iniciar/detener monitoreo
  const toggleMonitoring = async (ip: string) => {
    if (monitoredIps[ip]) {
      // Detener monitoreo
      try {
        await serverService.stopMonitor(ip);
        clearInterval(monitorIntervals.current[ip]);
        delete monitorIntervals.current[ip];
        setMonitoredIps(prev => ({ ...prev, [ip]: false }));
      } catch (err) {
        console.error('Error al detener monitoreo:', err);
      }
    } else {
      // Iniciar monitoreo
      try {
        await serverService.startMonitor(ip);
        setMonitoredIps(prev => ({ ...prev, [ip]: true }));
        
        // Configurar intervalo para actualizar datos
        const interval = setInterval(async () => {
          try {
            const data = await serverService.getMonitorData(ip);
            setMonitorData(prev => ({ ...prev, [ip]: data }));
          } catch (err) {
            console.error('Error al obtener datos de monitoreo:', err);
          }
        }, 2000);
        
        monitorIntervals.current[ip] = interval;
      } catch (err) {
        console.error('Error al iniciar monitoreo:', err);
      }
    }
  };

  // Opciones para el gráfico
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Latencia (ms)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Tiempo'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  };

  // Preparar datos para el gráfico
  const getChartData = (ip: string) => {
    const data = monitorData[ip]?.latencies || [];
    const labels = Array.from({ length: data.length }, (_, i) => `${i + 1}`);
    
    return {
      labels,
      datasets: [
        {
          label: 'Latencia',
          data: data,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1
        }
      ]
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div>
      <Typography variant="h4" className="dashboard-header">
        Datos de Conexión en Sucursales
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper className="dashboard-section servers-section" elevation={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" className="section-title">
            Sucursales
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => handleOpenDialog()}
          >
            Agregar Servidor
          </Button>
        </Box>
        
        <Grid container spacing={3} className="servers-grid">
          {servers.map((server) => (
            <Grid sx={{ width: { xs: '100%', md: '50%' } }} key={server.id}>
              <Paper className="server-card" elevation={2}>
                <Box className="server-header">
                  <Typography variant="h6" className="server-title">
                    {server.branch} ({server.branch_code})
                  </Typography>
                  <Box className="button-group">
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="primary"
                      onClick={() => handleOpenDialog(server)}
                    >
                      Editar
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="error"
                      onClick={() => handleConfirmDelete(server.id)}
                    >
                      Eliminar
                    </Button>
                  </Box>
                </Box>
                
                <Box className="server-details">
                  <Box className="server-info">
                    <Typography><strong>Proveedor Principal:</strong> {server.primary_service_provider} ({server.primary_service_speed})</Typography>
                  </Box>
                  <Box className="server-info">
                    <Typography>
                      <strong>IP Principal:</strong> <span className="terminal">{server.primary_service_ip}</span>
                    </Typography>
                    <Box className="button-group">
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="info"
                        onClick={() => handlePing(server.primary_service_ip)}
                      >
                        Ping
                      </Button>
                    </Box>
                  </Box>
                  
                  {server.secondary_service_ip && (
                    <>
                      <Box className="server-info">
                        <Typography><strong>Proveedor Secundario:</strong> {server.secondary_service_provider} ({server.secondary_service_speed})</Typography>
                      </Box>
                      <Box className="server-info">
                        <Typography>
                          <strong>IP Secundaria:</strong> <span className="terminal">{server.secondary_service_ip}</span>
                        </Typography>
                        <Box className="button-group">
                          <Button 
                            size="small" 
                            variant="outlined" 
                            color="info"
                            onClick={() => handlePing(server.secondary_service_ip)}
                          >
                            Ping
                          </Button>
                        </Box>
                      </Box>
                    </>
                  )}
                  
                  {server.dyndns && (
                    <Box className="server-info">
                      <Typography>
                        <strong>DynDNS:</strong> <span className="terminal">
                          <a href={server.dyndns} target="_blank" rel="noopener noreferrer">{server.dyndns}</a>
                        </span>
                      </Typography>
                    </Box>
                  )}
                  
                  <Box className="monitor-buttons" sx={{ mt: 2 }}>
                    <Button 
                      variant={monitoredIps[server.primary_service_ip] ? "contained" : "outlined"}
                      color={monitoredIps[server.primary_service_ip] ? "secondary" : "primary"}
                      size="small"
                      onClick={() => toggleMonitoring(server.primary_service_ip)}
                    >
                      {monitoredIps[server.primary_service_ip] ? "Detener Monitoreo Principal" : "Monitorear Principal"}
                    </Button>
                    
                    {server.secondary_service_ip && (
                      <Button 
                        variant={monitoredIps[server.secondary_service_ip] ? "contained" : "outlined"}
                        color={monitoredIps[server.secondary_service_ip] ? "secondary" : "primary"}
                        size="small"
                        sx={{ ml: 1 }}
                        onClick={() => toggleMonitoring(server.secondary_service_ip)}
                      >
                        {monitoredIps[server.secondary_service_ip] ? "Detener Monitoreo Secundario" : "Monitorear Secundario"}
                      </Button>
                    )}
                  </Box>
                  
                  {monitoredIps[server.primary_service_ip] && (
                    <Box className="ping-monitor" sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                      <Box className="chart-container" sx={{ height: 200 }}>
                        <Line options={chartOptions} data={getChartData(server.primary_service_ip)} />
                      </Box>
                      <Grid container spacing={2} className="ping-stats-grid">
                        <Grid sx={{ width: { xs: '50%' } }}>
                          <Paper className="stat-item" elevation={1}>
                            <Typography className="stat-label">Latencia:</Typography>
                            <Typography>{monitorData[server.primary_service_ip]?.current_latency.toFixed(2) || '--'} ms</Typography>
                          </Paper>
                          <Paper className="stat-item" elevation={1}>
                            <Typography className="stat-label">Pérdida:</Typography>
                            <Typography>{monitorData[server.primary_service_ip]?.loss_percentage.toFixed(2) || '--'}%</Typography>
                          </Paper>
                        </Grid>
                        <Grid sx={{ width: { xs: '50%' } }}>
                          <Paper className="stat-item" elevation={1}>
                            <Typography className="stat-label">Latencia Prom:</Typography>
                            <Typography>{monitorData[server.primary_service_ip]?.avg_latency.toFixed(2) || '--'} ms</Typography>
                          </Paper>
                          <Paper className="stat-item" elevation={1}>
                            <Typography className="stat-label">Paquetes Perdidos:</Typography>
                            <Typography>{monitorData[server.primary_service_ip]?.lost_packets || 0}</Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                  
                  {server.secondary_service_ip && monitoredIps[server.secondary_service_ip] && (
                    <Box className="ping-monitor" sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                      <Box className="chart-container" sx={{ height: 200 }}>
                        <Line options={chartOptions} data={getChartData(server.secondary_service_ip)} />
                      </Box>
                      <Grid container spacing={2} className="ping-stats-grid">
                        <Grid sx={{ width: { xs: '50%' } }}>
                          <Paper className="stat-item" elevation={1}>
                            <Typography className="stat-label">Latencia:</Typography>
                            <Typography>{monitorData[server.secondary_service_ip]?.current_latency.toFixed(2) || '--'} ms</Typography>
                          </Paper>
                          <Paper className="stat-item" elevation={1}>
                            <Typography className="stat-label">Pérdida:</Typography>
                            <Typography>{monitorData[server.secondary_service_ip]?.loss_percentage.toFixed(2) || '--'}%</Typography>
                          </Paper>
                        </Grid>
                        <Grid sx={{ width: { xs: '50%' } }}>
                          <Paper className="stat-item" elevation={1}>
                            <Typography className="stat-label">Latencia Prom:</Typography>
                            <Typography>{monitorData[server.secondary_service_ip]?.avg_latency.toFixed(2) || '--'} ms</Typography>
                          </Paper>
                          <Paper className="stat-item" elevation={1}>
                            <Typography className="stat-label">Paquetes Perdidos:</Typography>
                            <Typography>{monitorData[server.secondary_service_ip]?.lost_packets || 0}</Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
      
      {/* Diálogo para agregar/editar servidor */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingServer ? 'Editar Servidor' : 'Agregar Nuevo Servidor'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                margin="dense"
                name="branch"
                label="Nombre de Sucursal"
                type="text"
                fullWidth
                variant="outlined"
                value={editingServer?.branch || newServer.branch || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                margin="dense"
                name="branch_code"
                label="Código de Sucursal"
                type="text"
                fullWidth
                variant="outlined"
                value={editingServer?.branch_code || newServer.branch_code || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid sx={{ width: { xs: '100%' } }}>
              <TextField
                margin="dense"
                name="dyndns"
                label="DynDNS"
                type="text"
                fullWidth
                variant="outlined"
                value={editingServer?.dyndns || newServer.dyndns || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                margin="dense"
                name="primary_service_provider"
                label="Proveedor Principal"
                type="text"
                fullWidth
                variant="outlined"
                value={editingServer?.primary_service_provider || newServer.primary_service_provider || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                margin="dense"
                name="primary_service_ip"
                label="IP Principal"
                type="text"
                fullWidth
                variant="outlined"
                value={editingServer?.primary_service_ip || newServer.primary_service_ip || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                margin="dense"
                name="primary_service_speed"
                label="Velocidad Principal"
                type="text"
                fullWidth
                variant="outlined"
                value={editingServer?.primary_service_speed || newServer.primary_service_speed || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                margin="dense"
                name="secondary_service_provider"
                label="Proveedor Secundario"
                type="text"
                fullWidth
                variant="outlined"
                value={editingServer?.secondary_service_provider || newServer.secondary_service_provider || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                margin="dense"
                name="secondary_service_ip"
                label="IP Secundaria"
                type="text"
                fullWidth
                variant="outlined"
                value={editingServer?.secondary_service_ip || newServer.secondary_service_ip || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                margin="dense"
                name="secondary_service_speed"
                label="Velocidad Secundaria"
                type="text"
                fullWidth
                variant="outlined"
                value={editingServer?.secondary_service_speed || newServer.secondary_service_speed || ''}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleSaveServer} color="primary" variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para confirmar eliminación */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Está seguro de que desea eliminar este servidor? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteServer} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo para mostrar resultados de ping */}
      <Dialog
        open={showPingResult}
        onClose={() => setShowPingResult(false)}
      >
        <DialogTitle>Resultado de Ping</DialogTitle>
        <DialogContent>
          {pingResult && (
            <Box>
              <Typography variant="body1" gutterBottom>
                {pingResult.message}
              </Typography>
              <Grid container spacing={2}>
                <Grid sx={{ width: { xs: '50%' } }}>
                  <Paper className="stat-item" elevation={1}>
                    <Typography className="stat-label">Latencia:</Typography>
                    <Typography>{pingResult.latency !== undefined ? `${pingResult.latency.toFixed(2)} ms` : 'N/A'}</Typography>
                  </Paper>
                </Grid>
                <Grid sx={{ width: { xs: '50%' } }}>
                  <Paper className="stat-item" elevation={1}>
                    <Typography className="stat-label">Pérdida de Paquetes:</Typography>
                    <Typography>{pingResult.packet_loss !== undefined ? `${pingResult.packet_loss.toFixed(2)}%` : 'N/A'}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPingResult(false)} color="primary">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ServerStatus;
