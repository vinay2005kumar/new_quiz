import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useCollegeInfo } from '../../hooks/useCollegeInfo';

const CollegeHeader = ({ showFullInfo = false }) => {
  const { 
    name: collegeName, 
    email: collegeEmail, 
    phone: collegePhone, 
    address: collegeAddress,
    website: collegeWebsite,
    establishedYear
  } = useCollegeInfo();

  if (!showFullInfo) {
    return (
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {collegeName}
        </Typography>
        {collegeAddress && (
          <Typography variant="body2" color="text.secondary">
            📍 {collegeAddress}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          {collegeName}
        </Typography>
        
        {collegeAddress && (
          <Typography variant="body1" color="text.secondary" gutterBottom>
            📍 {collegeAddress}
          </Typography>
        )}
        
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 4, 
          mt: 2,
          flexWrap: 'wrap'
        }}>
          {collegeEmail && (
            <Typography variant="body2" color="text.secondary">
              📧 {collegeEmail}
            </Typography>
          )}
          {collegePhone && (
            <Typography variant="body2" color="text.secondary">
              📞 {collegePhone}
            </Typography>
          )}
          {collegeWebsite && (
            <Typography variant="body2" color="text.secondary">
              🌐 {collegeWebsite}
            </Typography>
          )}
          {establishedYear && (
            <Typography variant="body2" color="text.secondary">
              📅 Est. {establishedYear}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default CollegeHeader;
