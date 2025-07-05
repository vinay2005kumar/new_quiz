import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  CircularProgress,
  Alert,
  Chip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableSortLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteIcon from '@mui/icons-material/Delete';
import QuizIcon from '@mui/icons-material/Quiz';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import useAcademicFilters from '../../hooks/useAcademicFilters';
import AcademicFilter from '../common/AcademicFilter';

const QuizAuthorizedStudents = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Function to determine the correct submission details path
  const getSubmissionDetailsPath = (studentId) => {
    const currentPath = location.pathname;
    console.log('Current path:', currentPath);
    console.log('Quiz ID:', id);
    console.log('Student ID:', studentId);

    // If accessed from admin routes, use admin path with correct parameter name
    if (currentPath.includes('/admin/')) {
      const adminPath = `/admin/quiz/${id}/submissions/${studentId}`;
      console.log('Generated admin path:', adminPath);
      return adminPath;
    }
    // Default to faculty path
    const facultyPath = `/faculty/quizzes/${id}/submissions/${studentId}`;
    console.log('Generated faculty path:', facultyPath);
    return facultyPath;
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [students, setStudents] = useState([]);
  const {
    filters,
    handleFilterChange,
    clearFilters,
    setSpecificFilter
  } = useAcademicFilters({
    admissionNumber: '',
    scoreRange: 'all',
    submissionStatus: 'all',
    department: 'all',
    year: 'all',
    section: 'all',
    semester: 'all'
  });

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  const [reattemptDialog, setReattemptDialog] = useState({ open: false, student: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, student: null });

  // Bulk reattempt functionality
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkReattemptDialog, setBulkReattemptDialog] = useState({ open: false, students: [] });

  // Deleted users functionality
  const [deletedUsersDialog, setDeletedUsersDialog] = useState({ open: false, deletedUsers: [] });
  const [loadingDeletedUsers, setLoadingDeletedUsers] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      console.log('📊 Fetching quiz data for ID:', id);
      setLoading(true);
      setError('');

      // Fetch quiz details and authorized students with submission status
      const [quizResponse, studentsResponse] = await Promise.all([
        api.get(`/api/quiz/${id}`),
        api.get(`/api/quiz/${id}/authorized-students`)
      ]);

      console.log('📊 Quiz Response:', quizResponse);
      console.log('📊 Students Response:', studentsResponse);

      if (!quizResponse || !quizResponse.title) {
        throw new Error('Failed to fetch quiz details');
      }

      setQuiz(quizResponse);

      console.log('📊 Students Response:', studentsResponse);
      console.log('📊 Students Array:', studentsResponse.students);
      console.log('📊 Number of students:', studentsResponse.students?.length || 0);

      if (!studentsResponse || !studentsResponse.students) {
        console.warn('⚠️ No students found or invalid response structure');
        setStudents([]);
        setLoading(false);
        return;
      }

      // Log each student for debugging
      studentsResponse.students.forEach((studentData, index) => {
        console.log(`📊 Student ${index + 1}:`, {
          studentId: studentData.student?._id,
          studentName: studentData.student?.name,
          hasSubmitted: studentData.hasSubmitted,
          submissionStatus: studentData.submissionStatus,
          totalMarks: studentData.totalMarks
        });
      });

      // The data is already in the correct format from the backend
      const transformedStudents = studentsResponse.students.map((studentData, index) => {
        console.log(`🔄 Processing student ${index + 1}:`, studentData);

        // The data is already in the correct format from the backend
        const transformed = {
          student: {
            _id: studentData.student?._id,
            name: studentData.student?.name || 'N/A',
            admissionNumber: studentData.student?.admissionNumber || 'N/A',
            department: studentData.student?.department || 'N/A',
            year: studentData.student?.year || 'N/A',
            section: studentData.student?.section || 'N/A'
          },
          hasSubmitted: studentData.hasSubmitted,
          submissionStatus: studentData.submissionStatus || 'not attempted',
          totalMarks: studentData.totalMarks || 0,
          duration: studentData.duration || null,
          startTime: studentData.startTime || null,
          submitTime: studentData.submitTime || null,
          answers: [] // Not needed for the submissions view
        };

        console.log(`✅ Processed student ${index + 1}:`, {
          studentName: transformed.student.name,
          hasSubmitted: transformed.hasSubmitted,
          status: transformed.submissionStatus,
          totalMarks: transformed.totalMarks
        });

        return transformed;
      });

      console.log('📊 Final transformed students:', transformedStudents);
      console.log('📊 Students with submissions:', transformedStudents.filter(s => s.hasSubmitted));
      console.log('📊 Students without submissions:', transformedStudents.filter(s => !s.hasSubmitted));
      console.log('📊 Total authorized students:', transformedStudents.length);

      setStudents(transformedStudents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load data';
      setError(errorMessage);
      setLoading(false);
    }
  };



  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDeleteSubmission = (studentData) => {
    // Double-check that student has submitted before opening delete dialog
    if (!studentData.hasSubmitted) {
      console.warn('⚠️ Cannot delete - student has not submitted');
      toast.error('Cannot delete - student has not submitted the quiz');
      return;
    }
    setDeleteDialog({ open: true, student: studentData });
  };

  const handleConfirmDelete = async () => {
    const studentData = deleteDialog.student;
    console.log('🗑️ Deleting submission for student:', studentData);

    // Check if student has actually submitted
    if (!studentData.hasSubmitted) {
      console.warn('⚠️ Cannot delete - student has not submitted');
      toast.error('Cannot delete - student has not submitted the quiz');
      setDeleteDialog({ open: false, student: null });
      return;
    }

    try {
      console.log('🗑️ Sending delete request for student:', studentData.student._id);
      const response = await api.delete(`/api/quiz/${id}/submissions/${studentData.student._id}`);
      console.log('🗑️ Delete response:', response);
      
      toast.success('Submission deleted successfully!');
      setDeleteDialog({ open: false, student: null });
      
      // Refresh the data to update the UI
      console.log('🔄 Refreshing data after delete...');
      await fetchData();
      console.log('✅ Data refreshed after delete');
    } catch (error) {
      console.error('❌ Error deleting submission:', error);
      console.error('❌ Error response:', error.response);

      if (error.response?.status === 404) {
        toast.error('Submission not found - student may not have submitted yet');
      } else {
        toast.error('Failed to delete submission: ' + (error.response?.data?.message || error.message));
      }

      setDeleteDialog({ open: false, student: null });
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialog({ open: false, student: null });
  };

  const handleReattempt = (studentData) => {
    setReattemptDialog({ open: true, student: studentData });
  };

  const handleConfirmReattempt = async () => {
    const studentData = reattemptDialog.student;
    const studentName = studentData.student.name;

    try {
      // Call backend API to reset the submission
      await api.post(`/api/quiz/${id}/reattempt`, {
        studentId: studentData.student._id,
        email: studentData.student.email || `${studentData.student.admissionNumber}@college.edu`
      });

      toast.success(`${studentName} can now reattempt the quiz!`);
      setReattemptDialog({ open: false, student: null });
      fetchData(); // Refresh the data to update the UI
    } catch (error) {
      console.error('Error allowing reattempt:', error);
      toast.error('Failed to allow reattempt: ' + (error.response?.data?.message || error.message));
      setReattemptDialog({ open: false, student: null });
    }
  };

  const handleCancelReattempt = () => {
    setReattemptDialog({ open: false, student: null });
  };

  // Bulk reattempt handlers
  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    const submittedStudents = sortedStudents.filter(s => s.hasSubmitted);
    if (selectedStudents.size === submittedStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(submittedStudents.map(s => s.student._id)));
    }
  };

  const handleBulkReattempt = () => {
    const selectedStudentData = sortedStudents.filter(s =>
      selectedStudents.has(s.student._id) && s.hasSubmitted
    );
    setBulkReattemptDialog({ open: true, students: selectedStudentData });
  };

  const handleConfirmBulkReattempt = async () => {
    const studentsToReattempt = bulkReattemptDialog.students;

    try {
      // Call backend API for bulk reattempt
      const studentIds = studentsToReattempt.map(s => s.student._id);
      const emails = studentsToReattempt.map(s => s.student.email || `${s.student.admissionNumber}@college.edu`);

      await api.post(`/api/quiz/${id}/bulk-reattempt`, {
        studentIds,
        emails
      });

      toast.success(`${studentsToReattempt.length} students can now reattempt the quiz!`);
      setBulkReattemptDialog({ open: false, students: [] });
      setSelectedStudents(new Set());
      fetchData(); // Refresh the data to update the UI
    } catch (error) {
      console.error('Error allowing bulk reattempt:', error);
      toast.error('Failed to allow bulk reattempt: ' + (error.response?.data?.message || error.message));
      setBulkReattemptDialog({ open: false, students: [] });
    }
  };

  const handleCancelBulkReattempt = () => {
    setBulkReattemptDialog({ open: false, students: [] });
  };

  // Deleted users handlers
  const handleViewDeletedUsers = async () => {
    setLoadingDeletedUsers(true);
    try {
      const response = await api.get(`/api/quiz/${id}/deleted-submissions`);
      console.log('🗑️ Deleted submissions response:', response);
      
      // Handle response structure consistently with axios interceptor
      const deletedUsers = response.deletedSubmissions || [];
      setDeletedUsersDialog({
        open: true,
        deletedUsers: deletedUsers
      });
    } catch (error) {
      console.error('Error fetching deleted users:', error);
      toast.error('Failed to fetch deleted users: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingDeletedUsers(false);
    }
  };

  const handleRestoreUser = async (studentId) => {
    try {
      await api.post(`/api/quiz/${id}/restore-submission/${studentId}`);
      toast.success('User restored successfully!');

      // Refresh deleted users list
      const response = await api.get(`/api/quiz/${id}/deleted-submissions`);
      const deletedUsers = response.deletedSubmissions || [];
      setDeletedUsersDialog({
        open: true,
        deletedUsers: deletedUsers
      });

      // Refresh main data
      fetchData();
    } catch (error) {
      console.error('Error restoring user:', error);
      toast.error('Failed to restore user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCloseDeletedUsers = () => {
    setDeletedUsersDialog({ open: false, deletedUsers: [] });
  };

  // Helper function to format duration
  const formatDuration = (durationInMinutes) => {
    if (!durationInMinutes && durationInMinutes !== 0) return 'Not submitted';
    
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Helper function to calculate score percentage
  const calculateScorePercentage = (score, totalMarks) => {
    if (score === undefined || totalMarks === 0) return 0;
    return (score / totalMarks) * 100;
  };

  const filteredStudents = useMemo(() => {
    console.log('🔄 Calculating filteredStudents:', {
      studentsLength: students?.length || 0,
      filters,
      quizTotalMarks: quiz?.totalMarks
    });
    
    if (!students || !Array.isArray(students)) {
      console.log('⚠️ No students or not array, returning empty array');
      return [];
    }
    
    const filtered = students.filter(student => {
      if (!student || !student.student) {
        console.log('⚠️ Invalid student data:', student);
        return false;
      }

      // Admission number filter
      if (filters.admissionNumber && 
          !student.student.admissionNumber.toLowerCase().includes(filters.admissionNumber.toLowerCase())) {
        return false;
      }

      // Score range filter
      if (filters.scoreRange !== 'all') {
        const scorePercentage = calculateScorePercentage(student.totalMarks, quiz?.totalMarks || 0);
        const [min, max] = filters.scoreRange.split('-').map(Number);
        
        if (!student.hasSubmitted) {
          return min === 0;
        }
        
        if (scorePercentage < min || scorePercentage > max) return false;
      }

      // Submission status filter
      if (filters.submissionStatus !== 'all') {
        if (filters.submissionStatus === 'submitted' && !student.hasSubmitted) return false;
        if (filters.submissionStatus === 'not-submitted' && student.hasSubmitted) return false;
        if (filters.submissionStatus !== 'submitted' &&
            filters.submissionStatus !== 'not-submitted' &&
            student.submissionStatus !== filters.submissionStatus) {
          return false;
        }
      }

      // Department filter
      if (filters.department !== 'all' && student.student.department !== filters.department) {
        return false;
      }

      // Year filter
      if (filters.year !== 'all' && student.student.year !== parseInt(filters.year)) {
        return false;
      }

      // Section filter
      if (filters.section !== 'all' && student.student.section !== filters.section) {
        return false;
      }

      // Semester filter
      if (filters.semester !== 'all' && student.student.semester !== filters.semester) {
        return false;
      }

      return true;
    });
    
    console.log('✅ Filtered students result:', {
      originalLength: students.length,
      filteredLength: filtered.length,
      filtersApplied: filters
    });
    
    return filtered;
  }, [students, filters, quiz?.totalMarks]);

  const sortedStudents = useMemo(() => {
    console.log('🔄 Calculating sortedStudents:', {
      filteredStudentsLength: filteredStudents?.length || 0,
      sortConfig,
      studentsLength: students?.length || 0
    });
    
    if (!filteredStudents || !Array.isArray(filteredStudents)) {
      console.log('⚠️ No filteredStudents or not array, returning empty array');
      return [];
    }
    
    const sortableStudents = [...filteredStudents];
    if (!sortConfig.key) {
      console.log('✅ No sort config, returning students as-is:', sortableStudents.length);
      return sortableStudents;
    }

    const sorted = sortableStudents.sort((a, b) => {
      if (!a || !b || !a.student || !b.student) return 0;

      switch (sortConfig.key) {
        case 'admissionNumber':
          return sortConfig.direction === 'asc'
            ? a.student.admissionNumber.localeCompare(b.student.admissionNumber)
            : b.student.admissionNumber.localeCompare(a.student.admissionNumber);
        
        case 'score':
          if (!a.hasSubmitted && !b.hasSubmitted) return 0;
          if (!a.hasSubmitted) return sortConfig.direction === 'asc' ? -1 : 1;
          if (!b.hasSubmitted) return sortConfig.direction === 'asc' ? 1 : -1;
          
          const scoreA = calculateScorePercentage(a.totalMarks, quiz?.totalMarks || 0);
          const scoreB = calculateScorePercentage(b.totalMarks, quiz?.totalMarks || 0);
          return sortConfig.direction === 'asc' ? scoreA - scoreB : scoreB - scoreA;
        
        case 'submissionStatus':
          return sortConfig.direction === 'asc'
            ? (a.submissionStatus || '').localeCompare(b.submissionStatus || '')
            : (b.submissionStatus || '').localeCompare(a.submissionStatus || '');
        
        case 'name':
          return sortConfig.direction === 'asc'
            ? a.student.name.localeCompare(b.student.name)
            : b.student.name.localeCompare(a.student.name);
        
        case 'duration':
          if (!a.duration && !b.duration) return 0;
          if (!a.duration) return sortConfig.direction === 'asc' ? -1 : 1;
          if (!b.duration) return sortConfig.direction === 'asc' ? 1 : -1;
          return sortConfig.direction === 'asc' ? a.duration - b.duration : b.duration - a.duration;
        
        default:
          return 0;
      }
    });
    
    console.log('✅ Sorted students result:', {
      originalLength: sortableStudents.length,
      sortedLength: sorted.length,
      sortKey: sortConfig.key,
      sortDirection: sortConfig.direction
    });
    
    return sorted;
  }, [filteredStudents, sortConfig, quiz]);

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container 
      maxWidth="lg" 
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
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
            size={isMobile ? "small" : "medium"}
          >
            Back
          </Button>

          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'stretch', sm: 'center' }, 
            mb: 2,
            gap: { xs: 1, sm: 0 }
          }}>
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              gutterBottom
              sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
            >
              {quiz?.title} - Submissions
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleViewDeletedUsers}
              disabled={loadingDeletedUsers}
              fullWidth={isMobile}
              size={isMobile ? "small" : "medium"}
              sx={{ 
                fontSize: { xs: '0.875rem', sm: '1rem' },
                py: { xs: 1, sm: 1.5 }
              }}
            >
              {loadingDeletedUsers ? 'Loading...' : 'Deleted Users'}
            </Button>
          </Box>

          <Grid container spacing={isMobile ? 1 : 2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={4}>
              <Typography 
                variant="body1"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Total Students: {students.length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography 
                variant="body1"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Submitted: {students.filter(s => s.hasSubmitted).length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography 
                variant="body1"
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                Average Score: {
                  students.length > 0
                    ? (students.reduce((acc, s) => acc + (s.totalMarks || 0), 0) / students.length).toFixed(2)
                    : 0
                }
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Filters */}
        <AcademicFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          showFilters={['department', 'year', 'semester', 'section']}
          title="Quiz Submission Filters"
          showRefreshButton={true}
          onRefresh={() => window.location.reload()}
          customFilters={[
            <TextField
              key="admissionNumber"
              fullWidth
              size="small"
              label="Admission Number"
              value={filters.admissionNumber || ''}
              onChange={(e) => handleFilterChange('admissionNumber', e.target.value)}
              placeholder="Search by admission number..."
            />,
            <FormControl key="scoreRange" fullWidth size="small">
              <InputLabel>Score Range</InputLabel>
              <Select
                value={filters.scoreRange || 'all'}
                onChange={(e) => handleFilterChange('scoreRange', e.target.value)}
                label="Score Range"
              >
                <MenuItem value="all">All Scores</MenuItem>
                <MenuItem value="0-0">Not Submitted</MenuItem>
                <MenuItem value="0-50">Below 50%</MenuItem>
                <MenuItem value="50-70">50% - 70%</MenuItem>
                <MenuItem value="70-90">70% - 90%</MenuItem>
                <MenuItem value="90-100">Above 90%</MenuItem>
              </Select>
            </FormControl>,
            <FormControl key="submissionStatus" fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.submissionStatus || 'all'}
                onChange={(e) => handleFilterChange('submissionStatus', e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="not-submitted">Not Submitted</MenuItem>
                <MenuItem value="evaluated">Evaluated</MenuItem>
              </Select>
            </FormControl>
          ]}
        />

        {/* Bulk Actions */}
        {selectedStudents.size > 0 && (
          <Box sx={{ 
            mb: 2, 
            p: { xs: 1.5, sm: 2 }, 
            bgcolor: 'action.hover', 
            borderRadius: 1 
          }}>
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'row', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: { xs: 1, sm: 2 }
            }}>
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  flex: 1
                }}
              >
                {selectedStudents.size} selected
              </Typography>
              <Button
                variant="contained"
                color="warning"
                startIcon={isMobile ? null : <QuizIcon />}
                onClick={handleBulkReattempt}
                size="small"
                sx={{
                  fontSize: { xs: '0.75rem', sm: '1rem' },
                  py: { xs: 0.5, sm: 1.5 },
                  px: { xs: 1.5, sm: 2 },
                  minWidth: { xs: 'auto', sm: 'auto' },
                  whiteSpace: 'nowrap'
                }}
              >
                {isMobile ? 'Reattempt' : 'Allow Reattempt for Selected'}
              </Button>
            </Box>
          </Box>
        )}

        {/* Responsive Table View */}
        <TableContainer
          component={Paper}
          sx={{
            mt: 2,
            overflowX: 'auto',
            maxWidth: '100%'
          }}
        >
          <Table stickyHeader size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedStudents.size > 0 && selectedStudents.size === sortedStudents.filter(s => s.hasSubmitted).length}
                    indeterminate={selectedStudents.size > 0 && selectedStudents.size < sortedStudents.filter(s => s.hasSubmitted).length}
                    onChange={handleSelectAll}
                    size={isMobile ? "small" : "medium"}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  <TableSortLabel
                    active={sortConfig.key === 'name'}
                    direction={sortConfig.key === 'name' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  <TableSortLabel
                    active={sortConfig.key === 'admissionNumber'}
                    direction={sortConfig.key === 'admissionNumber' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('admissionNumber')}
                  >
                    {isMobile ? 'Adm. No.' : 'Admission Number'}
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  {isMobile ? 'Dept.' : 'Department'}
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Year</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Section</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  <TableSortLabel
                    active={sortConfig.key === 'score'}
                    direction={sortConfig.key === 'score' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('score')}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  <TableSortLabel
                    active={sortConfig.key === 'submissionStatus'}
                    direction={sortConfig.key === 'submissionStatus' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('submissionStatus')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                {!isMobile && (
                  <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                    Submit Time
                  </TableCell>
                )}
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                  <TableSortLabel
                    active={sortConfig.key === 'duration'}
                    direction={sortConfig.key === 'duration' ? sortConfig.direction : 'asc'}
                    onClick={() => requestSort('duration')}
                  >
                    Duration
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Actions</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Reattempt</TableCell>
                <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                console.log('🎯 Rendering table with students:', {
                  sortedStudentsLength: sortedStudents.length,
                  students: sortedStudents.map(s => ({
                    id: s.student._id,
                    name: s.student.name,
                    hasSubmitted: s.hasSubmitted,
                    status: s.submissionStatus,
                    score: s.totalMarks
                  }))
                });
                return sortedStudents.map((studentData) => (
                  <TableRow key={studentData.student._id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedStudents.has(studentData.student._id)}
                        onChange={() => handleSelectStudent(studentData.student._id)}
                        disabled={!studentData.hasSubmitted}
                        size={isMobile ? "small" : "medium"}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {studentData.student.name}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {studentData.student.admissionNumber}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {studentData.student.department}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {studentData.student.year}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {studentData.student.section}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {studentData.hasSubmitted ? (
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' } }}>
                          <Typography sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {studentData.totalMarks} / {quiz?.totalMarks}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary" 
                            sx={{ 
                              ml: { xs: 0, sm: 1 },
                              fontSize: { xs: '0.625rem', sm: '0.75rem' }
                            }}
                          >
                            ({calculateScorePercentage(studentData.totalMarks, quiz?.totalMarks).toFixed(1)}%)
                          </Typography>
                        </Box>
                      ) : (
                        'Not submitted'
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      <Chip
                        label={studentData.submissionStatus}
                        color={
                          studentData.submissionStatus === 'evaluated' ? 'success' :
                          studentData.submissionStatus === 'submitted' ? 'primary' :
                          studentData.submissionStatus === 'started' ? 'warning' : 'default'
                        }
                        size="small"
                        sx={{ fontSize: { xs: '0.625rem', sm: '0.75rem' } }}
                      />
                    </TableCell>
                    {!isMobile && (
                      <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                        {studentData.submitTime ? new Date(studentData.submitTime).toLocaleString() : 'N/A'}
                      </TableCell>
                    )}
                    <TableCell sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {formatDuration(studentData.duration)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size={isMobile ? "small" : "small"}
                        variant="outlined"
                        onClick={() => navigate(getSubmissionDetailsPath(studentData.student._id))}
                        disabled={!studentData.hasSubmitted}
                        sx={{ 
                          fontSize: { xs: '0.625rem', sm: '0.75rem' },
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.5, sm: 1 }
                        }}
                      >
                        {isMobile ? 'View' : 'View Details'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        size={isMobile ? "small" : "small"}
                        variant="contained"
                        color="warning"
                        onClick={() => handleReattempt(studentData)}
                        disabled={!studentData.hasSubmitted}
                        sx={{ 
                          fontSize: { xs: '0.625rem', sm: '0.75rem' },
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.5, sm: 1 }
                        }}
                      >
                        {isMobile ? 'Retry' : 'Reattempt'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        size={isMobile ? "small" : "small"}
                        variant="outlined"
                        color="error"
                        startIcon={!isMobile ? <DeleteIcon /> : null}
                        onClick={() => handleDeleteSubmission(studentData)}
                        disabled={!studentData.hasSubmitted}
                        sx={{ 
                          fontSize: { xs: '0.625rem', sm: '0.75rem' },
                          px: { xs: 1, sm: 2 },
                          py: { xs: 0.5, sm: 1 }
                        }}
                      >
                        {isMobile ? 'Del' : 'Delete'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ));
              })()}
              {sortedStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isMobile ? 10 : 12} align="center">
                    <Typography 
                      variant="h6" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                    >
                      No submissions found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Reattempt Confirmation Dialog */}
      <Dialog
        open={reattemptDialog.open}
        onClose={handleCancelReattempt}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <QuizIcon color="warning" />
            Confirm Quiz Reattempt
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {reattemptDialog.student && (
              <>
                <Typography variant="body1" gutterBottom>
                  Are you sure you want to allow <strong>
                    {reattemptDialog.student.student.name}
                  </strong> to reattempt this quiz?
                </Typography>

                <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Warning:</strong> This action will:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Delete their previous submission and score</li>
                    <li>Reset their quiz credentials</li>
                    <li>Allow them to take the quiz again</li>
                  </ul>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    This action cannot be undone.
                  </Typography>
                </Alert>

                <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1, mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Student Details:
                  </Typography>
                  <Typography variant="body2">
                    <strong>Name:</strong> {reattemptDialog.student.student.name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Admission No:</strong> {reattemptDialog.student.student.admissionNumber}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Department:</strong> {reattemptDialog.student.student.department}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Current Score:</strong> {reattemptDialog.student.totalMarks}/{quiz?.totalMarks}
                    ({calculateScorePercentage(reattemptDialog.student.totalMarks, quiz?.totalMarks).toFixed(1)}%)
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancelReattempt}
            color="secondary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReattempt}
            color="warning"
            variant="contained"
            startIcon={<QuizIcon />}
          >
            Allow Reattempt
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Reattempt Confirmation Dialog */}
      <Dialog
        open={bulkReattemptDialog.open}
        onClose={handleCancelBulkReattempt}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <QuizIcon color="warning" />
            Confirm Bulk Quiz Reattempt
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body1" gutterBottom>
              Are you sure you want to allow <strong>{bulkReattemptDialog.students.length} students</strong> to reattempt this quiz?
            </Typography>

            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> This action will:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Delete their previous submissions and scores</li>
                <li>Reset their quiz credentials</li>
                <li>Allow them to take the quiz again</li>
              </ul>
              <Typography variant="body2" sx={{ mt: 1 }}>
                This action cannot be undone.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Selected Students:
            </Typography>
            <Box sx={{ maxHeight: 300, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <List dense>
                {bulkReattemptDialog.students.map((studentData, index) => (
                  <ListItem key={studentData.student._id}>
                    <ListItemText
                      primary={`${index + 1}. ${studentData.student.name}`}
                      secondary={`${studentData.student.admissionNumber} - ${studentData.student.department} - Score: ${studentData.totalMarks}/${quiz?.totalMarks}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancelBulkReattempt}
            color="secondary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBulkReattempt}
            color="warning"
            variant="contained"
            startIcon={<QuizIcon />}
          >
            Allow Reattempt for {bulkReattemptDialog.students.length} Students
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            Confirm Submission Deletion
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {deleteDialog.student && (
              <>
                <Typography variant="body1" gutterBottom>
                  Are you sure you want to delete the submission for <strong>
                    {deleteDialog.student.student.name}
                  </strong>?
                </Typography>

                <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Warning:</strong> This action will:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Permanently delete their submission and score</li>
                    <li>Remove their quiz attempt record</li>
                    <li>This data cannot be recovered</li>
                  </ul>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>This action cannot be undone.</strong>
                  </Typography>
                </Alert>

                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Student:</strong> {deleteDialog.student.student.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Score:</strong> {deleteDialog.student.totalMarks || 0} marks
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Submitted:</strong> {deleteDialog.student.submitTime ?
                      new Date(deleteDialog.student.submitTime).toLocaleString() : 'N/A'}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancelDelete}
            color="secondary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete Submission
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deleted Users Dialog */}
      <Dialog
        open={deletedUsersDialog.open}
        onClose={handleCloseDeletedUsers}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DeleteIcon color="error" />
            Deleted Users - Academic Quiz: {quiz?.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {deletedUsersDialog.deletedUsers.length === 0 ? (
              <Alert severity="info">
                No deleted users found for this quiz.
              </Alert>
            ) : (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    These users were deleted from the quiz. Click "Restore" to restore their access.
                  </Typography>
                </Alert>

                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Admission Number</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Year</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Deleted At</TableCell>
                        <TableCell>Deleted By</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deletedUsersDialog.deletedUsers.map((submission) => (
                        <TableRow key={submission._id}>
                          <TableCell>{submission.student?.name || 'N/A'}</TableCell>
                          <TableCell>{submission.student?.admissionNumber || 'N/A'}</TableCell>
                          <TableCell>{submission.student?.department || 'N/A'}</TableCell>
                          <TableCell>{submission.student?.year || 'N/A'}</TableCell>
                          <TableCell>
                            {submission.totalMarks || 0}/{quiz?.totalMarks || 0}
                          </TableCell>
                          <TableCell>
                            {submission.deletedAt ? new Date(submission.deletedAt).toLocaleString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {submission.deletedBy?.name || submission.deletedBy?.email || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<QuizIcon />}
                              onClick={() => handleRestoreUser(submission.student?._id)}
                            >
                              Restore
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeletedUsers}
            color="secondary"
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuizAuthorizedStudents;