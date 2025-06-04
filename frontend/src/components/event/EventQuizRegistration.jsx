import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert
} from '@mui/material';
import api from '../../config/axios';

const EventQuizRegistration = ({ open, onClose, quizId, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    college: '',
    department: '',
    year: '',
    rollNumber: '',
    phoneNumber: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post(`/api/event-quiz/${quizId}/register`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const yearOptions = ['1', '2', '3', '4'];
  const departmentOptions = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'Other'];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Quiz Registration</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="College/Institution"
                name="college"
                value={formData.college}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                select
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleChange}
              >
                {departmentOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                select
                label="Year"
                name="year"
                value={formData.year}
                onChange={handleChange}
              >
                {yearOptions.map(option => (
                  <MenuItem key={option} value={option}>
                    Year {option}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Roll Number"
                name="rollNumber"
                value={formData.rollNumber}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                inputProps={{ pattern: '[0-9]{10}' }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventQuizRegistration; 