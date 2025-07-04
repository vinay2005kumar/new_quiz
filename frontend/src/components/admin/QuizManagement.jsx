import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Box,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import {
  Quiz as QuizIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import AcademicFilter from '../common/AcademicFilter';
import useAcademicFilters from '../../hooks/useAcademicFilters';

const QuizManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    filters,
    handleFilterChange,
    clearFilters,
    getFilterParams
  } = useAcademicFilters({
    subject: '',
    department: '',
    status: 'all'
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    fetchQuizzes();
  }, [tabValue]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      setError('');
      const type = tabValue === 0 ? 'academic' : 'event';
      const endpoint = type === 'event' ? '/api/quiz/event' : '/api/quiz/all';
      
      console.log('Fetching quizzes from:', endpoint);
      const response = await api.get(endpoint);
      console.log('Quiz response:', response);
      
      // Ensure we have an array of quizzes
      const quizData = Array.isArray(response.data) ? response.data : [];
      setQuizzes(quizData);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError(err.response?.data?.message || 'Failed to fetch quizzes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError(''); // Clear any previous errors when switching tabs
  };

  const handleViewResults = (quizId) => {
    // Navigate to quiz results page
    window.location.href = `/admin/quiz/${quizId}/results`;
  };

  const handleEdit = (quiz) => {
    setSelectedQuiz(quiz);
    setOpenDialog(true);
  };

  const handleDelete = async (quizId) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        await api.delete(`/api/quiz/${quizId}`);
        fetchQuizzes();
      } catch (err) {
        console.error('Failed to delete quiz:', err);
        setError('Failed to delete quiz');
      }
    }
  };

  const handleExportResults = async (quizId) => {
    try {
      const response = await api.get(`/api/admin/quizzes/${quizId}/export`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'quiz-results.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError('Failed to export results');
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !filters.subject || quiz.subject === filters.subject;
    const matchesDepartment = !filters.department || quiz.department === filters.department;
    const matchesStatus = filters.status === 'all' || quiz.status === filters.status;
    return matchesSearch && matchesSubject && matchesDepartment && matchesStatus;
  });

  // Mobile-friendly quiz card component
  const QuizCard = ({ quiz }) => {
    const getStatusColor = (status) => {
      switch (status) {
        case 'active': return 'success';
        case 'completed': return 'default';
        case 'draft': return 'warning';
        default: return 'default';
      }
    };

    return (
      <Card
        sx={{
          mb: 2,
          '&:hover': {
            boxShadow: 4,
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease-in-out'
          }
        }}
      >
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <QuizIcon sx={{ mr: 1, color: 'primary.main', fontSize: '1.2rem' }} />
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
              {quiz.title}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <SchoolIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              {quiz.subject} • {quiz.department}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <ScheduleIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} />
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              {new Date(quiz.startTime).toLocaleDateString()} • {quiz.duration} mins
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Chip
              label={quiz.status}
              size="small"
              color={getStatusColor(quiz.status)}
              sx={{ fontSize: '0.75rem', height: '24px' }}
            />
            <Chip
              label={`${quiz.submissionCount} submissions`}
              size="small"
              variant="outlined"
              icon={<PeopleIcon sx={{ fontSize: '0.8rem' }} />}
              sx={{ fontSize: '0.75rem', height: '24px' }}
            />
          </Stack>
        </CardContent>

        <CardActions sx={{ pt: 0, pb: 2, px: 2 }}>
          <Button
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => handleViewResults(quiz._id)}
            sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
          >
            View
          </Button>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={() => handleEdit(quiz)}
            sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
          >
            Edit
          </Button>
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportResults(quiz._id)}
            sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
          >
            Export
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleDelete(quiz._id)}
            sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
          >
            Delete
          </Button>
        </CardActions>
      </Card>
    );
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
        Quiz Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Academic Quizzes" />
          <Tab label="Event Quizzes" />
        </Tabs>
      </Box>

      <AcademicFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        showFilters={['department', 'subject']}
        title="Quiz Management Filters"
        showRefreshButton={true}
        onRefresh={fetchQuizzes}
        customFilters={[
          <TextField
            key="search"
            fullWidth
            size="small"
            label="Search Quizzes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by quiz title..."
          />,
          <FormControl key="status" fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              label="Status"
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="upcoming">Upcoming</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        ]}
        sx={{ mb: 3 }}
      />

      {/* Mobile View - Cards */}
      {isMobile ? (
        <Box sx={{ px: 1 }}>
          {filteredQuizzes.map((quiz) => (
            <QuizCard key={quiz._id} quiz={quiz} />
          ))}
          {filteredQuizzes.length === 0 && (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ textAlign: 'center', py: 4, fontSize: '0.9rem' }}
            >
              No quizzes found
            </Typography>
          )}
        </Box>
      ) : (
        /* Desktop View - Table */
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submissions</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQuizzes.map((quiz) => (
                <TableRow key={quiz._id}>
                  <TableCell>{quiz.title}</TableCell>
                  <TableCell>{quiz.subject}</TableCell>
                  <TableCell>{quiz.department}</TableCell>
                  <TableCell>{new Date(quiz.startTime).toLocaleDateString()}</TableCell>
                  <TableCell>{quiz.duration} mins</TableCell>
                  <TableCell>{quiz.status}</TableCell>
                  <TableCell>{quiz.submissionCount}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Results">
                        <IconButton size="small" onClick={() => handleViewResults(quiz._id)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Quiz">
                        <IconButton size="small" onClick={() => handleEdit(quiz)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Export Results">
                        <IconButton size="small" onClick={() => handleExportResults(quiz._id)}>
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Quiz">
                        <IconButton size="small" color="error" onClick={() => handleDelete(quiz._id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default QuizManagement; 