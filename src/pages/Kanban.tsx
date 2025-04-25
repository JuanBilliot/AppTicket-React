import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  CircularProgress, 
  Alert,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/api';

interface Ticket {
  id: number;
  ticket_number: string;
  creation_date: string;
  agent: string;
  status: string;
  collaborators: string;
  first_response: string;
  sla_resolution: string;
  close_date: string;
  delay: string;
  user: string;
  details: string;
  priority: string;
  type: string;
  branch: string;
}

const Kanban: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketService.getAll();
      console.log('Respuesta de la API en Kanban:', response);
      // Verificar si la respuesta tiene la nueva estructura con paginación
      if (response.tickets && Array.isArray(response.tickets)) {
        setTickets(response.tickets);
      } else if (Array.isArray(response)) {
        // Estructura antigua
        setTickets(response);
      } else {
        // Fallback en caso de que la respuesta no sea la esperada
        console.error('Formato de respuesta inesperado:', response);
        setTickets([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error al cargar tickets:', err);
      setError('Error al cargar los tickets. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTicket = (id: number) => {
    navigate(`/edit-ticket/${id}`);
  };

  // Función para obtener el color basado en la prioridad
  const getPriorityColor = (prioridad: string) => {
    switch (prioridad.toLowerCase()) {
      case 'alta':
        return 'error';
      case 'media':
        return 'warning';
      case 'baja':
        return 'success';
      default:
        return 'default';
    }
  };

  // Filtrar tickets por estado
  const getTicketsByStatus = (estado: string) => {
    if (!tickets || !Array.isArray(tickets)) {
      console.error('tickets no es un array:', tickets);
      return [];
    }
    
    return tickets.filter(ticket => {
      if (!ticket || ticket.status === undefined || ticket.status === null) {
        return false;
      }
      return ticket.status.toLowerCase() === estado.toLowerCase();
    });
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
        Tablero Kanban
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }} className="kanban-board">
        {/* Columna: Abierto */}
        <Paper 
          elevation={2} 
          sx={{ 
            minWidth: 300, 
            bgcolor: '#f5f5f5', 
            borderRadius: 2, 
            p: 2,
            height: 'fit-content'
          }}
          className="kanban-column"
        >
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              pb: 1, 
              borderBottom: '2px solid #ddd' 
            }}
            className="kanban-column-header"
          >
            Abierto ({getTicketsByStatus('abierto').length})
          </Typography>
          
          {getTicketsByStatus('abierto').map(ticket => (
            <Card 
              key={ticket.id} 
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3
                }
              }}
              className="kanban-card"
              onClick={() => handleEditTicket(ticket.id)}
            >
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  #{ticket.ticket_number} - {ticket.details}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {ticket.creation_date}
                </Typography>
                <Typography variant="body2">
                  <strong>Agente:</strong> {ticket.agent}
                </Typography>
                <Typography variant="body2">
                  <strong>Usuario:</strong> {ticket.user}
                </Typography>
              </CardContent>
              <CardActions sx={{ pt: 0 }}>
                <Chip 
                  label={ticket.priority} 
                  size="small" 
                  color={getPriorityColor(ticket.priority) as any}
                />
              </CardActions>
            </Card>
          ))}
          
          {getTicketsByStatus('abierto').length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
              No hay tickets en esta columna
            </Typography>
          )}
        </Paper>
        
        {/* Columna: En Progreso */}
        <Paper 
          elevation={2} 
          sx={{ 
            minWidth: 300, 
            bgcolor: '#f5f5f5', 
            borderRadius: 2, 
            p: 2,
            height: 'fit-content'
          }}
          className="kanban-column"
        >
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              pb: 1, 
              borderBottom: '2px solid #ddd' 
            }}
            className="kanban-column-header"
          >
            En Progreso ({getTicketsByStatus('en progreso').length})
          </Typography>
          
          {getTicketsByStatus('en progreso').map(ticket => (
            <Card 
              key={ticket.id} 
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3
                }
              }}
              className="kanban-card"
              onClick={() => handleEditTicket(ticket.id)}
            >
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  #{ticket.ticket_number} - {ticket.details}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {ticket.creation_date}
                </Typography>
                <Typography variant="body2">
                  <strong>Agente:</strong> {ticket.agent}
                </Typography>
                <Typography variant="body2">
                  <strong>Usuario:</strong> {ticket.user}
                </Typography>
              </CardContent>
              <CardActions sx={{ pt: 0 }}>
                <Chip 
                  label={ticket.priority} 
                  size="small" 
                  color={getPriorityColor(ticket.priority) as any}
                />
              </CardActions>
            </Card>
          ))}
          
          {getTicketsByStatus('en progreso').length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
              No hay tickets en esta columna
            </Typography>
          )}
        </Paper>
        
        {/* Columna: Pendiente */}
        <Paper 
          elevation={2} 
          sx={{ 
            minWidth: 300, 
            bgcolor: '#f5f5f5', 
            borderRadius: 2, 
            p: 2,
            height: 'fit-content'
          }}
          className="kanban-column"
        >
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              pb: 1, 
              borderBottom: '2px solid #ddd' 
            }}
            className="kanban-column-header"
          >
            Pendiente ({getTicketsByStatus('pendiente').length})
          </Typography>
          
          {getTicketsByStatus('pendiente').map(ticket => (
            <Card 
              key={ticket.id} 
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3
                }
              }}
              className="kanban-card"
              onClick={() => handleEditTicket(ticket.id)}
            >
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  #{ticket.ticket_number} - {ticket.details}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {ticket.creation_date}
                </Typography>
                <Typography variant="body2">
                  <strong>Agente:</strong> {ticket.agent}
                </Typography>
                <Typography variant="body2">
                  <strong>Usuario:</strong> {ticket.user}
                </Typography>
              </CardContent>
              <CardActions sx={{ pt: 0 }}>
                <Chip 
                  label={ticket.priority} 
                  size="small" 
                  color={getPriorityColor(ticket.priority) as any}
                />
              </CardActions>
            </Card>
          ))}
          
          {getTicketsByStatus('pendiente').length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
              No hay tickets en esta columna
            </Typography>
          )}
        </Paper>
        
        {/* Columna: Resuelto */}
        <Paper 
          elevation={2} 
          sx={{ 
            minWidth: 300, 
            bgcolor: '#f5f5f5', 
            borderRadius: 2, 
            p: 2,
            height: 'fit-content'
          }}
          className="kanban-column"
        >
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              pb: 1, 
              borderBottom: '2px solid #ddd' 
            }}
            className="kanban-column-header"
          >
            Resuelto ({getTicketsByStatus('resuelto').length})
          </Typography>
          
          {getTicketsByStatus('resuelto').map(ticket => (
            <Card 
              key={ticket.id} 
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3
                }
              }}
              className="kanban-card"
              onClick={() => handleEditTicket(ticket.id)}
            >
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  #{ticket.ticket_number} - {ticket.details}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {ticket.creation_date}
                </Typography>
                <Typography variant="body2">
                  <strong>Agente:</strong> {ticket.agent}
                </Typography>
                <Typography variant="body2">
                  <strong>Usuario:</strong> {ticket.user}
                </Typography>
              </CardContent>
              <CardActions sx={{ pt: 0 }}>
                <Chip 
                  label={ticket.priority} 
                  size="small" 
                  color={getPriorityColor(ticket.priority) as any}
                />
              </CardActions>
            </Card>
          ))}
          
          {getTicketsByStatus('resuelto').length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
              No hay tickets en esta columna
            </Typography>
          )}
        </Paper>
        
        {/* Columna: Cerrado */}
        <Paper 
          elevation={2} 
          sx={{ 
            minWidth: 300, 
            bgcolor: '#f5f5f5', 
            borderRadius: 2, 
            p: 2,
            height: 'fit-content'
          }}
          className="kanban-column"
        >
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2, 
              pb: 1, 
              borderBottom: '2px solid #ddd' 
            }}
            className="kanban-column-header"
          >
            Cerrado ({getTicketsByStatus('cerrado').length})
          </Typography>
          
          {getTicketsByStatus('cerrado').map(ticket => (
            <Card 
              key={ticket.id} 
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3
                }
              }}
              className="kanban-card"
              onClick={() => handleEditTicket(ticket.id)}
            >
              <CardContent sx={{ pb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  #{ticket.ticket_number} - {ticket.details}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {ticket.creation_date}
                </Typography>
                <Typography variant="body2">
                  <strong>Agente:</strong> {ticket.agent}
                </Typography>
                <Typography variant="body2">
                  <strong>Usuario:</strong> {ticket.user}
                </Typography>
              </CardContent>
              <CardActions sx={{ pt: 0 }}>
                <Chip 
                  label={ticket.priority} 
                  size="small" 
                  color={getPriorityColor(ticket.priority) as any}
                />
              </CardActions>
            </Card>
          ))}
          
          {getTicketsByStatus('cerrado').length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
              No hay tickets en esta columna
            </Typography>
          )}
        </Paper>
      </Box>
    </div>
  );
};

export default Kanban;
