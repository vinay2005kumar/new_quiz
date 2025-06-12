import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

const EventQuizRegistrations = () => {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailsDialog, setDetailsDialog] = useState({ open: false, registration: null });
  const [editDialog, setEditDialog] = useState({ open: false, registration: null });
  const [editFormData, setEditFormData] = useState({});

  useEffect(() => {
    fetchRegistrations();
  }, [id]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const [quizResponse, registrationsResponse] = await Promise.all([
        api.get(`/api/event-quiz/${id}`),
        api.get(`/api/event-quiz/${id}/registrations`)
      ]);
      
      setQuiz(quizResponse.data);
      setRegistrations(registrationsResponse.data);
    } catch (error) {
      setError('Failed to fetch registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = () => {
    const data = registrations.map((reg, index) => ({
      'S.No': index + 1,
      'Name': reg.name,
      'Email': reg.email,
      'College': reg.college || 'N/A',
      'Department': reg.department || 'N/A',
      'Year': reg.year || 'N/A',
      'Participant Type': reg.participantType || 'N/A',
      'Role': reg.role || 'Individual',
      'Team Name': reg.teamName || '-',
      'Phone Number': reg.phoneNumber || 'N/A',
      'Admission Number': reg.admissionNumber || 'N/A',
      'Registration Type': reg.isSpotRegistration ? 'Spot' : 'Online',
      'Registered At': new Date(reg.registeredAt).toLocaleString()
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registrations');
    
    // Auto-size columns
    const colWidths = data.reduce((acc, row) => {
      Object.keys(row).forEach(key => {
        const length = row[key]?.toString().length || 0;
        acc[key] = Math.max(acc[key] || 0, length);
      });
      return acc;
    }, {});
    
    ws['!cols'] = Object.values(colWidths).map(width => ({ width }));

    XLSX.writeFile(wb, `${quiz.title}_registrations.xlsx`);
  };

  const handleViewDetails = (registration) => {
    setDetailsDialog({ open: true, registration });
  };

  const handleEditRegistration = (registration) => {
    setEditFormData({ ...registration });
    setEditDialog({ open: true, registration });
  };

  const handleDeleteRegistration = async (registrationId, registrationName) => {
    if (window.confirm(`Are you sure you want to delete the registration for "${registrationName}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/api/event-quiz/${id}/registrations/${registrationId}`);
        toast.success('Registration deleted successfully!');
        fetchRegistrations(); // Refresh the data
      } catch (error) {
        toast.error('Failed to delete registration: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/api/event-quiz/${id}/registrations/${editDialog.registration._id}`, editFormData);
      toast.success('Registration updated successfully!');
      setEditDialog({ open: false, registration: null });
      setEditFormData({});
      fetchRegistrations(); // Refresh the data
    } catch (error) {
      toast.error('Failed to update registration: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredRegistrations = registrations.filter(reg =>
    reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            {quiz?.title} - Registrations
          </Typography>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportToExcel}
            disabled={registrations.length === 0}
          >
            Export to Excel
          </Button>
        </Box>

        {/* Show individual registrations in card format */}
        {quiz?.participationMode === 'individual' && (
          <>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Individual Quiz Registration
              </Typography>
              <Typography variant="body1">
                Individual registrations are displayed in card format for better privacy management.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Total Registrations: {registrations.length}
                {quiz?.maxParticipants > 0 && ` / ${quiz.maxParticipants}`}
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search by name, email, college, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <Grid container spacing={2}>
              {filteredRegistrations.map((reg, index) => (
                <Grid item xs={12} sm={6} md={4} key={reg._id || index}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" component="div" noWrap>
                          {reg.name}
                        </Typography>
                        <Chip
                          label={reg.participantType === 'college' ? 'College' : 'External'}
                          size="small"
                          color={reg.participantType === 'college' ? 'primary' : 'secondary'}
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        📧 {reg.email}
                      </Typography>

                      {reg.college && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          🏫 {reg.college}
                        </Typography>
                      )}

                      {reg.department && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          📚 {reg.department}
                        </Typography>
                      )}

                      {reg.year && (
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          📅 Year {reg.year}
                        </Typography>
                      )}

                      <Box sx={{ mt: 2 }}>
                        <Chip
                          label={reg.isSpotRegistration ? 'Spot Registration' : 'Online Registration'}
                          size="small"
                          color={reg.isSpotRegistration ? 'warning' : 'success'}
                          sx={{ mr: 1 }}
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Registered: {new Date(reg.registeredAt).toLocaleString()}
                      </Typography>
                    </CardContent>

                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewDetails(reg)}
                      >
                        Details
                      </Button>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditRegistration(reg)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteRegistration(reg._id, reg.name)}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}

              {filteredRegistrations.length === 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      No registrations found
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Only show search and table for team quizzes */}
        {quiz?.participationMode === 'team' && (
          <>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search by name, email, college, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>S.No</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>College</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Team Name</TableCell>
                <TableCell>Registration Type</TableCell>
                <TableCell>Registered At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRegistrations.map((reg, index) => (
                <TableRow key={reg._id || index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {reg.name}
                    {reg.participantType && (
                      <Chip
                        label={reg.participantType === 'college' ? 'College' : 'External'}
                        size="small"
                        color={reg.participantType === 'college' ? 'primary' : 'secondary'}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{reg.email}</TableCell>
                  <TableCell>{reg.college || 'N/A'}</TableCell>
                  <TableCell>{reg.department || 'N/A'}</TableCell>
                  <TableCell>{reg.year || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={reg.role || 'Individual'}
                      size="small"
                      color={reg.role === 'Team Leader' ? 'success' : reg.role?.includes('Team Member') ? 'info' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{reg.teamName || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={reg.isSpotRegistration ? 'Spot' : 'Online'}
                      size="small"
                      color={reg.isSpotRegistration ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(reg.registeredAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Send Email">
                      <IconButton
                        size="small"
                        onClick={() => window.location.href = `mailto:${reg.email}`}
                      >
                        <EmailIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRegistrations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    No registrations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
            </TableContainer>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Total Registrations: {registrations.length}
                {quiz?.maxParticipants > 0 && ` / ${quiz.maxParticipants}`}
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* Details Dialog */}
      <Dialog open={detailsDialog.open} onClose={() => setDetailsDialog({ open: false, registration: null })} maxWidth="md" fullWidth>
        <DialogTitle>Registration Details</DialogTitle>
        <DialogContent>
          {detailsDialog.registration && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                  <Typography variant="body1">{detailsDialog.registration.name}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{detailsDialog.registration.email}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">College</Typography>
                  <Typography variant="body1">{detailsDialog.registration.college || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Department</Typography>
                  <Typography variant="body1">{detailsDialog.registration.department || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Year</Typography>
                  <Typography variant="body1">{detailsDialog.registration.year || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Phone Number</Typography>
                  <Typography variant="body1">{detailsDialog.registration.phoneNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Admission Number</Typography>
                  <Typography variant="body1">{detailsDialog.registration.admissionNumber || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Participant Type</Typography>
                  <Typography variant="body1">{detailsDialog.registration.participantType || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Registration Date</Typography>
                  <Typography variant="body1">{new Date(detailsDialog.registration.registeredAt).toLocaleString()}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialog({ open: false, registration: null })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, registration: null })} maxWidth="md" fullWidth>
        <DialogTitle>Edit Registration</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Name"
                  value={editFormData.name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="College"
                  value={editFormData.college || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, college: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={editFormData.department || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Year"
                  value={editFormData.year || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={editFormData.phoneNumber || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, registration: null })}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EventQuizRegistrations; 