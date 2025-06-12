import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  Typography,
  Box,
  Divider,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const EventQuizRegistration = ({ open, onClose, quizId, onSuccess }) => {
  const [quiz, setQuiz] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    college: '',
    department: '',
    year: '',
    rollNumber: '',
    phoneNumber: '',
    // Team specific fields
    isTeamRegistration: false,
    teamName: '',
    teamMembers: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch quiz details when dialog opens
  useEffect(() => {
    if (open && quizId) {
      fetchQuizDetails();
    }
  }, [open, quizId]);

  const fetchQuizDetails = async () => {
    try {
      const response = await api.get(`/api/event-quiz/${quizId}/public`);
      setQuiz(response);

      // Initialize team registration if it's team mode
      if (response.participationMode === 'team') {
        const teamSize = response.teamSize || 1;
        const initialTeamMembers = Array.from({ length: teamSize - 1 }, () => ({
          name: '',
          email: '',
          college: '',
          department: '',
          year: '',
          rollNumber: '',
          phoneNumber: ''
        }));

        setFormData(prev => ({
          ...prev,
          isTeamRegistration: true,
          teamMembers: initialTeamMembers
        }));
      }
    } catch (error) {
      console.error('Error fetching quiz details:', error);
      setError('Failed to load quiz details');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTeamMemberChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {quiz?.participationMode === 'team' ? (
            <GroupIcon color="primary" />
          ) : (
            <PersonIcon color="primary" />
          )}
          <Typography variant="h6">
            {quiz?.participationMode === 'team'
              ? `Team Registration (${quiz?.teamSize || 1} members)`
              : 'Individual Registration'
            }
          </Typography>
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Team Name Field (only for team mode) */}
          {quiz?.participationMode === 'team' && (
            <Box sx={{ mb: 3 }}>
              <TextField
                required
                fullWidth
                label="Team Name"
                name="teamName"
                value={formData.teamName}
                onChange={handleChange}
                sx={{ mb: 2 }}
              />
              <Divider sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Team Leader Details
                </Typography>
              </Divider>
            </Box>
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

          {/* Team Members Section (only for team mode) */}
          {quiz?.participationMode === 'team' && formData.teamMembers.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Team Members ({formData.teamMembers.length} additional members)
                </Typography>
              </Divider>

              {formData.teamMembers.map((member, index) => (
                <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Member {index + 2}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        label="Full Name"
                        value={member.name}
                        onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        label="Email"
                        type="email"
                        value={member.email}
                        onChange={(e) => handleTeamMemberChange(index, 'email', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        label="College/Institution"
                        value={member.college}
                        onChange={(e) => handleTeamMemberChange(index, 'college', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        select
                        label="Department"
                        value={member.department}
                        onChange={(e) => handleTeamMemberChange(index, 'department', e.target.value)}
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
                        value={member.year}
                        onChange={(e) => handleTeamMemberChange(index, 'year', e.target.value)}
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
                        value={member.rollNumber}
                        onChange={(e) => handleTeamMemberChange(index, 'rollNumber', e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        required
                        fullWidth
                        label="Phone Number"
                        value={member.phoneNumber}
                        onChange={(e) => handleTeamMemberChange(index, 'phoneNumber', e.target.value)}
                        inputProps={{ pattern: '[0-9]{10}' }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Box>
          )}
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