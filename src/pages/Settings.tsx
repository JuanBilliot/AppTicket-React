import React, { useState } from 'react';
import {
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  useTheme,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  ColorLens as ThemeIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState({
    name: 'Juan Billiot',
    email: 'juan.billiot@example.com',
    role: 'Administrador'
  });
  const [users, setUsers] = useState([
    { id: 1, name: 'Juan Billiot', email: 'juan.billiot@example.com', role: 'Administrador' },
    { id: 2, name: 'Gabriel Machado', email: 'gabriel.machado@example.com', role: 'Técnico' },
    { id: 3, name: 'Camila Fabre', email: 'camila.fabre@example.com', role: 'Soporte' }
  ]);
  
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSaveSettings = () => {
    // Aquí se guardarían los ajustes en el backend
    setSuccessMessage('Configuración guardada exitosamente');
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleDeleteUser = (id: number) => {
    if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
      setUsers(users.filter(user => user.id !== id));
    }
  };

  return (
    <div>
      <Typography variant="h4" className="dashboard-header">
        Configuración
      </Typography>
      
      <Paper 
        elevation={3} 
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                fontWeight: 'medium'
              }
            }}
          >
            <Tab 
              icon={<PersonIcon />} 
              label="Perfil" 
              iconPosition="start"
            />
            <Tab 
              icon={<NotificationsIcon />} 
              label="Notificaciones" 
              iconPosition="start"
            />
            <Tab 
              icon={<ThemeIcon />} 
              label="Apariencia" 
              iconPosition="start"
            />
            <Tab 
              icon={<SecurityIcon />} 
              label="Usuarios" 
              iconPosition="start"
            />
          </Tabs>
        </Box>
        
        {/* Panel de Perfil */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid sx={{ width: { xs: '100%', md: '33.33%' } }}>
              <Card 
                elevation={2}
                sx={{ 
                  p: 2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  height: '100%'
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    mb: 2,
                    bgcolor: theme.palette.primary.main,
                    fontSize: '3rem'
                  }}
                >
                  {userProfile.name.charAt(0)}
                </Avatar>
                <Typography variant="h6" gutterBottom>
                  {userProfile.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {userProfile.email}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white', 
                    px: 2, 
                    py: 0.5, 
                    borderRadius: 1,
                    mt: 1
                  }}
                >
                  {userProfile.role}
                </Typography>
                <Button 
                  variant="outlined" 
                  size="small" 
                  sx={{ mt: 2 }}
                >
                  Cambiar Foto
                </Button>
              </Card>
            </Grid>
            
            <Grid sx={{ width: { xs: '100%', md: '66.67%' } }}>
              <Card elevation={2} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Información Personal
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2}>
                  <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                    <TextField
                      fullWidth
                      label="Nombre Completo"
                      name="name"
                      value={userProfile.name}
                      onChange={handleProfileChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                    <TextField
                      fullWidth
                      label="Correo Electrónico"
                      name="email"
                      value={userProfile.email}
                      onChange={handleProfileChange}
                      variant="outlined"
                    />
                  </Grid>
                  <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                    <TextField
                      fullWidth
                      label="Contraseña Actual"
                      type="password"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid sx={{ width: { xs: '100%', sm: '50%', md: '50%' } }}>
                    <TextField
                      fullWidth
                      label="Nueva Contraseña"
                      type="password"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid sx={{ width: { xs: '100%', sm: '50%', md: '50%' } }}>
                    <TextField
                      fullWidth
                      label="Confirmar Contraseña"
                      type="password"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        startIcon={<SaveIcon />}
                        onClick={handleSaveSettings}
                      >
                        Guardar Cambios
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Panel de Notificaciones */}
        <TabPanel value={tabValue} index={1}>
          <Card elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Preferencias de Notificación
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={emailNotifications} 
                      onChange={() => setEmailNotifications(!emailNotifications)}
                      color="primary"
                    />
                  }
                  label="Notificaciones por Correo Electrónico"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Recibir actualizaciones de tickets y alertas por correo electrónico
                </Typography>
              </Grid>
              
              <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={pushNotifications} 
                      onChange={() => setPushNotifications(!pushNotifications)}
                      color="primary"
                    />
                  }
                  label="Notificaciones Push"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                  Recibir notificaciones push en el navegador
                </Typography>
              </Grid>
              
              <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Eventos de Notificación
                  </Typography>
                  
                  <FormControlLabel
                    control={<Switch defaultChecked color="primary" />}
                    label="Nuevo ticket asignado"
                  />
                  
                  <FormControlLabel
                    control={<Switch defaultChecked color="primary" />}
                    label="Actualización de ticket"
                  />
                  
                  <FormControlLabel
                    control={<Switch defaultChecked color="primary" />}
                    label="Ticket cerrado"
                  />
                  
                  <FormControlLabel
                    control={<Switch defaultChecked color="primary" />}
                    label="Comentario nuevo"
                  />
                </Box>
              </Grid>
              
              <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSettings}
                  >
                    Guardar Preferencias
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </TabPanel>
        
        {/* Panel de Apariencia */}
        <TabPanel value={tabValue} index={2}>
          <Card elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Personalización de la Interfaz
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={darkMode} 
                      onChange={() => setDarkMode(!darkMode)}
                      color="primary"
                    />
                  }
                  label="Modo Oscuro"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 3 }}>
                  Cambiar entre tema claro y oscuro
                </Typography>
              </Grid>
              
              <Grid sx={{ width: { xs: '100%', sm: '33.33%', md: '33.33%' } }}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: '#1976d2', 
                    color: 'white', 
                    borderRadius: 1,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3
                    }
                  }}
                >
                  <Typography variant="subtitle1">Azul (Predeterminado)</Typography>
                </Box>
              </Grid>
              
              <Grid sx={{ width: { xs: '100%', sm: '33.33%', md: '33.33%' } }}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: '#9c27b0', 
                    color: 'white', 
                    borderRadius: 1,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3
                    }
                  }}
                >
                  <Typography variant="subtitle1">Púrpura</Typography>
                </Box>
              </Grid>
              
              <Grid sx={{ width: { xs: '100%', sm: '33.33%', md: '33.33%' } }}>
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: '#2e7d32', 
                    color: 'white', 
                    borderRadius: 1,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3
                    }
                  }}
                >
                  <Typography variant="subtitle1">Verde</Typography>
                </Box>
              </Grid>
              
              <Grid sx={{ width: { xs: '100%', sm: '100%', md: '100%' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSettings}
                  >
                    Guardar Preferencias
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Card>
        </TabPanel>
        
        {/* Panel de Usuarios */}
        <TabPanel value={tabValue} index={3}>
          <Card elevation={2} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Gestión de Usuarios
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
              >
                Nuevo Usuario
              </Button>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            <List>
              {users.map(user => (
                <ListItem 
                  key={user.id}
                  sx={{ 
                    mb: 1, 
                    bgcolor: 'background.default', 
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                      {user.name.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={user.name} 
                    secondary={
                      <>
                        {user.email}
                        <Typography 
                          component="span" 
                          variant="body2" 
                          sx={{ 
                            ml: 2,
                            bgcolor: 'primary.main', 
                            color: 'white', 
                            px: 1, 
                            py: 0.2, 
                            borderRadius: 1,
                            fontSize: '0.75rem'
                          }}
                        >
                          {user.role}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleDeleteUser(user.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Card>
        </TabPanel>
      </Paper>
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Settings;
