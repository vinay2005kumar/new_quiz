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
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  PersonAdd as PersonAddIcon,
  List as ListIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import { toast } from 'react-toastify';

const EventQuizSubmissions = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Reusable text field style for edit mode
  const editTextFieldStyle = {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'background.paper'
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [students, setStudents] = useState([]);
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [showShortlisted, setShowShortlisted] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [teamDetailsDialog, setTeamDetailsDialog] = useState({ open: false, team: null });
  const [individualDetailsDialog, setIndividualDetailsDialog] = useState({ open: false, student: null });
  const [individualEditDialog, setIndividualEditDialog] = useState({ open: false, student: null });
  const [editMode, setEditMode] = useState(false);
  const [editedTeamData, setEditedTeamData] = useState(null);
  const [editedIndividualData, setEditedIndividualData] = useState(null);
  const [filters, setFilters] = useState({
    name: '',
    email: '',
    college: '',
    department: '',
    year: '',
    scoreRange: 'all',
    participationStatus: 'all'
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch quiz details first
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
        // Fetch both registrations and submissions
        const [registrationsResponse, submissionsResponse] = await Promise.all([
          api.get(`/api/event-quiz/${id}/registrations`),
          api.get(`/api/event-quiz/${id}/submissions`).catch(() => []) // Don't fail if no submissions yet
        ]);

        const registrations = Array.isArray(registrationsResponse) ? registrationsResponse : [];
        const submissions = Array.isArray(submissionsResponse) ? submissionsResponse : [];

        // Create a map of submissions by email for quick lookup
        const submissionMap = new Map();
        submissions.forEach(submission => {
          if (submission.student?.email) {
            submissionMap.set(submission.student.email, submission);
          }
        });

        // Transform registrations data and merge with submissions
        const transformedStudents = registrations.map(registration => {
          const submission = submissionMap.get(registration.email);

          return {
            student: {
              _id: registration._id,
              name: registration.name || 'N/A',
              email: registration.email || 'N/A',
              college: registration.college || 'N/A',
              department: registration.department || 'N/A',
              year: registration.year || 'N/A',
              phoneNumber: registration.phoneNumber || 'N/A',
              admissionNumber: registration.admissionNumber || 'N/A',
              participantType: registration.participantType || 'N/A',
              isTeamRegistration: registration.isTeamRegistration || false,
              teamName: registration.teamName || null,
              teamLeader: registration.teamLeader || null,
              teamMembers: registration.teamMembers || [],
              teamMemberNames: registration.teamMemberNames || null,
              totalTeamSize: registration.totalTeamSize || 1,
              registeredAt: registration.registeredAt
            },
            hasSubmitted: submission ? submission.status === 'submitted' : false,
            submissionStatus: submission ? submission.status : 'not-submitted',
            totalMarks: submission ? submission.totalMarks || 0 : 0,
            duration: submission ? submission.duration : null,
            startTime: submission ? submission.startTime : null,
            submitTime: submission ? submission.submitTime : null,
            answers: submission ? submission.answers || [] : []
          };
        });

        console.log('Transformed students data:', transformedStudents);
        setStudents(transformedStudents);
      } catch (dataError) {
        console.error('Error fetching data:', dataError);
        if (dataError.response?.status === 403) {
          setError('You do not have permission to view data for this quiz');
        } else {
          setError(dataError.response?.data?.message || dataError.message || 'Failed to load quiz data');
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
      participationStatus: 'all'
    });
  };

  const handleShortlist = (studentData) => {
    const isAlreadyShortlisted = shortlistedCandidates.some(
      candidate => candidate.student._id === studentData.student._id
    );

    if (!isAlreadyShortlisted) {
      setShortlistedCandidates(prev => [...prev, {
        ...studentData,
        shortlistedAt: new Date().toISOString(),
        shortlistedBy: 'Event Manager' // You can get this from user context
      }]);

      // Show success toast
      toast.success(`${studentData.student.name} added to shortlist!`, {
        position: "top-right",
        autoClose: 3000,
      });
    } else {
      toast.warning(`${studentData.student.name} is already shortlisted!`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const removeFromShortlist = (studentId) => {
    const student = shortlistedCandidates.find(candidate => candidate.student._id === studentId);
    setShortlistedCandidates(prev =>
      prev.filter(candidate => candidate.student._id !== studentId)
    );

    if (student) {
      toast.info(`${student.student.name} removed from shortlist`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const isShortlisted = (studentId) => {
    return shortlistedCandidates.some(candidate => candidate.student._id === studentId);
  };

  const handleViewTeamDetails = (teamData) => {
    setTeamDetailsDialog({ open: true, team: teamData });
  };

  const handleViewIndividualDetails = (studentData) => {
    setIndividualDetailsDialog({ open: true, student: studentData });
  };

  const handleCloseTeamDetails = () => {
    setTeamDetailsDialog({ open: false, team: null });
    setEditMode(false);
    setEditedTeamData(null);
  };

  const handleCloseIndividualDetails = () => {
    setIndividualDetailsDialog({ open: false, student: null });
  };

  const handleEditIndividualDetails = (studentData) => {
    setIndividualEditDialog({ open: true, student: studentData });
    setEditedIndividualData({
      name: studentData.student.name,
      email: studentData.student.email,
      college: studentData.student.college,
      department: studentData.student.department,
      year: studentData.student.year,
      admissionNumber: studentData.student.admissionNumber || studentData.student.rollNumber,
      phoneNumber: studentData.student.phoneNumber
    });
    setIndividualDetailsDialog({ open: false, student: null });
  };

  const handleCloseIndividualEdit = () => {
    setIndividualEditDialog({ open: false, student: null });
    setEditedIndividualData(null);
  };

  const handleSaveIndividualEdit = async () => {
    try {
      await api.put(`/api/event-quiz/${id}/registrations/${individualEditDialog.student.student._id}`, editedIndividualData);
      toast.success('Student details updated successfully!');
      handleCloseIndividualEdit();
      fetchData(); // Refresh the data
    } catch (error) {
      toast.error('Failed to update student details: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditTeam = () => {
    setEditMode(true);
    setEditedTeamData({
      teamName: teamDetailsDialog.team.teamName,
      teamLeader: { ...teamDetailsDialog.team.teamLeader },
      teamMembers: teamDetailsDialog.team.teamMembers.map(member => ({ ...member }))
    });
  };

  const handleSaveTeamEdit = async () => {
    try {
      await api.put(`/api/event-quiz/${id}/registrations/${teamDetailsDialog.team._id}`, editedTeamData);
      toast.success('Team details updated successfully!');
      setEditMode(false);
      setEditedTeamData(null);
      handleCloseTeamDetails();
      fetchData(); // Refresh the data
    } catch (error) {
      toast.error('Failed to update team details: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteRegistration = async (registrationId, registrationName) => {
    if (window.confirm(`Are you sure you want to delete the registration for "${registrationName}"? This action cannot be undone.`)) {
      try {
        await api.delete(`/api/event-quiz/${id}/registrations/${registrationId}`);
        toast.success('Registration deleted successfully!');
        fetchData(); // Refresh the data
      } catch (error) {
        toast.error('Failed to delete registration: ' + (error.response?.data?.message || error.message));
      }
    }
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

      // Participation status filter (combines registration and attempt status)
      if (filters.participationStatus !== 'all') {
        const isRegistered = true; // All students in the list are registered
        const hasAttempted = student.hasSubmitted;

        if (filters.participationStatus === 'registered-and-attempted' && (!isRegistered || !hasAttempted)) return false;
        if (filters.participationStatus === 'registered-not-attempted' && (!isRegistered || hasAttempted)) return false;
      }

      return true;
    });
  }, [students, filters, quiz?.totalMarks]);

  // Calculate participation counts
  const participationCounts = useMemo(() => {
    const totalRegistered = students.length;
    const totalAttempted = students.filter(s => s.hasSubmitted).length;
    const registeredNotAttempted = totalRegistered - totalAttempted;

    return {
      totalRegistered,
      totalAttempted,
      registeredNotAttempted,
      filteredCount: filteredStudents.length
    };
  }, [students, filteredStudents]);

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

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" gutterBottom>
              {quiz?.title} - {showShortlisted ? 'Shortlisted Candidates' : 'Results & Registrations'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={fetchData}
                startIcon={<RefreshIcon />}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button
                variant={showShortlisted ? "outlined" : "contained"}
                onClick={() => setShowShortlisted(false)}
                startIcon={<ListIcon />}
              >
                All Results ({students.length})
              </Button>
              <Button
                variant={showShortlisted ? "contained" : "outlined"}
                onClick={() => setShowShortlisted(true)}
                startIcon={<PersonAddIcon />}
                color="success"
              >
                Shortlisted ({shortlistedCandidates.length})
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                <Typography variant="h6">{participationCounts.totalRegistered}</Typography>
                <Typography variant="body2">Total Registered</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                <Typography variant="h6">{participationCounts.totalAttempted}</Typography>
                <Typography variant="body2">Attempted Quiz</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                <Typography variant="h6">{participationCounts.registeredNotAttempted}</Typography>
                <Typography variant="body2">Registered Only</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
                <Typography variant="h6">{shortlistedCandidates.length}</Typography>
                <Typography variant="body2">Shortlisted</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={2.4}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'secondary.light', color: 'white' }}>
                <Typography variant="h6">
                  {participationCounts.filteredCount}
                </Typography>
                <Typography variant="body2">Filtered Results</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {/* Row 1: Basic Info Filters */}
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

          {/* Row 2: Status and Score Filters */}
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
              <InputLabel>Participation Status</InputLabel>
              <Select
                value={filters.participationStatus}
                label="Participation Status"
                onChange={(e) => handleFilterChange('participationStatus', e.target.value)}
              >
                <MenuItem value="all">
                  All Students ({participationCounts.totalRegistered})
                </MenuItem>
                <MenuItem value="registered-and-attempted">
                  Registered & Attempted ({participationCounts.totalAttempted})
                </MenuItem>
                <MenuItem value="registered-not-attempted">
                  Registered Only ({participationCounts.registeredNotAttempted})
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              onClick={resetFilters}
              fullWidth
              sx={{ height: '40px' }}
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
                {quiz?.participationMode === 'team' && (
                  <>
                    <TableCell>Team Name</TableCell>
                    <TableCell>Team Members</TableCell>
                  </>
                )}
                <TableCell>Participant Type</TableCell>
                <TableCell>Attempt Status</TableCell>
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
                <TableCell>Details</TableCell>
                <TableCell>Actions</TableCell>
                <TableCell>Delete</TableCell>
                <TableCell>Shortlist</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(showShortlisted ? shortlistedCandidates : sortedStudents).map((studentData) => (
                <TableRow
                  key={studentData.student._id}
                  sx={{
                    backgroundColor: isShortlisted(studentData.student._id) ? '#e8f5e8' : 'inherit'
                  }}
                >
                  <TableCell>
                    {studentData.student.name}
                    {studentData.student.isTeamRegistration && (
                      <Chip
                        label="Team Leader"
                        size="small"
                        color="success"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </TableCell>
                  <TableCell>{studentData.student.email}</TableCell>
                  <TableCell>{studentData.student.college}</TableCell>
                  <TableCell>{studentData.student.department}</TableCell>
                  <TableCell>{studentData.student.year}</TableCell>
                  {quiz?.participationMode === 'team' && (
                    <>
                      <TableCell>{studentData.student.teamName || '-'}</TableCell>
                      <TableCell>
                        {studentData.student.isTeamRegistration ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {studentData.student.teamMemberNames ||
                               (studentData.student.teamMembers?.map(m => m.name).join(', ')) ||
                               'No members'}
                            </Typography>
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Chip
                      label={studentData.student.participantType === 'college' ? 'College' : 'External'}
                      size="small"
                      color={studentData.student.participantType === 'college' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={studentData.hasSubmitted ? 'Attempted' : 'Registered Only'}
                      size="small"
                      color={studentData.hasSubmitted ? 'success' : 'warning'}
                    />
                  </TableCell>
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
                      color="info"
                      onClick={() => {
                        if (studentData.student.isTeamRegistration) {
                          handleViewTeamDetails(studentData.student);
                        } else {
                          handleViewIndividualDetails(studentData);
                        }
                      }}
                    >
                      {studentData.student.isTeamRegistration ? 'Team Details' : 'Details'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/event/quiz/${id}/submission/${studentData.student._id}`)}
                      disabled={!studentData.hasSubmitted}
                    >
                      View Submission
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleDeleteRegistration(
                        studentData.student._id,
                        studentData.student.isTeamRegistration ?
                          `${studentData.student.name} (Team: ${studentData.student.teamName})` :
                          studentData.student.name
                      )}
                    >
                      Delete
                    </Button>
                  </TableCell>
                  <TableCell>
                    {isShortlisted(studentData.student._id) ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => removeFromShortlist(studentData.student._id)}
                        startIcon={<PersonAddIcon />}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => handleShortlist(studentData)}
                        startIcon={<AddIcon />}
                      >
                        Add
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sortedStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={quiz?.participationMode === 'team' ? 13 : 11} align="center">
                    No registrations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Team Details Dialog */}
      <Dialog
        open={teamDetailsDialog.open}
        onClose={handleCloseTeamDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editMode ? 'Edit Team Details' : 'Team Details'}: {editMode ? editedTeamData?.teamName : teamDetailsDialog.team?.teamName}
        </DialogTitle>
        <DialogContent>
          {teamDetailsDialog.team && (
            <Box sx={{ mt: 2 }}>
              {/* Team Name */}
              {editMode && (
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Team Name"
                    value={editedTeamData?.teamName || ''}
                    onChange={(e) => setEditedTeamData(prev => ({ ...prev, teamName: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}

              {/* Team Leader Section */}
              <Typography variant="h6" gutterBottom color="success.main">
                Team Leader
              </Typography>
              <Paper sx={{
                p: 2,
                mb: 3,
                border: '2px solid',
                borderColor: 'success.main',
                bgcolor: 'background.paper'
              }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    {editMode ? (
                      <TextField
                        fullWidth
                        label="Name"
                        value={editedTeamData?.teamLeader?.name || ''}
                        onChange={(e) => setEditedTeamData(prev => ({
                          ...prev,
                          teamLeader: { ...prev.teamLeader, name: e.target.value }
                        }))}
                        size="small"
                        sx={editTextFieldStyle}
                      />
                    ) : (
                      <Typography variant="body2"><strong>Name:</strong> {teamDetailsDialog.team.teamLeader?.name}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {editMode ? (
                      <TextField
                        fullWidth
                        label="Email"
                        value={editedTeamData?.teamLeader?.email || ''}
                        onChange={(e) => setEditedTeamData(prev => ({
                          ...prev,
                          teamLeader: { ...prev.teamLeader, email: e.target.value }
                        }))}
                        size="small"
                        sx={editTextFieldStyle}
                      />
                    ) : (
                      <Typography variant="body2" color="text.primary"><strong>Email:</strong> {teamDetailsDialog.team.teamLeader?.email}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {editMode ? (
                      <TextField
                        fullWidth
                        label="College"
                        value={editedTeamData?.teamLeader?.college || ''}
                        onChange={(e) => setEditedTeamData(prev => ({
                          ...prev,
                          teamLeader: { ...prev.teamLeader, college: e.target.value }
                        }))}
                        size="small"
                        sx={{
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          '& .MuiInputBase-root': {
                            color: 'text.primary',
                            bgcolor: 'background.paper'
                          },
                          '& .MuiInputLabel-root': {
                            color: 'text.secondary'
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: 'divider'
                            },
                            '&:hover fieldset': {
                              borderColor: 'primary.main'
                            }
                          }
                        }}
                      />
                    ) : (
                      <Typography variant="body2"><strong>College:</strong> {teamDetailsDialog.team.teamLeader?.college}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {editMode ? (
                      <TextField
                        fullWidth
                        label="Department"
                        value={editedTeamData?.teamLeader?.department || ''}
                        onChange={(e) => setEditedTeamData(prev => ({
                          ...prev,
                          teamLeader: { ...prev.teamLeader, department: e.target.value }
                        }))}
                        size="small"
                        sx={{
                          bgcolor: 'background.paper',
                          borderRadius: 1,
                          '& .MuiInputBase-root': {
                            color: 'text.primary',
                            bgcolor: 'background.paper'
                          },
                          '& .MuiInputLabel-root': {
                            color: 'text.secondary'
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': {
                              borderColor: 'divider'
                            },
                            '&:hover fieldset': {
                              borderColor: 'primary.main'
                            }
                          }
                        }}
                      />
                    ) : (
                      <Typography variant="body2"><strong>Department:</strong> {teamDetailsDialog.team.teamLeader?.department}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {editMode ? (
                      <TextField
                        fullWidth
                        label="Year"
                        value={editedTeamData?.teamLeader?.year || ''}
                        onChange={(e) => setEditedTeamData(prev => ({
                          ...prev,
                          teamLeader: { ...prev.teamLeader, year: e.target.value }
                        }))}
                        size="small"
                        sx={editTextFieldStyle}
                      />
                    ) : (
                      <Typography variant="body2"><strong>Year:</strong> {teamDetailsDialog.team.teamLeader?.year}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {editMode ? (
                      <TextField
                        fullWidth
                        label="Phone"
                        value={editedTeamData?.teamLeader?.phoneNumber || ''}
                        onChange={(e) => setEditedTeamData(prev => ({
                          ...prev,
                          teamLeader: { ...prev.teamLeader, phoneNumber: e.target.value }
                        }))}
                        size="small"
                        sx={editTextFieldStyle}
                      />
                    ) : (
                      <Typography variant="body2"><strong>Phone:</strong> {teamDetailsDialog.team.teamLeader?.phoneNumber}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {editMode ? (
                      <TextField
                        fullWidth
                        label="Admission No"
                        value={editedTeamData?.teamLeader?.admissionNumber || ''}
                        onChange={(e) => setEditedTeamData(prev => ({
                          ...prev,
                          teamLeader: { ...prev.teamLeader, admissionNumber: e.target.value }
                        }))}
                        size="small"
                        sx={editTextFieldStyle}
                      />
                    ) : (
                      <Typography variant="body2"><strong>Admission No:</strong> {teamDetailsDialog.team.teamLeader?.admissionNumber}</Typography>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>Type:</strong>
                      <Chip
                        label={teamDetailsDialog.team.teamLeader?.participantType === 'college' ? 'College' : 'External'}
                        size="small"
                        color={teamDetailsDialog.team.teamLeader?.participantType === 'college' ? 'primary' : 'secondary'}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Team Members Section */}
              <Typography variant="h6" gutterBottom color="info.main">
                Team Members ({teamDetailsDialog.team.teamMembers?.length || 0})
              </Typography>
              {teamDetailsDialog.team.teamMembers?.map((member, index) => (
                <Paper key={index} sx={{
                  p: 2,
                  mb: 2,
                  border: '2px solid',
                  borderColor: 'info.main',
                  bgcolor: 'background.paper'
                }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Member {index + 1}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="Name"
                          value={editedTeamData?.teamMembers?.[index]?.name || ''}
                          onChange={(e) => {
                            const newMembers = [...(editedTeamData?.teamMembers || [])];
                            newMembers[index] = { ...newMembers[index], name: e.target.value };
                            setEditedTeamData(prev => ({ ...prev, teamMembers: newMembers }));
                          }}
                          size="small"
                          sx={editTextFieldStyle}
                        />
                      ) : (
                        <Typography variant="body2"><strong>Name:</strong> {member.name}</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="Email"
                          value={editedTeamData?.teamMembers?.[index]?.email || ''}
                          onChange={(e) => {
                            const newMembers = [...(editedTeamData?.teamMembers || [])];
                            newMembers[index] = { ...newMembers[index], email: e.target.value };
                            setEditedTeamData(prev => ({ ...prev, teamMembers: newMembers }));
                          }}
                          size="small"
                          sx={editTextFieldStyle}
                        />
                      ) : (
                        <Typography variant="body2"><strong>Email:</strong> {member.email}</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="College"
                          value={editedTeamData?.teamMembers?.[index]?.college || ''}
                          onChange={(e) => {
                            const newMembers = [...(editedTeamData?.teamMembers || [])];
                            newMembers[index] = { ...newMembers[index], college: e.target.value };
                            setEditedTeamData(prev => ({ ...prev, teamMembers: newMembers }));
                          }}
                          size="small"
                          sx={editTextFieldStyle}
                        />
                      ) : (
                        <Typography variant="body2"><strong>College:</strong> {member.college}</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="Department"
                          value={editedTeamData?.teamMembers?.[index]?.department || ''}
                          onChange={(e) => {
                            const newMembers = [...(editedTeamData?.teamMembers || [])];
                            newMembers[index] = { ...newMembers[index], department: e.target.value };
                            setEditedTeamData(prev => ({ ...prev, teamMembers: newMembers }));
                          }}
                          size="small"
                          sx={editTextFieldStyle}
                        />
                      ) : (
                        <Typography variant="body2"><strong>Department:</strong> {member.department}</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="Year"
                          value={editedTeamData?.teamMembers?.[index]?.year || ''}
                          onChange={(e) => {
                            const newMembers = [...(editedTeamData?.teamMembers || [])];
                            newMembers[index] = { ...newMembers[index], year: e.target.value };
                            setEditedTeamData(prev => ({ ...prev, teamMembers: newMembers }));
                          }}
                          size="small"
                          sx={editTextFieldStyle}
                        />
                      ) : (
                        <Typography variant="body2"><strong>Year:</strong> {member.year}</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="Phone"
                          value={editedTeamData?.teamMembers?.[index]?.phoneNumber || ''}
                          onChange={(e) => {
                            const newMembers = [...(editedTeamData?.teamMembers || [])];
                            newMembers[index] = { ...newMembers[index], phoneNumber: e.target.value };
                            setEditedTeamData(prev => ({ ...prev, teamMembers: newMembers }));
                          }}
                          size="small"
                          sx={editTextFieldStyle}
                        />
                      ) : (
                        <Typography variant="body2"><strong>Phone:</strong> {member.phoneNumber}</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {editMode ? (
                        <TextField
                          fullWidth
                          label="Admission No"
                          value={editedTeamData?.teamMembers?.[index]?.admissionNumber || ''}
                          onChange={(e) => {
                            const newMembers = [...(editedTeamData?.teamMembers || [])];
                            newMembers[index] = { ...newMembers[index], admissionNumber: e.target.value };
                            setEditedTeamData(prev => ({ ...prev, teamMembers: newMembers }));
                          }}
                          size="small"
                          sx={editTextFieldStyle}
                        />
                      ) : (
                        <Typography variant="body2"><strong>Admission No:</strong> {member.admissionNumber}</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2">
                        <strong>Type:</strong>
                        <Chip
                          label={member.participantType === 'college' ? 'College' : 'External'}
                          size="small"
                          color={member.participantType === 'college' ? 'primary' : 'secondary'}
                          sx={{ ml: 1 }}
                        />
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              {/* Team Summary */}
              <Paper sx={{
                p: 2,
                border: '2px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}>
                <Typography variant="h6" gutterBottom color="text.primary">
                  Team Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.primary"><strong>Total Team Size:</strong> {teamDetailsDialog.team.totalTeamSize}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.primary"><strong>Registration Date:</strong> {new Date(teamDetailsDialog.team.registeredAt).toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {editMode ? (
            <>
              <Button onClick={() => setEditMode(false)} color="secondary">
                Cancel
              </Button>
              <Button onClick={handleSaveTeamEdit} color="primary" variant="contained">
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleCloseTeamDetails} color="secondary">
                Close
              </Button>
              <Button onClick={handleEditTeam} color="primary" variant="contained">
                Edit Details
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Individual Student Details Dialog */}
      <Dialog
        open={individualDetailsDialog.open}
        onClose={handleCloseIndividualDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            Individual Student Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {individualDetailsDialog.student && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* Student Information */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
                    Student Information
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {individualDetailsDialog.student.student?.name || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {individualDetailsDialog.student.student?.email || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      College
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {individualDetailsDialog.student.student?.college || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Department
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {individualDetailsDialog.student.student?.department || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Year
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {individualDetailsDialog.student.student?.year || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Admission Number
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {individualDetailsDialog.student.student?.admissionNumber || individualDetailsDialog.student.student?.rollNumber || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>

                {/* Quiz Performance */}
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', borderBottom: 1, borderColor: 'divider', pb: 1, mt: 2 }}>
                    Quiz Performance
                  </Typography>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Score
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {individualDetailsDialog.student.totalMarks || 0} marks
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Time Taken
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {individualDetailsDialog.student.duration ?
                        `${Math.floor(individualDetailsDialog.student.duration / 60)}:${(individualDetailsDialog.student.duration % 60).toString().padStart(2, '0')}` :
                        'N/A'
                      }
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Submission Time
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {individualDetailsDialog.student.submitTime ?
                        new Date(individualDetailsDialog.student.submitTime).toLocaleString() :
                        'N/A'
                      }
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip
                      label={individualDetailsDialog.student.status || 'N/A'}
                      color={individualDetailsDialog.student.status === 'submitted' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIndividualDetails} color="secondary">
            Close
          </Button>
          <Button
            onClick={() => handleEditIndividualDetails(individualDetailsDialog.student)}
            color="primary"
            variant="contained"
          >
            Edit Details
          </Button>
        </DialogActions>
      </Dialog>

      {/* Individual Student Edit Dialog */}
      <Dialog
        open={individualEditDialog.open}
        onClose={handleCloseIndividualEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon />
            Edit Student Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {editedIndividualData && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={editedIndividualData.name || ''}
                    onChange={(e) => setEditedIndividualData({ ...editedIndividualData, name: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={editedIndividualData.email || ''}
                    onChange={(e) => setEditedIndividualData({ ...editedIndividualData, email: e.target.value })}
                    required
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="College"
                    value={editedIndividualData.college || ''}
                    onChange={(e) => setEditedIndividualData({ ...editedIndividualData, college: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Department"
                    value={editedIndividualData.department || ''}
                    onChange={(e) => setEditedIndividualData({ ...editedIndividualData, department: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Year"
                    value={editedIndividualData.year || ''}
                    onChange={(e) => setEditedIndividualData({ ...editedIndividualData, year: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Admission Number"
                    value={editedIndividualData.admissionNumber || ''}
                    onChange={(e) => setEditedIndividualData({ ...editedIndividualData, admissionNumber: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    value={editedIndividualData.phoneNumber || ''}
                    onChange={(e) => setEditedIndividualData({ ...editedIndividualData, phoneNumber: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIndividualEdit} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleSaveIndividualEdit}
            color="primary"
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EventQuizSubmissions; 