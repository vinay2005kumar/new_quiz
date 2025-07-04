import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  useTheme,
  useMediaQuery,
  Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  School as SchoolIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const DepartmentManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openCoordinatorDialog, setOpenCoordinatorDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    coordinators: []
  });
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    fetchDepartments();
    fetchAvailableUsers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/admin/departments');
      setDepartments(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch departments');
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await api.get('/api/admin/users?role=faculty');
      setAvailableUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch available users:', err);
    }
  };

  const handleOpenDialog = (department = null) => {
    if (department) {
      setSelectedDepartment(department);
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description || '',
        coordinators: department.coordinators || []
      });
    } else {
      setSelectedDepartment(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        coordinators: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDepartment(null);
  };

  const handleOpenCoordinatorDialog = (department) => {
    setSelectedDepartment(department);
    setOpenCoordinatorDialog(true);
  };

  const handleCloseCoordinatorDialog = () => {
    setOpenCoordinatorDialog(false);
    setSelectedDepartment(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedDepartment) {
        await api.put(`/api/admin/departments/${selectedDepartment._id}`, formData);
      } else {
        await api.post('/api/admin/departments', formData);
      }
      fetchDepartments();
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department');
    }
  };

  const handleDelete = async (departmentId) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try {
        await api.delete(`/api/admin/departments/${departmentId}`);
        fetchDepartments();
      } catch (err) {
        setError('Failed to delete department');
      }
    }
  };

  const handleAddCoordinator = async (userId) => {
    try {
      await api.post(`/api/admin/departments/${selectedDepartment._id}/coordinators`, {
        userId
      });
      fetchDepartments();
      handleCloseCoordinatorDialog();
    } catch (err) {
      setError('Failed to add coordinator');
    }
  };

  const handleRemoveCoordinator = async (departmentId, userId) => {
    try {
      await api.delete(`/api/admin/departments/${departmentId}/coordinators/${userId}`);
      fetchDepartments();
    } catch (err) {
      setError('Failed to remove coordinator');
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 }, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Typography
        variant={isMobile ? "h5" : "h4"}
        gutterBottom
        sx={{ mb: 4, fontSize: { xs: '1.5rem', md: '2.125rem' } }}
      >
        Department Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={() => handleOpenDialog()}
        fullWidth={isMobile}
        size={isMobile ? "medium" : "medium"}
        sx={{
          mb: 3,
          fontSize: { xs: '0.875rem', md: '0.875rem' }
        }}
      >
        Add New Department
      </Button>

      <Grid container spacing={isMobile ? 2 : 3}>
        {departments.map((department) => (
          <Grid item xs={12} md={6} key={department._id}>
            <Paper
              sx={{
                p: { xs: 2, md: 3 },
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s ease-in-out'
                }
              }}
            >
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 2,
                gap: { xs: 1, sm: 0 }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 1, sm: 0 } }}>
                  <SchoolIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.2rem' }} />
                  <Typography
                    variant="h6"
                    sx={{ fontSize: { xs: '1rem', md: '1.25rem' }, fontWeight: 600 }}
                  >
                    {department.name}
                  </Typography>
                  <Chip
                    icon={<CodeIcon sx={{ fontSize: '0.8rem' }} />}
                    label={department.code}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1, fontSize: '0.75rem', height: '24px' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(department)}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(department._id)}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <Typography
                variant="body2"
                color="text.secondary"
                paragraph
                sx={{ fontSize: { xs: '0.85rem', md: '0.875rem' } }}
              >
                {department.description || 'No description provided'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Box sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  mb: 1,
                  gap: { xs: 1, sm: 0 }
                }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontSize: { xs: '0.875rem', md: '0.875rem' }, fontWeight: 600 }}
                  >
                    Coordinators
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleOpenCoordinatorDialog(department)}
                    sx={{
                      fontSize: { xs: '0.75rem', md: '0.8rem' },
                      minWidth: 'auto',
                      px: { xs: 2, sm: 1.5 }
                    }}
                  >
                    {isMobile ? 'Add' : 'Add Coordinator'}
                  </Button>
                </Box>
                {department.coordinators?.length > 0 ? (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {department.coordinators.map((coordinator) => (
                      <Chip
                        key={coordinator._id}
                        label={coordinator.name}
                        onDelete={() => handleRemoveCoordinator(department._id, coordinator._id)}
                        size="small"
                        sx={{ fontSize: '0.75rem', height: '24px' }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}
                  >
                    No coordinators assigned
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Department Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedDepartment ? 'Edit Department' : 'Add New Department'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Department Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Department Code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedDepartment ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Coordinator Dialog */}
      <Dialog
        open={openCoordinatorDialog}
        onClose={handleCloseCoordinatorDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Department Coordinator</DialogTitle>
        <DialogContent>
          <List>
            {availableUsers.map((user) => (
              <ListItem
                key={user._id}
                button
                onClick={() => handleAddCoordinator(user._id)}
              >
                <ListItemText
                  primary={user.name}
                  secondary={user.email}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCoordinatorDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DepartmentManagement; 