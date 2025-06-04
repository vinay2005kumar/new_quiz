import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const EventQuizSubmissions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [students, setStudents] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    college: '',
    department: '',
    year: '',
    scoreRange: 'all',
    submissionStatus: 'all'
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch quiz details and submissions separately to handle errors better
      try {
        const quizResponse = await api.get(`/api/event-quiz/${id}`);
        if (!quizResponse || !quizResponse.title) {
          throw new Error('Failed to fetch quiz details');
        }
        setQuiz(quizResponse);
      } catch (quizError) {
        console.error('Error fetching quiz details:', quizError);
        setError(quizError.response?.data?.message || quizError.message || 'Failed to load quiz details');
        setLoading(false);
        return;
      }

      try {
        const submissionsResponse = await api.get(`/api/event-quiz/${id}/submissions`);
        if (!submissionsResponse || !Array.isArray(submissionsResponse)) {
          throw new Error('Failed to fetch submissions');
        }

        // Transform submissions data
        const transformedStudents = submissionsResponse.map(submission => ({
          student: {
            _id: submission.student?._id,
            name: submission.student?.name || 'N/A',
            email: submission.student?.email || 'N/A',
            college: submission.student?.college || 'N/A',
            department: submission.student?.department || 'N/A',
            year: submission.student?.year || 'N/A',
            rollNumber: submission.student?.rollNumber || 'N/A'
          },
          hasSubmitted: submission.status === 'submitted',
          submissionStatus: submission.status || 'not-submitted',
          totalMarks: submission.totalMarks || 0,
          duration: submission.duration || null,
          startTime: submission.startTime || null,
          submitTime: submission.submitTime || null,
          answers: submission.answers || []
        }));

        setStudents(transformedStudents);
      } catch (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        if (submissionsError.response?.status === 403) {
          setError('You do not have permission to view submissions for this quiz');
        } else {
          setError(submissionsError.response?.data?.message || submissionsError.message || 'Failed to load submissions');
        }
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      name: '',
      email: '',
      college: '',
      department: '',
      year: '',
      scoreRange: 'all',
      submissionStatus: 'all'
    });
  };

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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
    return students.filter(student => {
      if (!student || !student.student) return false;

      // Name filter
      if (filters.name && 
          !student.student.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }

      // Email filter
      if (filters.email && 
          !student.student.email.toLowerCase().includes(filters.email.toLowerCase())) {
        return false;
      }

      // College filter
      if (filters.college && 
          !student.student.college.toLowerCase().includes(filters.college.toLowerCase())) {
        return false;
      }

      // Department filter
      if (filters.department && 
          !student.student.department.toLowerCase().includes(filters.department.toLowerCase())) {
        return false;
      }

      // Year filter
      if (filters.year && 
          !student.student.year.toString().includes(filters.year)) {
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
      }

      return true;
    });
  }, [students, filters, quiz?.totalMarks]);

  const sortedStudents = useMemo(() => {
    if (!filteredStudents) return [];
    
    const sortableStudents = [...filteredStudents];
    if (!sortConfig.key) return sortableStudents;

    return sortableStudents.sort((a, b) => {
      if (!a || !b || !a.student || !b.student) return 0;

      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      switch (sortConfig.key) {
        case 'name':
          return direction * a.student.name.localeCompare(b.student.name);
        case 'email':
          return direction * a.student.email.localeCompare(b.student.email);
        case 'college':
          return direction * a.student.college.localeCompare(b.student.college);
        case 'department':
          return direction * a.student.department.localeCompare(b.student.department);
        case 'year':
          return direction * (a.student.year - b.student.year);
        case 'score':
          if (!a.hasSubmitted && !b.hasSubmitted) return 0;
          if (!a.hasSubmitted) return direction;
          if (!b.hasSubmitted) return -direction;
          return direction * (a.totalMarks - b.totalMarks);
        case 'duration':
          if (!a.duration && !b.duration) return 0;
          if (!a.duration) return direction;
          if (!b.duration) return -direction;
          return direction * (a.duration - b.duration);
        default:
          return 0;
      }
    });
  }, [filteredStudents, sortConfig]);

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FilterListIcon fontSize="small" sx={{ opacity: 0.3 }} />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUpwardIcon fontSize="small" /> : 
      <ArrowDownwardIcon fontSize="small" />;
  };

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
                Total Registrations: {students.length}
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
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Name"
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Email"
              value={filters.email}
              onChange={(e) => handleFilterChange('email', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="College"
              value={filters.college}
              onChange={(e) => handleFilterChange('college', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Department"
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Year"
              value={filters.year}
              onChange={(e) => handleFilterChange('year', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Score Range</InputLabel>
              <Select
                value={filters.scoreRange}
                label="Score Range"
                onChange={(e) => handleFilterChange('scoreRange', e.target.value)}
              >
                <MenuItem value="all">All Scores</MenuItem>
                <MenuItem value="0-0">Not Submitted</MenuItem>
                <MenuItem value="0-50">Below 50%</MenuItem>
                <MenuItem value="50-70">50% - 70%</MenuItem>
                <MenuItem value="70-90">70% - 90%</MenuItem>
                <MenuItem value="90-100">Above 90%</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Submission Status</InputLabel>
              <Select
                value={filters.submissionStatus}
                label="Submission Status"
                onChange={(e) => handleFilterChange('submissionStatus', e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="not-submitted">Not Submitted</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              onClick={resetFilters}
              fullWidth
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Tooltip title="Sort by Name">
                    <IconButton size="small" onClick={() => requestSort('name')}>
                      {renderSortIcon('name')}
                    </IconButton>
                  </Tooltip>
                  Name
                </TableCell>
                <TableCell>
                  <Tooltip title="Sort by Email">
                    <IconButton size="small" onClick={() => requestSort('email')}>
                      {renderSortIcon('email')}
                    </IconButton>
                  </Tooltip>
                  Email
                </TableCell>
                <TableCell>
                  <Tooltip title="Sort by College">
                    <IconButton size="small" onClick={() => requestSort('college')}>
                      {renderSortIcon('college')}
                    </IconButton>
                  </Tooltip>
                  College
                </TableCell>
                <TableCell>
                  <Tooltip title="Sort by Department">
                    <IconButton size="small" onClick={() => requestSort('department')}>
                      {renderSortIcon('department')}
                    </IconButton>
                  </Tooltip>
                  Department
                </TableCell>
                <TableCell>
                  <Tooltip title="Sort by Year">
                    <IconButton size="small" onClick={() => requestSort('year')}>
                      {renderSortIcon('year')}
                    </IconButton>
                  </Tooltip>
                  Year
                </TableCell>
                <TableCell>Roll Number</TableCell>
                <TableCell>
                  <Tooltip title="Sort by Score">
                    <IconButton size="small" onClick={() => requestSort('score')}>
                      {renderSortIcon('score')}
                    </IconButton>
                  </Tooltip>
                  Score
                </TableCell>
                <TableCell>
                  <Tooltip title="Sort by Duration">
                    <IconButton size="small" onClick={() => requestSort('duration')}>
                      {renderSortIcon('duration')}
                    </IconButton>
                  </Tooltip>
                  Duration
                </TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedStudents.map((studentData) => (
                <TableRow key={studentData.student._id}>
                  <TableCell>{studentData.student.name}</TableCell>
                  <TableCell>{studentData.student.email}</TableCell>
                  <TableCell>{studentData.student.college}</TableCell>
                  <TableCell>{studentData.student.department}</TableCell>
                  <TableCell>{studentData.student.year}</TableCell>
                  <TableCell>{studentData.student.rollNumber}</TableCell>
                  <TableCell>
                    {studentData.hasSubmitted 
                      ? `${studentData.totalMarks}/${quiz?.totalMarks} (${Math.round(calculateScorePercentage(studentData.totalMarks, quiz?.totalMarks))}%)`
                      : 'Not submitted'
                    }
                  </TableCell>
                  <TableCell>{formatDuration(studentData.duration)}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/event/quiz/${id}/submission/${studentData.student._id}`)}
                      disabled={!studentData.hasSubmitted}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sortedStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No submissions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default EventQuizSubmissions; 