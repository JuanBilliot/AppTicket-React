import React from 'react';
import { Typography, Box, Breadcrumbs, Link, SxProps, Theme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Home as HomeIcon } from '@mui/icons-material';

interface PageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    path?: string;
  }>;
  sx?: SxProps<Theme>;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  icon, 
  breadcrumbs = [],
  sx 
}) => {
  return (
    <Box 
      sx={{ 
        mb: 4,
        ...sx
      }}
    >
      {breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 1 }}>
          <Link 
            component={RouterLink} 
            to="/"
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: 'text.secondary',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            <HomeIcon sx={{ mr: 0.5, fontSize: 18 }} />
            Inicio
          </Link>
          
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            
            return isLast ? (
              <Typography 
                key={crumb.label} 
                color="text.primary"
                sx={{ fontWeight: 'medium' }}
              >
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={crumb.label}
                component={RouterLink}
                to={crumb.path || '#'}
                sx={{ 
                  color: 'text.secondary',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}
      
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          borderBottom: '2px solid',
          borderColor: 'primary.main',
          pb: 1
        }}
      >
        {icon && (
          <Box 
            sx={{ 
              mr: 2,
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {icon}
          </Box>
        )}
        <Typography 
          variant="h4" 
          component="h1"
          sx={{ 
            fontWeight: 'bold',
            background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );
};

export default PageHeader;
