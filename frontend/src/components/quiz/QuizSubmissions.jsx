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
  ListItemText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteIcon from '@mui/icons-material/Delete';
import QuizIcon from '@mui/icons-material/Quiz';
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

  // Bulk reattempt functionality
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkReattemptDialog, setBulkReattemptDialog] = useState({ open: false, students: [] });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch quiz details and submissions in parallel
      const [quizResponse, submissionsResponse] = await Promise.all([
        api.get(`api/quiz/${id}`),
        api.get(`api/quiz/${id}/submissions`)
      ]);

      if (!quizResponse || !quizResponse.title) {
        throw new Error('Failed to fetch quiz details');
      }

      setQuiz(quizResponse);

      if (!submissionsResponse || !submissionsResponse.submissions) {
        throw new Error('Failed to fetch submissions');
      }

      // Transform submissions data to include all necessary details
      const transformedStudents = submissionsResponse.submissions.map(submission => ({
        student: {
          _id: submission.student?._id,
          name: submission.student?.name || 'N/A',
          admissionNumber: submission.student?.admissionNumber || 'N/A',
          department: submission.student?.department || 'N/A',
          year: submission.student?.year || 'N/A',
          section: submission.student?.section || 'N/A'
        },
        hasSubmitted: submission.status === 'evaluated',
        submissionStatus: submission.status || 'not-submitted',
        totalMarks: submission.totalMarks || 0,
        duration: submission.duration || null,
        startTime: submission.startTime || null,
        submitTime: submission.submitTime || null,
        answers: submission.answers || []
      }));

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

  const handleDeleteSubmission = async (studentData) => {
    if (window.confirm(`Are you sure you want to delete the submission for "${studentData.student.name}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/api/quiz/${id}/submissions/${studentData.student._id}`);
        toast.success('Submission deleted successfully!');
        fetchData(); // Refresh the data
      } catch (error) {
        console.error('Error deleting submission:', error);
        toast.error('Failed to delete submission: ' + (error.response?.data?.message || error.message));
      }
    }
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
    if (!students || !Array.isArray(students)) return [];
    
    return students.filter(student => {
      if (!student || !student.student) return false;

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
  }, [students, filters, quiz?.totalMarks]);

  const sortedStudents = useMemo(() => {
    if (!filteredStudents || !Array.isArray(filteredStudents)) return [];
    
    const sortableStudents = [...filteredStudents];
    if (!sortConfig.key) return sortableStudents;

    return sortableStudents.sort((a, b) => {
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
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>

          <Typography variant="h4" gutterBottom>
            {quiz?.title} - Submissions
          </Typography>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                Total Students: {students.length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
                Submitted: {students.filter(s => s.hasSubmitted).length}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body1">
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
          <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1">
                {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
              </Typography>
              <Button
                variant="contained"
                color="warning"
                startIcon={<QuizIcon />}
                onClick={handleBulkReattempt}
              >
                Allow Reattempt for Selected
              </Button>
            </Box>
          </Box>
        )}

        {/* Results Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedStudents.size > 0 && selectedStudents.size < sortedStudents.filter(s => s.hasSubmitted).length}
                    checked={sortedStudents.filter(s => s.hasSubmitted).length > 0 && selectedStudents.size === sortedStudents.filter(s => s.hasSubmitted).length}
                    onChange={handleSelectAll}
                    disabled={sortedStudents.filter(s => s.hasSubmitted).length === 0}
                  />
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'name'}
                    direction={sortConfig.direction}
                    onClick={() => requestSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'admissionNumber'}
                    direction={sortConfig.direction}
                    onClick={() => requestSort('admissionNumber')}
                  >
                    Admission No.
                  </TableSortLabel>
                </TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Year</TableCell>
                <TableCell>Section</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'score'}
                    direction={sortConfig.direction}
                    onClick={() => requestSort('score')}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Submit Time</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Actions</TableCell>
                <TableCell>Reattempt</TableCell>
                <TableCell>Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedStudents.map((studentData) => (
                <TableRow key={studentData.student._id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedStudents.has(studentData.student._id)}
                      onChange={() => handleSelectStudent(studentData.student._id)}
                      disabled={!studentData.hasSubmitted}
                    />
                  </TableCell>
                  <TableCell>{studentData.student.name}</TableCell>
                  <TableCell>{studentData.student.admissionNumber}</TableCell>
                  <TableCell>{studentData.student.department}</TableCell>
                  <TableCell>{studentData.student.year}</TableCell>
                  <TableCell>{studentData.student.section}</TableCell>
                  <TableCell>
                    {studentData.hasSubmitted ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>
                          {studentData.totalMarks} / {quiz?.totalMarks}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({calculateScorePercentage(studentData.totalMarks, quiz?.totalMarks).toFixed(1)}%)
                        </Typography>
                      </Box>
                    ) : (
                      'Not submitted'
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={studentData.submissionStatus}
                      color={
                        studentData.submissionStatus === 'evaluated' ? 'success' :
                        studentData.submissionStatus === 'submitted' ? 'primary' :
                        studentData.submissionStatus === 'started' ? 'warning' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {studentData.submitTime ? new Date(studentData.submitTime).toLocaleString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {formatDuration(studentData.duration)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(getSubmissionDetailsPath(studentData.student._id))}
                      disabled={!studentData.hasSubmitted}
                    >
                      View Details
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      onClick={() => handleReattempt(studentData)}
                      disabled={!studentData.hasSubmitted}
                    >
                      Reattempt
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDeleteSubmission(studentData)}
                      disabled={!studentData.hasSubmitted}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sortedStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center">
                    No submissions found
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
    </Container>
  );
};

export default QuizAuthorizedStudents;