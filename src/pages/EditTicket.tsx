import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

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

interface FormData {
  ticket_number: string;
  details: string;
  status: string;
  priority: string;
  user: string;
  agent: string;
  collaborators: string;
}

const EditTicket: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<FormData>({
    ticket_number: '',
    details: '',
    status: 'Abierto',
    priority: 'Media',
    user: '',
    agent: '',
    collaborators: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/tickets/${id}`);
        const ticket: Ticket = response.data;
        
        setFormData({
          ticket_number: ticket.ticket_number,
          details: ticket.details,
          status: ticket.status,
          priority: ticket.priority,
          user: ticket.user,
          agent: ticket.agent,
          collaborators: ticket.collaborators
        });
        
        setError(null);
      } catch (err) {
        console.error('Error al cargar ticket:', err);
        setError('Error al cargar el ticket. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTicket();
  }, [id]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      await api.put(`/tickets/${id}`, {
        ticket_number: formData.ticket_number,
        details: formData.details,
        status: formData.status,
        priority: formData.priority,
        user: formData.user,
        agent: formData.agent,
        collaborators: formData.collaborators
      });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/tickets');
      }, 2000);
      
    } catch (err) {
      console.error('Error al actualizar ticket:', err);
      setError('Error al actualizar el ticket. Por favor, intente nuevamente.');
      setSaving(false);
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm('¿Está seguro de que desea eliminar este ticket? Esta acción no se puede deshacer.')) {
      try {
        setSaving(true);
        await api.delete(`/tickets/${id}`);
        setSuccess(true);
        setTimeout(() => {
          navigate('/tickets');
        }, 2000);
      } catch (err) {
        console.error('Error al eliminar ticket:', err);
        setError('Error al eliminar el ticket. Por favor, intente nuevamente.');
        setSaving(false);
      }
    }
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
        Editar Ticket #{id}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Ticket actualizado exitosamente. Redirigiendo...
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid sx={{ width: '100%' }}>
              <TextField
                name="ticket_number"
                label="Número de Ticket *"
                value={formData.ticket_number}
                onChange={handleInputChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            
            <Grid sx={{ width: '100%' }}>
              <TextField
                name="details"
                label="Detalles *"
                value={formData.details}
                onChange={handleInputChange}
                fullWidth
                required
                multiline
                rows={4}
                variant="outlined"
              />
            </Grid>
            
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                name="user"
                label="Usuario *"
                value={formData.user}
                onChange={handleInputChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Estado</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleSelectChange}
                  label="Estado"
                >
                  <MenuItem value="Abierto">Abierto</MenuItem>
                  <MenuItem value="En Progreso">En Progreso</MenuItem>
                  <MenuItem value="Pendiente">Pendiente</MenuItem>
                  <MenuItem value="Resuelto">Resuelto</MenuItem>
                  <MenuItem value="Cerrado">Cerrado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Prioridad</InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleSelectChange}
                  label="Prioridad"
                >
                  <MenuItem value="Alta">Alta</MenuItem>
                  <MenuItem value="Media">Media</MenuItem>
                  <MenuItem value="Baja">Baja</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                name="agent"
                label="Agente"
                value={formData.agent}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            
            <Grid sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                name="collaborators"
                label="Colaboradores"
                value={formData.collaborators}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            
            <Grid sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  onClick={() => navigate('/tickets')}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    onClick={handleDelete}
                    sx={{ mr: 1 }}
                    disabled={saving}
                  >
                    Eliminar
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    disabled={saving}
                  >
                    {saving ? 'Guardando...' : 'Actualizar Ticket'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </div>
  );
};

export default EditTicket;
