import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Chip,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import api from '../../config/axios';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    departments: [],
    year: '',
    semester: '',
    section: '',
    admissionNumber: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        departments: user.departments || [],
        year: user.year || '',
        semester: user.semester || '',
        section: user.section || '',
        admissionNumber: user.admissionNumber || ''
      }));
    }
    fetchDepartments();
  }, [user]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/admin/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let updateData = {};

      // Admin can update all fields
      if (user.role === 'admin') {
        updateData = {
          name: formData.name,
          email: formData.email,
          department: formData.department,
          departments: formData.departments
        };
      }
      // Faculty can update name, email, and departments
      else if (user.role === 'faculty') {
        updateData = {
          name: formData.name,
          email: formData.email,
          departments: formData.departments
        };
      }
      // Students and event users can only update password (handled separately)
      else {
        setError('Students and event users can only update their password');
        setLoading(false);
        return;
      }

      const response = await api.put('/api/auth/profile', updateData);
      updateUser(response.data.user || response.data);
      setSuccess('Profile updated successfully');
      setEditMode(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await api.put('/api/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      setSuccess('Password changed successfully');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setPasswordDialogOpen(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const canEditProfile = () => {
    return user?.role === 'admin' || user?.role === 'faculty';
  };

  const canEditAllFields = () => {
    return user?.role === 'admin';
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Cancel edit - reset form data
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        department: user.department || '',
        departments: user.departments || []
      }));
      setError('');
    }
    setEditMode(!editMode);
  };

  const handleDepartmentChange = (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      departments: typeof value === 'string' ? value.split(',') : value
    }));
  };

  return (
    <Container 
      maxWidth="md" 
      sx={{ 
        mt: { xs: 2, sm: 3, md: 4 }, 
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}
    >
      <Paper sx={{ 
        p: { xs: 2, sm: 3 },
        borderRadius: { xs: 1, sm: 2 }
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' }, 
          mb: { xs: 2, sm: 3 },
          gap: { xs: 1, sm: 0 }
        }}>
          <Typography 
            variant={isMobile ? "h5" : "h4"}
            sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            Profile Settings
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            alignItems: 'center',
            justifyContent: { xs: 'space-between', sm: 'flex-end' }
          }}>
            <Chip
              label={user?.role?.toUpperCase()}
              color="primary"
              variant="outlined"
              size={isMobile ? "small" : "small"}
              sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
            />
            {canEditProfile() && (
              <Tooltip title={editMode ? "Cancel Edit" : "Edit Profile"}>
                <IconButton
                  onClick={handleEditToggle}
                  className={editMode ? "delete-icon" : "edit-icon"}
                  size={isMobile ? "small" : "medium"}
                >
                  {editMode ? <CancelIcon /> : <EditIcon />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Profile Information Section */}
        <Typography 
          variant={isMobile ? "h6" : "h5"} 
          gutterBottom
          sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
        >
          Profile Information
        </Typography>

        <Box component="form" onSubmit={handleProfileUpdate} sx={{ mb: 4 }}>
          <Grid container spacing={isMobile ? 2 : 3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!editMode || !canEditProfile()}
                required
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!editMode || !canEditProfile()}
                required
                size={isMobile ? "small" : "medium"}
              />
            </Grid>

            {/* Admin-only fields */}
            {canEditAllFields() && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={!editMode}
                  size={isMobile ? "small" : "medium"}
                />
              </Grid>
            )}

            {/* Faculty departments */}
            {user?.role === 'faculty' && (
              <Grid item xs={12}>
                <FormControl fullWidth disabled={!editMode}>
                  <InputLabel>Departments</InputLabel>
                  <Select
                    multiple
                    value={formData.departments}
                    onChange={handleDepartmentChange}
                    label="Departments"
                    size={isMobile ? "small" : "medium"}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {editMode && canEditProfile() && (
              <Grid item xs={12}>
                <Stack 
                  direction={isMobile ? "column" : "row"} 
                  spacing={isMobile ? 1 : 2}
                  sx={{ mt: 1 }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={<SaveIcon />}
                    className="add-icon"
                    fullWidth={isMobile}
                    sx={{ 
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      py: { xs: 1, sm: 1.5 }
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleEditToggle}
                    disabled={loading}
                    fullWidth={isMobile}
                    sx={{ 
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      py: { xs: 1, sm: 1.5 }
                    }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Grid>
            )}
          </Grid>
        </Box>

        <Divider sx={{ my: { xs: 3, sm: 4 } }} />

        {/* Password Change Section */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' }, 
          mb: { xs: 2, sm: 3 },
          gap: { xs: 1, sm: 0 }
        }}>
          <Typography 
            variant={isMobile ? "h6" : "h5"}
            sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
          >
            Security Settings
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setPasswordDialogOpen(true)}
            startIcon={<EditIcon />}
            className="settings-icon"
            fullWidth={isMobile}
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' },
              py: { xs: 1, sm: 1.5 }
            }}
          >
            Change Password
          </Button>
        </Box>

        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 3,
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }}
        >
          {user?.role === 'student' || user?.role === 'event'
            ? 'As a student/event user, you can only update your password. Contact admin for other changes.'
            : 'You can change your password anytime for security purposes.'
          }
        </Typography>

        {/* Academic Information for Students */}
        {user?.role === 'student' && (
          <>
            <Divider sx={{ my: 4 }} />
            <Typography variant="h5" gutterBottom>
              Academic Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This information is read-only. Contact admin if changes are needed.
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={user.department || ''}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Year"
                  value={user.year || ''}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Section"
                  value={user.section || ''}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Admission Number"
                  value={user.admissionNumber || ''}
                  disabled
                />
              </Grid>
            </Grid>
          </>
        )}

        {/* Faculty Information */}
        {user?.role === 'faculty' && !editMode && (
          <>
            <Divider sx={{ my: 4 }} />
            <Typography variant="h5" gutterBottom>
              Faculty Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Assigned Departments:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {user.departments?.map((dept) => (
                    <Chip key={dept} label={dept} variant="outlined" />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </>
        )}

        {/* Password Change Dialog */}
        <Dialog
          open={passwordDialogOpen}
          onClose={() => setPasswordDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Box component="form" onSubmit={handlePasswordChange} sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          edge="end"
                          className="view-icon"
                        >
                          {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="New Password"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    helperText="Password must be at least 6 characters long"
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                          className="view-icon"
                        >
                          {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    required
                    InputProps={{
                      endAdornment: (
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          className="view-icon"
                        >
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setPasswordDialogOpen(false);
                setFormData(prev => ({
                  ...prev,
                  currentPassword: '',
                  newPassword: '',
                  confirmPassword: ''
                }));
                setError('');
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              variant="contained"
              disabled={loading}
              startIcon={<SaveIcon />}
              className="add-icon"
            >
              {loading ? <CircularProgress size={24} /> : 'Change Password'}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default Profile; 