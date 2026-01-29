import React from 'react';
import { Box, CircularProgress, Typography, useTheme } from '@mui/material';

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Cargando...', 
  fullScreen = false 
}) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        position: fullScreen ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fullScreen 
          ? 'rgba(255, 255, 255, 0.9)' 
          : 'rgba(255, 255, 255, 0.7)',
        zIndex: theme.zIndex.drawer + 1,
        backdropFilter: 'blur(5px)'
      }}
    >
      <CircularProgress 
        size={60} 
        thickness={4}
        sx={{
          color: theme.palette.primary.main,
          animation: 'pulse 1.5s infinite ease-in-out',
          '@keyframes pulse': {
            '0%': {
              opacity: 1,
              transform: 'scale(0.8)'
            },
            '50%': {
              opacity: 0.8,
              transform: 'scale(1)'
            },
            '100%': {
              opacity: 1,
              transform: 'scale(0.8)'
            }
          }
        }}
      />
      <Typography 
        variant="h6" 
        sx={{ 
          mt: 2, 
          fontWeight: 'medium',
          color: theme.palette.text.primary
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingOverlay;
