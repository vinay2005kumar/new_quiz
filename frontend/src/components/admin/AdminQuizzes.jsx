import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import ClassIcon from '@mui/icons-material/Class';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../../config/axios';
import AcademicFilter from '../common/AcademicFilter';
import useAcademicFilters from '../../hooks/useAcademicFilters';

const AdminQuizzes = () => {
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, quiz: null });
  const {
    filters,
    handleFilterChange: handleAcademicFilterChange,
    clearFilters,
    getFilterParams
  } = useAcademicFilters({
    searchText: '',
    year: '',
    department: '',
    semester: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Clear search text when switching tabs since search logic is different
  useEffect(() => {
    if (filters.searchText) {
      handleAcademicFilterChange('searchText', '');
    }
  }, [tabValue]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      
      // Fetch both academic and event quizzes
      const [academicResponse, eventResponse] = await Promise.all([
        api.get('/api/quiz'),  // Changed from /api/admin/quiz
        api.get('/api/event-quiz')  // Changed from /api/admin/event-quiz
      ]);

      console.log('Raw Academic Response:', academicResponse);
      console.log('Raw Event Response:', eventResponse);

      // Handle response data properly
      const academicQuizzes = Array.isArray(academicResponse) ? academicResponse :
                            Array.isArray(academicResponse.data) ? academicResponse.data : [];
      const eventQuizzes = Array.isArray(eventResponse) ? eventResponse :
                          Array.isArray(eventResponse.data) ? eventResponse.data : [];

      // Combine and mark the type if not already marked
      const allQuizzes = [
        ...academicQuizzes.map(q => ({ ...q, type: q.type || 'academic' })),
        ...eventQuizzes.map(q => ({ ...q, type: 'event' }))
      ];

      // Update state only if we have valid data
      if (allQuizzes.length > 0) {
        setQuizzes(allQuizzes);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      // Removed error alert - just log the error
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleFilterChange = (name, value) => {
    handleAcademicFilterChange(name, value);
  };

  const resetFilters = () => {
    clearFilters();
  };

  const getFilteredQuizzes = () => {
    console.log('Current tab value:', tabValue);
    console.log('Total quizzes before filtering:', quizzes.length);

    const filtered = quizzes.filter(quiz => {
      // Tab filter (Academic vs Event)
      const isAcademic = quiz.type === 'academic' || !quiz.type;
      const matchesTab = tabValue === 0 ? isAcademic : quiz.type === 'event';

      if (!matchesTab) return false;

      // Search filter - different logic for academic vs event quizzes
      if (filters.searchText) {
        if (isAcademic) {
          // For academic quizzes: search in subject name or code
          const subjectName = quiz.subject?.name || quiz.subject?.code || '';
          if (!subjectName.toLowerCase().includes(filters.searchText.toLowerCase())) {
            return false;
          }
        } else {
          // For event quizzes: search in quiz title
          const quizTitle = quiz.title || '';
          if (!quizTitle.toLowerCase().includes(filters.searchText.toLowerCase())) {
            return false;
          }
        }
      }

      // For academic quizzes, apply additional filters
      if (isAcademic && quiz.allowedGroups && Array.isArray(quiz.allowedGroups)) {
        // Year filter
        if (filters.year && filters.year !== '') {
          const hasMatchingYear = quiz.allowedGroups.some(group =>
            group.year === parseInt(filters.year)
          );
          if (!hasMatchingYear) return false;
        }

        // Department filter
        if (filters.department && filters.department !== '') {
          const hasMatchingDepartment = quiz.allowedGroups.some(group =>
            group.department === filters.department
          );
          if (!hasMatchingDepartment) return false;
        }

        // Semester filter
        if (filters.semester && filters.semester !== '') {
          const hasMatchingSemester = quiz.allowedGroups.some(group =>
            group.semester === parseInt(filters.semester)
          );
          if (!hasMatchingSemester) return false;
        }
      }

      console.log('Quiz:', quiz.title, 'Type:', quiz.type, 'Matches Tab:', matchesTab);
      return true;
    });

    console.log('Filtered quizzes:', filtered.length);
    return filtered;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getQuizStatus = (quiz) => {
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) {
      return { label: 'Upcoming', color: 'info' };
    } else if (now > endTime) {
      return { label: 'Expired', color: 'error' };
    } else {
      return { label: 'Active', color: 'success' };
    }
  };

  const handleViewResults = (quizId, type) => {
    if (type === 'event') {
      navigate(`/admin/event-quiz/${quizId}/submissions`);
    } else {
      navigate(`/admin/quiz/${quizId}/submissions`);
    }
  };

  const handleEditQuiz = (quizId, type) => {
    if (type === 'event') {
      navigate(`/admin/event-quiz/${quizId}/edit`);
    } else {
      navigate(`/admin/quiz/${quizId}/edit`);
    }
  };

  const handleDeleteClick = (quiz) => {
    setDeleteDialog({ open: true, quiz });
  };

  const handleDeleteConfirm = async () => {
    const { quiz } = deleteDialog;
    if (!quiz) return;

    try {
      // Use the correct endpoints for quiz deletion
      const endpoint = quiz.type === 'event' ? '/api/event-quiz' : '/api/quiz';
      console.log(`🗑️ Deleting ${quiz.type} quiz with ID: ${quiz._id} using endpoint: ${endpoint}/${quiz._id}`);

      await api.delete(`${endpoint}/${quiz._id}`);
      console.log('✅ Quiz deleted successfully');

      setDeleteDialog({ open: false, quiz: null });
      fetchQuizzes(); // Refresh the list
    } catch (error) {
      console.error('❌ Error deleting quiz:', error);
      setDeleteDialog({ open: false, quiz: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, quiz: null });
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Quiz Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchQuizzes}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>



      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Academic Quizzes" />
          <Tab label="Event Quizzes" />
        </Tabs>
      </Paper>

      {/* Filters Section */}
      <AcademicFilter
        filters={filters}
        onFilterChange={handleAcademicFilterChange}
        onClearFilters={clearFilters}
        showFilters={tabValue === 0 ? ['search', 'department', 'year', 'semester'] : ['search']}
        title={`${tabValue === 0 ? 'Academic' : 'Event'} Quiz Filters`}
        showRefreshButton={true}
        onRefresh={fetchQuizzes}
        customFilters={[
          <TextField
            key="searchText"
            fullWidth
            size="small"
            label={tabValue === 0 ? "Search by Subject" : "Search by Title"}
            value={filters.searchText || ''}
            onChange={(e) => handleFilterChange('searchText', e.target.value)}
            placeholder={tabValue === 0 ? "Enter subject name or code" : "Enter quiz title"}
          />
        ]}
      />

      {/* Results Summary */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {getFilteredQuizzes().length} of {quizzes.filter(quiz => {
            const isAcademic = quiz.type === 'academic' || !quiz.type;
            return tabValue === 0 ? isAcademic : quiz.type === 'event';
          }).length} {tabValue === 0 ? 'academic' : 'event'} quizzes
        </Typography>

        {/* Show active filters */}
        {(filters.searchText || filters.year || filters.department || filters.semester) && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {filters.searchText && (
              <Chip
                label={`${tabValue === 0 ? 'Subject' : 'Title'}: ${filters.searchText}`}
                size="small"
                onDelete={() => handleFilterChange('searchText', '')}
              />
            )}
            {filters.year && (
              <Chip
                label={`Year: ${filters.year}`}
                size="small"
                onDelete={() => handleFilterChange('year', '')}
              />
            )}
            {filters.department && (
              <Chip
                label={`Dept: ${filters.department}`}
                size="small"
                onDelete={() => handleFilterChange('department', '')}
              />
            )}
            {filters.semester && (
              <Chip
                label={`Sem: ${filters.semester}`}
                size="small"
                onDelete={() => handleFilterChange('semester', '')}
              />
            )}
          </Box>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              {tabValue === 0 && <TableCell>Subject</TableCell>}
              <TableCell>Duration</TableCell>
              <TableCell>Start Time</TableCell>
              <TableCell>End Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredQuizzes().length > 0 ? (
              getFilteredQuizzes().map((quiz) => {
                const status = getQuizStatus(quiz);
                return (
                  <TableRow key={quiz._id}>
                    <TableCell>{quiz.title}</TableCell>
                    {tabValue === 0 && (
                      <TableCell>
                        {quiz.subject?.name || quiz.subject?.code || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell>{quiz.duration} minutes</TableCell>
                    <TableCell>{formatDateTime(quiz.startTime)}</TableCell>
                    <TableCell>{formatDateTime(quiz.endTime)}</TableCell>
                    <TableCell>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditQuiz(quiz._id, quiz.type)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(quiz)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Results">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewResults(quiz._id, quiz.type)}
                          >
                            <AssessmentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={tabValue === 0 ? 7 : 6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No quizzes found matching the current filters.
                  </Typography>
                  <Button
                    variant="text"
                    onClick={resetFilters}
                    sx={{ mt: 1 }}
                  >
                    Clear Filters
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this quiz?
          </Typography>
          {deleteDialog.quiz && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Quiz Details:
              </Typography>
              <Typography variant="body2">
                <strong>Title:</strong> {deleteDialog.quiz.title}
              </Typography>
              <Typography variant="body2">
                <strong>Type:</strong> {deleteDialog.quiz.type === 'event' ? 'Event Quiz' : 'Academic Quiz'}
              </Typography>
              <Typography variant="body2">
                <strong>Duration:</strong> {deleteDialog.quiz.duration} minutes
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminQuizzes; 