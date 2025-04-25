import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Grid, 
  CircularProgress, 
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Card,
  CardContent,
  CardHeader,
  Divider,
  useTheme
} from '@mui/material';
import { ticketService } from '../services/api';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

interface Ticket {
  id: number;
  date: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  agent: string;
  collaborator: string;
  client: string;
}

const Reports: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<string>('status');
  const theme = useTheme();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const data = await ticketService.getAll();
      setTickets(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar tickets:', err);
      setError('Error al cargar los tickets. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleReportTypeChange = (event: SelectChangeEvent) => {
    setReportType(event.target.value);
  };

  // Función para contar tickets por categoría
  const countTicketsByCategory = (category: string) => {
    const counts: { [key: string]: number } = {};
    
    tickets.forEach(ticket => {
      const value = ticket[category as keyof Ticket]?.toString().toLowerCase() || 'no asignado';
      counts[value] = (counts[value] || 0) + 1;
    });
    
    return counts;
  };

  // Función para obtener datos para gráfico de pastel
  const getPieChartData = (category: string) => {
    const counts = countTicketsByCategory(category);
    const labels = Object.keys(counts).map(key => key.charAt(0).toUpperCase() + key.slice(1));
    
    // Colores para el gráfico
    const backgroundColors = [
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)',
      'rgba(40, 159, 64, 0.8)',
      'rgba(210, 199, 199, 0.8)',
    ];
    
    return {
      labels,
      datasets: [
        {
          data: Object.values(counts),
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderColor: backgroundColors.slice(0, labels.length).map(color => color.replace('0.8', '1')),
          borderWidth: 1,
        },
      ],
    };
  };

  // Función para obtener datos para gráfico de barras
  const getBarChartData = (category: string) => {
    const counts = countTicketsByCategory(category);
    const labels = Object.keys(counts).map(key => key.charAt(0).toUpperCase() + key.slice(1));
    
    return {
      labels,
      datasets: [
        {
          label: `Tickets por ${category}`,
          data: Object.values(counts),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  // Función para agrupar tickets por mes
  const getTicketsByMonth = () => {
    const monthCounts: { [key: string]: number } = {};
    
    tickets.forEach(ticket => {
      if (ticket.date) {
        // Asumiendo que la fecha está en formato 'YYYY-MM-DD' o similar
        const dateParts = ticket.date.split('-');
        if (dateParts.length >= 2) {
          const yearMonth = `${dateParts[0]}-${dateParts[1]}`;
          monthCounts[yearMonth] = (monthCounts[yearMonth] || 0) + 1;
        }
      }
    });
    
    // Ordenar por fecha
    const sortedMonths = Object.keys(monthCounts).sort();
    
    return {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleString('es-ES', { month: 'short', year: 'numeric' });
      }),
      counts: sortedMonths.map(month => monthCounts[month]),
    };
  };

  // Función para obtener datos para gráfico de línea (tendencia temporal)
  const getLineChartData = () => {
    const { labels, counts } = getTicketsByMonth();
    
    return {
      labels,
      datasets: [
        {
          label: 'Tickets por mes',
          data: counts,
          fill: false,
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          tension: 0.1,
        },
      ],
    };
  };

  // Opciones para gráficos
  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  // Calcular estadísticas generales
  const calculateStats = () => {
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status.toLowerCase() === 'abierto').length;
    const closedTickets = tickets.filter(t => t.status.toLowerCase() === 'cerrado').length;
    const highPriority = tickets.filter(t => t.priority.toLowerCase() === 'alta').length;
    
    return {
      total: totalTickets,
      open: openTickets,
      closed: closedTickets,
      highPriority,
      openPercentage: totalTickets ? Math.round((openTickets / totalTickets) * 100) : 0,
      closedPercentage: totalTickets ? Math.round((closedTickets / totalTickets) * 100) : 0,
      highPriorityPercentage: totalTickets ? Math.round((highPriority / totalTickets) * 100) : 0,
    };
  };

  const stats = calculateStats();

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
        Informes y Estadísticas
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper className="dashboard-section" elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="report-type-label">Tipo de Informe</InputLabel>
            <Select
              labelId="report-type-label"
              id="report-type"
              value={reportType}
              label="Tipo de Informe"
              onChange={handleReportTypeChange}
            >
              <MenuItem value="status">Por Estado</MenuItem>
              <MenuItem value="priority">Por Prioridad</MenuItem>
              <MenuItem value="agent">Por Agente</MenuItem>
              <MenuItem value="client">Por Cliente</MenuItem>
              <MenuItem value="time">Tendencia Temporal</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
      <Grid container spacing={3}>
        {reportType !== 'time' ? (
          <>
            <Grid sx={{ width: { xs: '100%', md: '50%' } }}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2, 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Distribución de Tickets por {reportType === 'status' ? 'Estado' : 
                                              reportType === 'priority' ? 'Prioridad' : 
                                              reportType === 'agent' ? 'Agente' : 'Cliente'}
                </Typography>
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                  <Pie 
                    data={getPieChartData(reportType)} 
                    options={pieOptions} 
                  />
                </Box>
              </Paper>
            </Grid>
            <Grid sx={{ width: { xs: '100%', md: '50%' } }}>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 2, 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Tickets por {reportType === 'status' ? 'Estado' : 
                              reportType === 'priority' ? 'Prioridad' : 
                              reportType === 'agent' ? 'Agente' : 'Cliente'}
                </Typography>
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                  <Bar 
                    data={getBarChartData(reportType)} 
                    options={barOptions} 
                  />
                </Box>
              </Paper>
            </Grid>
          </>
        ) : (
          <Grid sx={{ width: '100%' }}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 2,
                height: '400px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography variant="h6" gutterBottom>
                Tendencia de Tickets a lo Largo del Tiempo
              </Typography>
              <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
                <Line 
                  data={getLineChartData()} 
                  options={lineOptions} 
                />
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
      </Paper>
      
      <Card sx={{ mb: 3 }}>
        <CardHeader 
          title="Resumen General" 
          sx={{ 
            backgroundColor: theme.palette.primary.main, 
            color: theme.palette.primary.contrastText 
          }} 
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid sx={{ width: { xs: '100%', sm: '50%', md: '25%' } }}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" color="primary">{stats.total}</Typography>
                <Typography variant="body1">Total de Tickets</Typography>
              </Box>
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%', md: '25%' } }}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" sx={{ color: 'success.main' }}>{stats.open}</Typography>
                <Typography variant="body1">Tickets Abiertos ({stats.openPercentage}%)</Typography>
              </Box>
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%', md: '25%' } }}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" sx={{ color: 'info.main' }}>{stats.closed}</Typography>
                <Typography variant="body1">Tickets Cerrados ({stats.closedPercentage}%)</Typography>
              </Box>
            </Grid>
            <Grid sx={{ width: { xs: '100%', sm: '50%', md: '25%' } }}>
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="h4" sx={{ color: 'error.main' }}>{stats.highPriority}</Typography>
                <Typography variant="body1">Alta Prioridad ({stats.highPriorityPercentage}%)</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Paper className="dashboard-section" elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Resumen de Rendimiento
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          <Grid sx={{ width: { xs: '100%', md: '33.33%' } }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Tickets por Estado</Typography>
              <Box sx={{ height: 200 }}>
                <Pie 
                  data={getPieChartData('status')} 
                  options={{
                    ...pieOptions,
                    plugins: {
                      ...pieOptions.plugins,
                      legend: {
                        ...pieOptions.plugins.legend,
                        position: 'bottom' as const
                      }
                    }
                  }} 
                />
              </Box>
            </Box>
          </Grid>
          <Grid sx={{ width: { xs: '100%', md: '33.33%' } }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Tickets por Prioridad</Typography>
              <Box sx={{ height: 200 }}>
                <Pie 
                  data={getPieChartData('priority')} 
                  options={{
                    ...pieOptions,
                    plugins: {
                      ...pieOptions.plugins,
                      legend: {
                        ...pieOptions.plugins.legend,
                        position: 'bottom' as const
                      }
                    }
                  }} 
                />
              </Box>
            </Box>
          </Grid>
          <Grid sx={{ width: { xs: '100%', md: '33.33%' } }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Tickets por Agente</Typography>
              <Box sx={{ height: 200 }}>
                <Pie 
                  data={getPieChartData('agent')} 
                  options={{
                    ...pieOptions,
                    plugins: {
                      ...pieOptions.plugins,
                      legend: {
                        ...pieOptions.plugins.legend,
                        position: 'bottom' as const
                      }
                    }
                  }} 
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
};

export default Reports;
