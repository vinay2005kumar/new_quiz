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
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Group as GroupIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const EventQuizRegistration = ({ open, onClose, quizId, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
  const [success, setSuccess] = useState(false);

  // Academic data from college settings
  const [academicData, setAcademicData] = useState({
    departments: [],
    years: []
  });

  // Fetch quiz details and academic data when dialog opens
  useEffect(() => {
    if (open && quizId) {
      fetchQuizDetails();
      fetchAcademicData();
    }
  }, [open, quizId]);

  const fetchAcademicData = async () => {
    try {
      // Fetch departments from college settings (now public)
      const deptResponse = await api.get('/api/admin/settings/departments');
      let departments = [];
      if (deptResponse && deptResponse.departments && Array.isArray(deptResponse.departments)) {
        departments = deptResponse.departments.map(dept => dept.name);
      }

      // Fetch academic details for years
      const academicResponse = await api.get('/api/academic-details');
      const academicDetails = Array.isArray(academicResponse) ? academicResponse : [];
      const years = [...new Set(academicDetails.map(detail => detail.year))].filter(Boolean).sort((a, b) => a - b);

      setAcademicData({
        departments: departments.length > 0 ? departments : ['Computer Science and Engineering', 'Electronics and Communication Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Other'],
        years: years.length > 0 ? years : [1, 2, 3, 4]
      });
    } catch (error) {
      console.error('Error fetching academic data:', error);
      // Fallback data
      setAcademicData({
        departments: ['Computer Science and Engineering', 'Electronics and Communication Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Other'],
        years: [1, 2, 3, 4]
      });
    }
  };

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
      setSuccess(true);
      onSuccess();

      // Close dialog after showing success for 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Remove hardcoded arrays - will use AcademicFilter data instead

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          margin: { xs: 1, sm: 2 },
          width: { xs: 'calc(100% - 16px)', sm: 'auto' }
        }
      }}
    >
      <DialogTitle sx={{ 
        fontSize: { xs: '1.1rem', sm: '1.25rem' },
        p: { xs: 1.5, sm: 2 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {quiz?.participationMode === 'team' ? (
            <GroupIcon color="primary" />
          ) : (
            <PersonIcon color="primary" />
          )}
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {quiz?.participationMode === 'team'
              ? `Team Registration (${quiz?.teamSize || 1} members)`
              : 'Individual Registration'
            }
          </Typography>
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body1" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                🎉 Registration Successful!
              </Typography>
              <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                {quiz?.participationMode === 'team'
                  ? `Your team "${formData.teamName}" has been registered for "${quiz.title}". All team members will receive individual emails with login credentials.`
                  : `You have been registered for "${quiz.title}". You will receive an email with your login credentials.`
                }
              </Typography>
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                {error}
              </Typography>
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
                size={isMobile ? "small" : "medium"}
              />
              <Divider sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  Team Leader Details
                </Typography>
              </Divider>
            </Box>
          )}

          <Grid container spacing={isMobile ? 1 : 2}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                size={isMobile ? "small" : "medium"}
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
                size={isMobile ? "small" : "medium"}
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
                size={isMobile ? "small" : "medium"}
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
                size={isMobile ? "small" : "medium"}
              >
                {academicData.departments.map(option => (
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
                size={isMobile ? "small" : "medium"}
              >
                {academicData.years.map(option => (
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
                size={isMobile ? "small" : "medium"}
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
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
          </Grid>

          {/* Team Members Section (only for team mode) */}
          {quiz?.participationMode === 'team' && formData.teamMembers.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  Team Members ({formData.teamMembers.length} additional members)
                </Typography>
              </Divider>

              {formData.teamMembers.map((member, index) => (
                <Box key={index} sx={{ mb: 3, p: { xs: 1, sm: 2 }, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    Member {index + 2}
                  </Typography>
                  <Grid container spacing={isMobile ? 1 : 2}>
                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        label="Full Name"
                        value={member.name}
                        onChange={(e) => handleTeamMemberChange(index, 'name', e.target.value)}
                        size={isMobile ? "small" : "medium"}
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
                        size={isMobile ? "small" : "medium"}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        required
                        fullWidth
                        label="College/Institution"
                        value={member.college}
                        onChange={(e) => handleTeamMemberChange(index, 'college', e.target.value)}
                        size={isMobile ? "small" : "medium"}
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
                        size={isMobile ? "small" : "medium"}
                      >
                        {academicData.departments.map(option => (
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
                        size={isMobile ? "small" : "medium"}
                      >
                        {academicData.years.map(option => (
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
                        size={isMobile ? "small" : "medium"}
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
                        size={isMobile ? "small" : "medium"}
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: { xs: 1.5, sm: 2 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}>
          <Button 
            onClick={onClose}
            fullWidth={isMobile}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1, sm: 1.5 }
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={loading}
            fullWidth={isMobile}
            size={isMobile ? "small" : "medium"}
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1, sm: 1.5 }
            }}
          >
            {loading ? 'Registering...' : 'Register'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventQuizRegistration; 