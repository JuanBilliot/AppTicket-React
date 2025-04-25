import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Box,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Pagination
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ImportTickets from '../components/ImportTickets';

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

interface PaginationInfo {
  total_tickets: number;
  total_pages: number;
  current_page: number;
  per_page: number;
}

const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total_tickets: 0,
    total_pages: 1,
    current_page: 1,
    per_page: 50
  });

  const fetchTickets = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/tickets?page=${page}&per_page=${pagination.per_page}`);
      setTickets(response.data.tickets);
      setPagination(response.data.pagination);
      setFilteredTickets(response.data.tickets);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Error al cargar los tickets. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [pagination.per_page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = tickets.filter(ticket => 
        ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.creation_date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.agent.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ticket.user && ticket.user.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredTickets(filtered);
    } else {
      setFilteredTickets(tickets);
    }
  }, [searchTerm, tickets]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    fetchTickets(page);
  };

  const getStatusColor = (status: string | undefined | null): 'default' | 'error' | 'warning' | 'success' => {
    if (!status) return 'default';
    
    switch (status.toLowerCase()) {
      case 'abierto':
        return 'error';
      case 'en progreso':
        return 'warning';
      case 'cerrado':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleImportSuccess = () => {
    fetchTickets();
  };

  return (
    <div>
      <Typography variant="h4" className="dashboard-header">
        Lista de Tickets
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          placeholder="Buscar tickets..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ width: '40%' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <Box>
          <Tooltip title="Refrescar">
            <IconButton 
              color="primary" 
              onClick={() => fetchTickets(pagination.current_page)}
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Button 
            variant="outlined" 
            startIcon={<CloudUploadIcon />}
            onClick={() => setImportDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Importar
          </Button>
          
          <Button 
            variant="contained" 
            component={Link} 
            to="/tickets/new"
            startIcon={<AddIcon />}
          >
            Nuevo Ticket
          </Button>
        </Box>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <>
          <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'primary.main' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ticket</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha de Creación</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Agente</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Colaboradores</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>SLA de Primera Respuesta</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>SLA de Resolución</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha de Cierre</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Demora</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Usuario</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTickets.length > 0 ? (
                    filteredTickets.map((ticket) => (
                      <TableRow 
                        key={ticket.id}
                        hover
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                        component={Link}
                        to={`/edit-ticket/${ticket.id}`}
                        style={{ textDecoration: 'none' }}
                      >
                        <TableCell>{ticket.ticket_number}</TableCell>
                        <TableCell>{ticket.creation_date}</TableCell>
                        <TableCell>{ticket.agent || '-'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={ticket.status} 
                            color={getStatusColor(ticket.status) as any}
                            size="small"
                            sx={{ fontWeight: 'medium' }}
                          />
                        </TableCell>
                        <TableCell>{ticket.collaborators || '-'}</TableCell>
                        <TableCell>{ticket.first_response || '-'}</TableCell>
                        <TableCell>{ticket.sla_resolution || '-'}</TableCell>
                        <TableCell>{ticket.close_date || '-'}</TableCell>
                        <TableCell>{ticket.delay || '-'}</TableCell>
                        <TableCell>{ticket.user || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 3 }}>
                        No se encontraron tickets
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Paginación */}
          {pagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination 
                count={pagination.total_pages} 
                page={pagination.current_page} 
                onChange={handlePageChange} 
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
      
      <ImportTickets 
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default TicketList;
