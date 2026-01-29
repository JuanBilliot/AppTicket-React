import React from 'react';
import { Card, CardContent, Typography, Box, SxProps, Theme } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  bgColor?: string;
  sx?: SxProps<Theme>;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'white', 
  bgColor = 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
  sx 
}) => {
  return (
    <Card 
      elevation={3}
      sx={{
        height: '100%',
        background: bgColor,
        color: color,
        transition: 'transform 0.3s, box-shadow 0.3s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 12px 20px rgba(0,0,0,0.2)'
        },
        ...sx
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          {icon && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              p: 1
            }}>
              {icon}
            </Box>
          )}
        </Box>
        <Typography variant="h3" component="div" sx={{ mt: 2 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default StatCard;
