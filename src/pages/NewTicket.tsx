import React, { useState } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Grid, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../services/api';

interface FormData {
  title: string;
  description: string;
  status: string;
  priority: string;
  client: string;
  agent: string;
  collaborator: string;
}

const NewTicket: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    status: 'Abierto',
    priority: 'Media',
    client: '',
    agent: '',
    collaborator: ''
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value as string
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.client) {
      setError('Por favor, complete todos los campos requeridos.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await ticketService.create(formData);
      
      setSuccess(true);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/tickets');
      }, 2000);
      
    } catch (err) {
      console.error('Error al crear ticket:', err);
      setError('Error al crear el ticket. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Typography variant="h4" className="dashboard-header">
        Nuevo Ticket
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Ticket creado exitosamente. Redirigiendo...
        </Alert>
      )}
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid sx={{ width: '100%' }}>
              <TextField
                name="title"
                label="Título *"
                value={formData.title}
                onChange={handleInputChange}
                fullWidth
                required
                variant="outlined"
              />
            </Grid>
            
            <Grid sx={{ width: '100%' }}>
              <TextField
                name="description"
                label="Descripción *"
                value={formData.description}
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
                name="client"
                label="Cliente *"
                value={formData.client}
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
                  onChange={handleSelectChange as any}
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
                  onChange={handleSelectChange as any}
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
                name="collaborator"
                label="Colaborador"
                value={formData.collaborator}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
            </Grid>
            
            <Grid sx={{ width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  onClick={() => navigate('/tickets')}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Ticket'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </div>
  );
};

export default NewTicket;
