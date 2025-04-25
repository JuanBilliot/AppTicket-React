import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Box,
  Alert,
  CircularProgress,
  Typography
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import api from '../services/api';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

interface ImportTicketsProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ImportTickets: React.FC<ImportTicketsProps> = ({ open, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Por favor seleccione un archivo para importar');
      return;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      setError('Formato de archivo no válido. Por favor use Excel (.xlsx, .xls) o CSV (.csv)');
      return;
    }

    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/tickets/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(response.data.message);
      setFile(null);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error al importar tickets:', err);
      setError(err.response?.data?.error || 'Error al importar tickets. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFile(null);
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Importar Tickets desde Excel</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Seleccione un archivo Excel (.xlsx, .xls) o CSV (.csv) con los tickets a importar.
          El archivo debe contener las siguientes columnas en este orden exacto:
          <br /><br />
          Ticket, Fecha de creacion, Agente, Estado, Colaboradores, Primera Respuesta, SLA de Resolucion, Fecha de cierre, Demora, Usuario
        </DialogContentText>
        
        <Box sx={{ mt: 3, mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Button
            component="label"
            variant="contained"
            startIcon={<CloudUploadIcon />}
            disabled={loading}
            sx={{ mb: 2 }}
          >
            Seleccionar Archivo
            <VisuallyHiddenInput type="file" onChange={handleFileChange} accept=".xlsx,.xls,.csv" />
          </Button>
          
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Archivo seleccionado: {file.name}
            </Typography>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
              {success}
            </Alert>
          )}
          
          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Importando tickets...
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleImport} 
          variant="contained" 
          color="primary" 
          disabled={!file || loading}
        >
          Importar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportTickets;
