import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider,
  Typography,
  Box,
  ListItemButton,
  Avatar,
  useTheme
} from '@mui/material';
import { 
  Dashboard as DashboardIcon,
  ConfirmationNumber as TicketIcon,
  Add as AddIcon,
  ViewKanban as KanbanIcon,
  Assessment as ReportIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  
  const menuItems = [
    { text: 'Estado de Servidores', icon: <DashboardIcon />, path: '/' },
    { text: 'Tickets', icon: <TicketIcon />, path: '/tickets' },
    { text: 'Nuevo Ticket', icon: <AddIcon />, path: '/new-ticket' },
    { text: 'Kanban', icon: <KanbanIcon />, path: '/kanban' },
    { text: 'Informes', icon: <ReportIcon />, path: '/reports' },
    { text: 'Configuración', icon: <SettingsIcon />, path: '/settings' },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          borderRight: 'none',
        },
      }}
    >
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pt: 4,
          pb: 3
        }}
      >
        <Avatar
          sx={{
            width: 70,
            height: 70,
            bgcolor: 'white',
            color: theme.palette.primary.main,
            fontWeight: 'bold',
            fontSize: '2rem',
            mb: 2,
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}
        >
          ST
        </Avatar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontWeight: 'bold', 
            color: 'white',
            textAlign: 'center'
          }}
        >
          Sistema de Tickets
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            mt: 0.5
          }}
        >
          Panel de Administración
        </Typography>
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      
      <List sx={{ px: 1, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem 
            disablePadding
            key={item.text}
            sx={{ mb: 0.5 }}
          >
            <ListItemButton
              component={Link} 
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                py: 1,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.24)',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.8)',
                  minWidth: 40
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: location.pathname === item.path ? 'medium' : 'normal'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Box sx={{ flexGrow: 1 }} />
      
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          v1.0.0 • 2025
        </Typography>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
