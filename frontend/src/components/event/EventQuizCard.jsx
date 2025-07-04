import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Event as EventIcon,
  AccessTime as TimeIcon,
  Group as GroupIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Class as ClassIcon,
  CalendarMonth as CalendarIcon,
  HowToReg as RegisterIcon,
  PlayArrow as StartIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import EventQuizRegistration from './EventQuizRegistration';
import api from '../../config/axios';
import { toast } from 'react-toastify';

const EventQuizCard = ({ 
  quiz, 
  onDelete,
  showRegistration = false,
  showStart = false,
  showViewDetails = false
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [academicDetails, setAcademicDetails] = useState([]);
  const [collegeInfo, setCollegeInfo] = useState(null);

  useEffect(() => {
    const fetchAcademicDetails = async () => {
      try {
        const response = await api.get('/api/academic-details');
        if (response && Array.isArray(response)) {
          setAcademicDetails(response);
        }
      } catch (error) {
        console.error('Error fetching academic details:', error);
      }
    };

    const fetchCollegeInfo = async () => {
      try {
        const response = await api.get('/api/setup/college-info');
        if (response) {
          setCollegeInfo(response);
        }
      } catch (error) {
        console.error('Error fetching college info:', error);
      }
    };

    fetchAcademicDetails();
    fetchCollegeInfo();
  }, []);

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!quiz?._id || !user?._id) return;
      
      try {
        const response = await api.get(`/api/event-quiz/${quiz._id}/registration-status/${user._id}`);
        setIsRegistered(response.isRegistered);
      } catch (error) {
        console.error('Error checking registration status:', error);
      }
    };

    checkRegistrationStatus();
  }, [quiz, user]);

  const handleEdit = () => {
    if (!quiz?._id) return;
    navigate(`/event/quiz/edit/${quiz._id}`);
  };

  const handleResults = () => {
    if (!quiz?._id) return;
    navigate(`/event/quiz/${quiz._id}/submissions`);
  };

  const handleRegistrations = () => {
    if (!quiz?._id) return;
    navigate(`/event/quiz/${quiz._id}/registrations`);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!quiz?._id) return;

    try {
      setLoading(true);
      setError(''); // Clear any previous errors

      console.log('Deleting quiz:', quiz._id);
      const response = await api.delete(`/api/event-quiz/${quiz._id}`);

      console.log('Quiz deleted successfully');

      // Show success toast with deletion info
      const deletionInfo = response?.deletionInfo || response?.data?.deletionInfo;
      if (deletionInfo?.wasActive && deletionInfo?.participantCount > 0) {
        toast.success(
          `Quiz "${deletionInfo.quizTitle}" deleted successfully! ⚠️ ${deletionInfo.participantCount} active participant(s) were notified.`,
          {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      } else {
        toast.success(`Quiz "${quiz.title}" deleted successfully!`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }

      setDeleteDialogOpen(false);

      // Call onDelete callback to remove from UI immediately
      if (onDelete) {
        onDelete(quiz._id);
      }
    } catch (error) {
      console.error('Error deleting quiz:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete quiz';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    if (!quiz?._id) return;
    navigate(`/event/quizzes/take/${quiz._id}`);
  };

  const handleRegistrationSuccess = () => {
    setIsRegistered(true);
  };

  const handleViewDetails = async () => {
    if (!quiz?._id) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/event-quiz/${quiz._id}/registrations`);
      setRegistrations(response);
      setDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setError(error.response?.data?.message || 'Failed to fetch registrations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'upcoming':
        return 'info';
      case 'active':
        return 'success';
      case 'completed':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Calculate dynamic status based on current time
  const getDynamicStatus = () => {
    if (!quiz?.startTime || !quiz?.endTime) return quiz?.status || 'draft';

    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (now < startTime) {
      return 'upcoming';
    } else if (now >= startTime && now <= endTime) {
      return 'active';
    } else {
      return 'completed';
    }
  };

  // Use dynamic status if available from backend, otherwise calculate it
  const currentStatus = quiz?.dynamicStatus || getDynamicStatus();

  // Debug logging (remove this after testing)
  if (quiz?.title === 'ai') {
    console.log('EventQuizCard Debug for AI quiz:', {
      quizId: quiz?._id,
      quizTitle: quiz?.title,
      quizStatus: quiz?.status,
      dynamicStatus: quiz?.dynamicStatus,
      calculatedStatus: getDynamicStatus(),
      currentStatus,
      startTime: quiz?.startTime,
      endTime: quiz?.endTime,
      userRole: user?.role,
      shouldShowRegistrations: (currentStatus === 'upcoming' || currentStatus === 'draft' || !currentStatus),
      shouldShowResults: (currentStatus === 'active' || currentStatus === 'completed')
    });
  }

  const formatParticipantTypes = (quiz) => {
    // Get college name from college info, fallback to "College Students"
    const collegeName = collegeInfo?.name || 'College Students';

    // Check for new array format first (participantTypes)
    if (quiz?.participantTypes && Array.isArray(quiz.participantTypes) && quiz.participantTypes.length > 0) {
      return quiz.participantTypes.map(type =>
        type === 'college' ? collegeName : 'External Students'
      ).join(', ');
    }

    // Check for old string format (participantType) for backward compatibility
    if (quiz?.participantType) {
      if (quiz.participantType === 'any') {
        return `${collegeName}, External Students`;
      } else if (quiz.participantType === 'college') {
        return collegeName;
      }
    }

    return collegeName;
  };

  const formatEligibility = (quiz) => {
    if (!quiz) return 'Open to All';

    console.log('formatEligibility - quiz.departments:', quiz.departments);
    console.log('formatEligibility - quiz.years:', quiz.years);
    console.log('formatEligibility - quiz.semesters:', quiz.semesters);

    const parts = [];

    if (quiz.departments?.includes('all')) {
      console.log('Departments includes "all", showing All Departments');
      parts.push('All Departments');
    } else if (Array.isArray(quiz.departments) && quiz.departments.length > 0) {
      console.log('Specific departments found:', quiz.departments);
      const deptNames = quiz.departments.map(dept => {
        const deptDetail = academicDetails.find(d => d.department === dept);
        return deptDetail ? deptDetail.department : dept;
      });
      parts.push(`Departments: ${deptNames.join(', ')}`);
    }

    if (quiz.years?.includes('all')) {
      parts.push('All Years');
    } else if (Array.isArray(quiz.years) && quiz.years.length > 0) {
      const yearNames = quiz.years.map(year => {
        const yearDetail = academicDetails.find(d => d.year === parseInt(year));
        return yearDetail ? `Year ${year}` : `Year ${year}`;
      });
      parts.push(`Years: ${yearNames.join(', ')}`);
    }

    if (quiz.semesters?.includes('all')) {
      parts.push('All Semesters');
    } else if (Array.isArray(quiz.semesters) && quiz.semesters.length > 0) {
      const semesterNames = quiz.semesters.map(sem => {
        const semDetail = academicDetails.find(d => d.semester === parseInt(sem));
        return semDetail ? `Semester ${sem}` : `Semester ${sem}`;
      });
      parts.push(`Semesters: ${semesterNames.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Open to All';
  };

  const formatDateTime = (dateString, isMobileFormat = false) => {
    if (!dateString) return 'Not set';
    try {
      // Use shorter format for mobile to prevent overflow
      const formatString = isMobileFormat ? 'MMM dd HH:mm' : 'MMM dd, yyyy HH:mm';
      return format(new Date(dateString), formatString);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  return (
    <>
      <Card sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        overflow: 'hidden',
        borderRadius: isMobile ? 1 : 2,
        position: 'relative'
      }}>
        <CardContent sx={{
          flexGrow: 1,
          p: isMobile ? 1.5 : 2,
          overflow: 'hidden',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Title and Status */}
          <Box sx={{ mb: 1.5 }}>
            <Typography
              variant={isMobile ? "subtitle1" : "h6"}
              component="div"
              sx={{
                fontSize: { xs: '1rem', sm: '1.1rem' },
                fontWeight: 'bold',
                mb: 0.5,
                wordWrap: 'break-word',
                hyphens: 'auto'
              }}
            >
              {quiz?.title || 'Untitled Quiz'}
            </Typography>
            <Chip
              label={currentStatus ? (currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)) : 'Draft'}
              color={getStatusColor(currentStatus)}
              size="small"
              sx={{ fontSize: '0.75rem' }}
            />
          </Box>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              fontSize: '0.875rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordWrap: 'break-word',
              hyphens: 'auto'
            }}
          >
            {quiz?.description || 'No description provided'}
          </Typography>

          {/* Quiz Details - Simple List */}
          <Box sx={{ '& > *': { mb: 0.75 } }}>
            <Typography variant="body2" sx={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              <TimeIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
              Duration: {quiz?.duration || 0} minutes
            </Typography>

            <Typography variant="body2" sx={{ fontSize: '0.75rem', wordWrap: 'break-word', hyphens: 'auto' }}>
              <EventIcon fontSize="small" sx={{ mr: 1, color: 'action.active', verticalAlign: 'middle' }} />
              {isMobile
                ? `${formatDateTime(quiz?.startTime, true)} - ${formatDateTime(quiz?.endTime, true)}`
                : `${formatDateTime(quiz?.startTime)} - ${formatDateTime(quiz?.endTime)}`
              }
            </Typography>

            <Typography variant="body2" sx={{ fontSize: '0.75rem', wordWrap: 'break-word', hyphens: 'auto' }}>
              <GroupIcon fontSize="small" sx={{ mr: 1, color: 'action.active', verticalAlign: 'middle' }} />
              For: {formatParticipantTypes(quiz)}
            </Typography>

            <Typography variant="body2" sx={{ fontSize: '0.75rem', wordWrap: 'break-word', hyphens: 'auto' }}>
              <SchoolIcon fontSize="small" sx={{ mr: 1, color: 'action.active', verticalAlign: 'middle' }} />
              {formatEligibility(quiz)}
            </Typography>

            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
              <ClassIcon fontSize="small" sx={{ mr: 1, color: 'action.active', verticalAlign: 'middle' }} />
              Questions: {Array.isArray(quiz?.questions) ? quiz.questions.length : 0} •
              Total Marks: {quiz?.totalMarks || 0}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                fontSize: '0.75rem',
                color: quiz?.negativeMarkingEnabled ? 'warning.main' : 'success.main',
                fontWeight: 'medium'
              }}
            >
              {quiz?.negativeMarkingEnabled ? '⚠️' : '✅'}
              Negative Marking: {quiz?.negativeMarkingEnabled ? 'Enabled' : 'Disabled'}
            </Typography>
          </Box>

          {/* Additional Information */}
          <Box sx={{ mt: 1, '& > *': { mb: 0.5 } }}>
            {(quiz?.maxParticipants || 0) > 0 && (
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'action.active', verticalAlign: 'middle' }} />
                Max Participants: {quiz.maxParticipants}
              </Typography>
            )}

            <Typography variant="body2" sx={{ fontSize: '0.75rem', wordWrap: 'break-word', hyphens: 'auto' }}>
              <RegisterIcon fontSize="small" sx={{ mr: 1, color: 'action.active', verticalAlign: 'middle' }} />
              Registration: {quiz?.registrationEnabled ? 'Enabled' : 'Disabled'} •
              Spot: {quiz?.spotRegistrationEnabled ? 'Enabled' : 'Disabled'}
            </Typography>

            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
              {quiz?.participationMode === 'team' ? (
                <GroupIcon fontSize="small" sx={{ mr: 1, color: 'action.active', verticalAlign: 'middle' }} />
              ) : (
                <PeopleIcon fontSize="small" sx={{ mr: 1, color: 'action.active', verticalAlign: 'middle' }} />
              )}
              {quiz?.participationMode === 'team'
                ? `Team Mode (${quiz?.teamSize || 1} members)`
                : 'Individual Mode'
              }
            </Typography>

            <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
              <QuizIcon fontSize="small" sx={{ mr: 1, color: 'action.active', verticalAlign: 'middle' }} />
              Questions: {quiz?.questionDisplayMode === 'all-at-once'
                ? 'All on one page'
                : 'One at a time'
              }
            </Typography>
          </Box>
        </CardContent>

        <CardActions sx={{
          p: { xs: 1, sm: 2 },
          pt: 0,
          overflow: 'hidden'
        }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: { xs: 0.5, sm: 1 },
              width: '100%',
              '& .MuiButton-root': {
                fontSize: { xs: '0.7rem', sm: '0.875rem' },
                px: { xs: 0.75, sm: 1.5 },
                py: { xs: 0.4, sm: 0.75 },
                minWidth: { xs: 'auto', sm: 'auto' },
                whiteSpace: 'nowrap',
                flex: { xs: '1 1 auto', sm: '0 0 auto' },
                maxWidth: { xs: 'calc(50% - 2px)', sm: 'none' }
              }
            }}
          >
            {user?.role === 'event' && (
              <>
                <Button
                  startIcon={isMobile ? null : <EditIcon />}
                  onClick={handleEdit}
                  size="small"
                  variant="outlined"
                >
                  Edit
                </Button>
                <Button
                  startIcon={isMobile ? null : <DeleteIcon />}
                  onClick={handleDeleteClick}
                  size="small"
                  disabled={loading}
                  color="error"
                  variant="outlined"
                >
                  Delete
                </Button>
              </>
            )}

              {showViewDetails && user?.role === 'event' && (
              <Button
                startIcon={isMobile ? null : <PeopleIcon />}
                onClick={handleViewDetails}
                color="primary"
                size="small"
                variant="outlined"
              >
                {isMobile ? 'Registrations' : 'View Registrations'}
              </Button>
              )}

              {showRegistration && !isRegistered && (
                <Button
                  startIcon={isMobile ? null : <RegisterIcon />}
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => setRegistrationOpen(true)}
                >
                  Register
                </Button>
              )}

              {showStart && isRegistered && currentStatus === 'active' && (
                <Button
                  startIcon={isMobile ? null : <StartIcon />}
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={handleStartQuiz}
                >
                  Start Quiz
                </Button>
              )}

              {user?.role === 'event' && (
                <Button
                  startIcon={isMobile ? null : <AssessmentIcon />}
                  onClick={handleResults}
                  color="primary"
                  size="small"
                  variant="outlined"
                >
                  {isMobile ? 'Results' : 'View Results'}
                </Button>
              )}
          </Box>
        </CardActions>
      </Card>

      <EventQuizRegistration
        open={registrationOpen}
        onClose={() => setRegistrationOpen(false)}
        quizId={quiz?._id}
        onSuccess={handleRegistrationSuccess}
      />

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Registered Students</Typography>
            {loading && <CircularProgress size={24} />}
          </Box>
        </DialogTitle>
        <DialogContent>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>College</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Roll Number</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No registrations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrations.map((registration) => (
                      <TableRow key={registration._id}>
                        <TableCell>{registration.name}</TableCell>
                        <TableCell>{registration.email}</TableCell>
                        <TableCell>{registration.college}</TableCell>
                        <TableCell>{registration.department}</TableCell>
                        <TableCell>{registration.year}</TableCell>
                        <TableCell>{registration.rollNumber}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="delete-dialog-title">
          Delete Quiz: {quiz?.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this quiz? This action cannot be undone.
          </DialogContentText>

          {/* Show warning for active quizzes */}
          {(() => {
            const now = new Date();
            const startTime = new Date(quiz?.startTime);
            const endTime = new Date(quiz?.endTime);
            const isActive = now >= startTime && now <= endTime;
            const registrationCount = quiz?.registrations?.length || 0;

            if (isActive && registrationCount > 0) {
              return (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    ⚠️ Warning: This quiz is currently active!
                  </Typography>
                  <Typography variant="body2">
                    • {registrationCount} participant(s) are registered for this quiz
                  </Typography>
                  <Typography variant="body2">
                    • Some participants may currently be taking the quiz
                  </Typography>
                  <Typography variant="body2">
                    • They will be notified that the quiz has been deleted
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                    Are you sure you want to proceed?
                  </Typography>
                </Alert>
              );
            } else if (registrationCount > 0) {
              return (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    This quiz has {registrationCount} registered participant(s).
                  </Typography>
                </Alert>
              );
            }
            return null;
          })()}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete Quiz'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EventQuizCard; 