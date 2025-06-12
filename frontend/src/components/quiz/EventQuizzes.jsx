import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Box,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  Tab,
  Tabs,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Event as EventIcon,
  Home as HomeIcon,
  Login as LoginIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const EventQuizzes = () => {
  const [activeQuizzes, setActiveQuizzes] = useState([]);
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [academicDetails, setAcademicDetails] = useState([]);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    // Participant type selection
    participantType: '', // 'college' or 'external'

    // Individual registration
    name: '',
    email: '',
    college: '',
    department: '',
    year: '',
    phoneNumber: '',
    admissionNumber: '',

    // Team registration
    isTeamRegistration: false,
    teamName: '',
    teamLeader: {
      participantType: '', // Initialize with empty string
      name: '',
      email: '',
      college: '',
      department: '',
      year: '',
      phoneNumber: '',
      admissionNumber: ''
    },
    teamMembers: []
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchEventQuizzes();
    fetchAcademicDetails();
  }, []);

  const fetchAcademicDetails = async () => {
    try {
      const response = await api.get('/api/academic-details');
      setAcademicDetails(response || []);
    } catch (error) {
      console.error('Error fetching academic details:', error);
      // Set default academic details if API fails
      setAcademicDetails([
        {
          department: 'Computer Science and Engineering',
          years: ['1', '2', '3', '4']
        },
        {
          department: 'Electronics and Communication Engineering',
          years: ['1', '2', '3', '4']
        },
        {
          department: 'Mechanical Engineering',
          years: ['1', '2', '3', '4']
        },
        {
          department: 'Civil Engineering',
          years: ['1', '2', '3', '4']
        },
        {
          department: 'Electrical Engineering',
          years: ['1', '2', '3', '4']
        },
        {
          department: 'Information Technology',
          years: ['1', '2', '3', '4']
        }
      ]);
    }
  };



  const fetchEventQuizzes = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors

      // Fetch event quizzes using the same pattern as existing components
      console.log('Fetching event quizzes...');

      const response = await api.get('/api/event-quiz');
      console.log('Response:', response);

      // Use the same pattern as EventQuizList.jsx
      const quizzes = response || [];
      console.log(`Received ${quizzes.length} quizzes from API`);

      // Separate active and upcoming quizzes
      const now = new Date();
      console.log('Current time:', now.toISOString());

      const active = [];
      const upcoming = [];

      quizzes.forEach(quiz => {
        const startTime = new Date(quiz.startTime);
        const endTime = new Date(quiz.endTime);
        const isActive = startTime <= now && endTime >= now;
        const isUpcoming = startTime > now;

        console.log(`Quiz "${quiz.title}":`, {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          currentTime: now.toISOString(),
          isActive,
          isUpcoming,
          status: quiz.status,
          registrationEnabled: quiz.registrationEnabled,
          spotRegistrationEnabled: quiz.spotRegistrationEnabled
        });

        if (isActive) {
          active.push(quiz);
        } else if (isUpcoming) {
          upcoming.push(quiz);
        }
      });

      console.log(`Categorized: ${active.length} active, ${upcoming.length} upcoming`);
      setActiveQuizzes(active);
      setUpcomingQuizzes(upcoming);
    } catch (error) {
      console.error('Error fetching event quizzes:', error);
      setError('Failed to fetch event quizzes. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = (quiz) => {
    setSelectedQuiz(quiz);
    // Reset registration data based on quiz type
    const isTeamQuiz = quiz.participationMode === 'team';

    // Pre-fill department and year if quiz has specific requirements
    const prefilledDepartment = quiz.departments && !quiz.departments.includes('all') ? quiz.departments[0] : '';
    const prefilledYear = quiz.years && !quiz.years.includes('all') ? quiz.years[0] : '';

    // Initialize team members array for team quizzes
    const initialTeamMembers = isTeamQuiz ?
      Array(quiz.teamSize - 1).fill().map(() => ({
        participantType: '', // Initialize with empty string to avoid uncontrolled component warning
        name: '', email: '', college: '',
        department: prefilledDepartment,
        year: prefilledYear,
        phoneNumber: '', admissionNumber: ''
      })) : [];

    // Set default participant type based on quiz settings
    let defaultParticipantType = '';
    if (quiz.participantTypes?.includes('college') && !quiz.participantTypes?.includes('external')) {
      defaultParticipantType = 'college';
    } else if (quiz.participantTypes?.includes('external') && !quiz.participantTypes?.includes('college')) {
      defaultParticipantType = 'external';
    } else if (quiz.participantTypes?.includes('college')) {
      // If both are available, default to college
      defaultParticipantType = 'college';
    }

    setRegistrationData({
      participantType: defaultParticipantType, // Set default participant type
      name: '',
      email: '',
      college: '',
      department: prefilledDepartment,
      year: prefilledYear,
      phoneNumber: '',
      admissionNumber: '',
      isTeamRegistration: isTeamQuiz, // Automatically set to true for team quizzes
      teamName: '',
      teamLeader: {
        participantType: defaultParticipantType, // Set default for team leader too
        name: '',
        email: '',
        college: '',
        department: prefilledDepartment,
        year: prefilledYear,
        phoneNumber: '',
        admissionNumber: ''
      },
      teamMembers: initialTeamMembers.map(member => ({
        ...member,
        participantType: defaultParticipantType // Set default for team members too
      }))
    });
    setRegistrationOpen(true);
    setRegistrationSuccess(false); // Reset success state
  };

  const handleRegistrationSubmit = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors

      // Additional validation before submission
      const quizStatus = getQuizStatus(selectedQuiz);
      if (quizStatus === 'active' && !selectedQuiz.spotRegistrationEnabled) {
        setError('This quiz has already started and does not allow spot registration. Registration is only available for upcoming quizzes or active quizzes with spot registration enabled.');
        setLoading(false);
        return;
      }

      if (quizStatus === 'completed') {
        setError('This quiz has already completed. Registration is no longer available.');
        setLoading(false);
        return;
      }

      // Prepare the data structure based on quiz type
      let submitData;

      if (selectedQuiz?.participationMode === 'team') {
        // Team registration data structure
        // Set team leader participantType from main participantType if not set
        const teamLeaderWithType = {
          ...registrationData.teamLeader,
          participantType: registrationData.teamLeader.participantType || registrationData.participantType
        };

        submitData = {
          isTeamRegistration: true,
          participantType: registrationData.participantType,
          teamName: registrationData.teamName,
          teamLeader: teamLeaderWithType,
          teamMembers: registrationData.teamMembers
        };
      } else {
        // Individual registration data structure
        submitData = {
          isTeamRegistration: false,
          participantType: registrationData.participantType,
          name: registrationData.name,
          email: registrationData.email,
          college: registrationData.college,
          department: registrationData.department,
          year: registrationData.year,
          phoneNumber: registrationData.phoneNumber,
          admissionNumber: registrationData.admissionNumber
        };
      }

      console.log('Submitting registration data:', submitData);
      console.log('Selected quiz:', selectedQuiz);

      const response = await api.post(`/api/event-quiz/${selectedQuiz._id}/register-public`, submitData);
      console.log('Registration response:', response);

      // Show immediate success feedback in dialog
      setRegistrationSuccess(true);

      // Show success message
      const successMessage = selectedQuiz?.participationMode === 'team'
        ? `Team registration successful! Your team "${registrationData.teamName}" has been registered for "${selectedQuiz.title}". All team members will receive individual emails with login credentials.`
        : `Registration successful! You have been registered for "${selectedQuiz.title}". You will receive an email with your login credentials.`;

      setSuccess(successMessage);

      // Close dialog after showing success feedback
      setTimeout(() => {
        setRegistrationOpen(false);
        setRegistrationSuccess(false);
      }, 2000);

      // Scroll to top to ensure success message is visible
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Reset form data for next registration
      setRegistrationData({
        participantType: '',
        name: '',
        email: '',
        college: '',
        department: '',
        year: '',
        phoneNumber: '',
        admissionNumber: '',
        isTeamRegistration: false,
        teamName: '',
        teamLeader: {
          participantType: '', // Initialize with empty string
          name: '',
          email: '',
          college: '',
          department: '',
          year: '',
          phoneNumber: '',
          admissionNumber: ''
        },
        teamMembers: []
      });

      // Update only the registration count for the specific quiz without full refresh
      // This keeps the registration buttons available for other users
      setActiveQuizzes(prev => prev.map(quiz =>
        quiz._id === selectedQuiz._id
          ? { ...quiz, registrations: [...(quiz.registrations || []), { _id: Date.now() }] }
          : quiz
      ));
      setUpcomingQuizzes(prev => prev.map(quiz =>
        quiz._id === selectedQuiz._id
          ? { ...quiz, registrations: [...(quiz.registrations || []), { _id: Date.now() }] }
          : quiz
      ));

    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response);

      let errorMessage = error.response?.data?.message ||
                        error.response?.data?.error ||
                        error.message ||
                        'Registration failed. Please try again.';

      // Provide more specific error messages for common scenarios
      if (errorMessage.includes('spot registration is not enabled')) {
        errorMessage = 'This quiz has already started and does not allow spot registration. You can only register for upcoming quizzes or active quizzes that specifically allow spot registration.';
      } else if (errorMessage.includes('Quiz has started')) {
        errorMessage = 'This quiz has already started. Registration is only available before the quiz begins or during the quiz if spot registration is enabled.';
      } else if (errorMessage.includes('Registration is full')) {
        errorMessage = 'Registration for this quiz is full. No more participants can be added.';
      } else if (errorMessage.includes('is already registered for this quiz')) {
        const email = errorMessage.match(/Email (.+?) is already registered/)?.[1];
        errorMessage = `The email address ${email ? `"${email}"` : 'you provided'} is already registered for this quiz. Each email can only be used once per quiz. Please use a different email address or contact the event organizer if you need to update your registration.`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQuizStatus = (quiz) => {
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    if (startTime > now) return 'upcoming';
    if (startTime <= now && endTime >= now) return 'active';
    return 'completed';
  };

  // Helper functions for team management
  const addTeamMember = () => {
    const newMember = {
      participantType: '', // Add participant type for each member
      name: '',
      email: '',
      college: '',
      department: '',
      year: '',
      phoneNumber: '',
      admissionNumber: ''
    };
    setRegistrationData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, newMember]
    }));
  };

  const removeTeamMember = (index) => {
    setRegistrationData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index)
    }));
  };

  const updateTeamMember = (index, field, value) => {
    setRegistrationData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.map((member, i) =>
        i === index ? { ...member, [field]: value } : member
      )
    }));
  };

  const updateTeamLeader = (field, value) => {
    setRegistrationData(prev => ({
      ...prev,
      teamLeader: { ...prev.teamLeader, [field]: value }
    }));
  };

  const isCollegeQuiz = (quiz) => {
    return quiz?.participantTypes?.includes('college') && !quiz?.participantTypes?.includes('external');
  };

  const formatParticipantTypes = (quiz) => {
    // Check for new array format first (participantTypes)
    if (quiz?.participantTypes && Array.isArray(quiz.participantTypes) && quiz.participantTypes.length > 0) {
      return quiz.participantTypes.map(type =>
        type === 'college' ? 'College Students' : 'External Students'
      ).join(', ');
    }

    // Check for old string format (participantType) for backward compatibility
    if (quiz?.participantType) {
      if (quiz.participantType === 'any') {
        return 'College Students, External Students';
      } else if (quiz.participantType === 'college') {
        return 'College Students';
      }
    }

    return 'College Students';
  };

  const formatEligibility = (quiz) => {
    if (!quiz) return 'Open to All';

    const parts = [];

    if (quiz.departments?.includes('all')) {
      parts.push('All Departments');
    } else if (Array.isArray(quiz.departments) && quiz.departments.length > 0) {
      parts.push(`Departments: ${quiz.departments.join(', ')}`);
    }

    if (quiz.years?.includes('all')) {
      parts.push('All Years');
    } else if (Array.isArray(quiz.years) && quiz.years.length > 0) {
      const yearNames = quiz.years.map(year => `Year ${year}`);
      parts.push(`Years: ${yearNames.join(', ')}`);
    }

    if (quiz.semesters?.includes('all')) {
      parts.push('All Semesters');
    } else if (Array.isArray(quiz.semesters) && quiz.semesters.length > 0) {
      const semesterNames = quiz.semesters.map(sem => `Semester ${sem}`);
      parts.push(`Semesters: ${semesterNames.join(', ')}`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Open to All';
  };

  const validateTeamRegistration = () => {
    if (!selectedQuiz) {
      console.log('Validation failed: No selected quiz');
      return false;
    }

    // Check participant type selection if quiz accepts both types
    if (selectedQuiz?.participantTypes?.includes('college') && selectedQuiz?.participantTypes?.includes('external')) {
      if (!registrationData.participantType) {
        console.log('Validation failed: Participant type not selected');
        return false;
      }
    }

    // Validate college student eligibility
    if (registrationData.participantType === 'college' ||
        (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) {

      // Check department eligibility
      if (selectedQuiz.departments && !selectedQuiz.departments.includes('all')) {
        const userDept = selectedQuiz?.participationMode === 'team' ?
          registrationData.teamLeader.department : registrationData.department;
        if (!selectedQuiz.departments.includes(userDept)) {
          console.log('Validation failed: Department not eligible');
          return false;
        }
      }

      // Check year eligibility
      if (selectedQuiz.years && !selectedQuiz.years.includes('all')) {
        const userYear = selectedQuiz?.participationMode === 'team' ?
          registrationData.teamLeader.year : registrationData.year;
        if (!selectedQuiz.years.includes(userYear)) {
          console.log('Validation failed: Year not eligible');
          return false;
        }
      }

      // Check semester eligibility
      if (selectedQuiz.semesters && !selectedQuiz.semesters.includes('all')) {
        const userSemester = selectedQuiz?.participationMode === 'team' ?
          registrationData.teamLeader.semester : registrationData.semester;
        if (userSemester && !selectedQuiz.semesters.includes(userSemester)) {
          console.log('Validation failed: Semester not eligible');
          return false;
        }
      }
    }

    // Check if this is a team quiz
    const isTeamQuiz = selectedQuiz.participationMode === 'team';

    if (!isTeamQuiz) {
      // Individual registration validation
      let isValid = !!(registrationData.name && registrationData.email);

      // Additional validation for college students
      if (registrationData.participantType === 'college' ||
          (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) {
        isValid = isValid &&
                  !!(registrationData.department &&
                     registrationData.year &&
                     registrationData.phoneNumber &&
                     registrationData.admissionNumber);
      } else {
        // External students need college field
        isValid = isValid && !!registrationData.college;
      }

      console.log('Individual validation:', {
        name: registrationData.name,
        email: registrationData.email,
        college: registrationData.college,
        department: registrationData.department,
        year: registrationData.year,
        phoneNumber: registrationData.phoneNumber,
        admissionNumber: registrationData.admissionNumber,
        participantType: registrationData.participantType,
        isValid
      });
      return isValid;
    }

    // Team registration validation
    console.log('Team validation - checking team name:', registrationData.teamName);
    if (!registrationData.teamName.trim()) {
      console.log('Validation failed: Team name is empty');
      return false;
    }

    // Validate team leader
    const leader = registrationData.teamLeader;
    console.log('Team validation - checking leader:', leader);
    if (!leader.name || !leader.email) {
      console.log('Validation failed: Team leader missing required fields');
      return false;
    }

    // Additional validation for college student team leader
    if (registrationData.participantType === 'college' ||
        (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) {
      if (!leader.department || !leader.year || !leader.phoneNumber || !leader.admissionNumber) {
        console.log('Validation failed: Team leader missing college student fields');
        return false;
      }
    } else {
      // External students need college field
      if (!leader.college) {
        console.log('Validation failed: Team leader missing college field');
        return false;
      }
    }

    // Validate team members
    const requiredMembers = selectedQuiz?.teamSize - 1 || 0; // -1 because leader is separate
    console.log('Team validation - checking members:', {
      requiredMembers,
      actualMembers: registrationData.teamMembers.length,
      teamMembers: registrationData.teamMembers
    });

    if (registrationData.teamMembers.length < requiredMembers) {
      console.log('Validation failed: Not enough team members');
      return false;
    }

    // Check if all team members have required fields
    const allMembersValid = registrationData.teamMembers.every(member => {
      let isValid = member.name && member.email;

      // Check participant type selection if quiz accepts both types
      if (selectedQuiz?.participantTypes?.includes('college') && selectedQuiz?.participantTypes?.includes('external')) {
        if (!member.participantType) {
          console.log('Validation failed: Team member participant type not selected');
          return false;
        }
      }

      // Additional validation for college student team members
      if (member.participantType === 'college' ||
          (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) {
        isValid = isValid && member.department && member.year && member.phoneNumber && member.admissionNumber;
      } else {
        // External students need college field
        isValid = isValid && member.college;
      }

      return isValid;
    });

    console.log('Team validation - all members valid:', allMembersValid);
    return allMembersValid;
  };

  const QuizCard = ({ quiz, isActive = false }) => {
    const status = getQuizStatus(quiz);
    const registrationCount = quiz.registrations?.length || 0;
    const maxParticipants = quiz.maxParticipants || 0;
    const isRegistrationFull = maxParticipants > 0 && registrationCount >= maxParticipants;

    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" component="h3" gutterBottom>
              {quiz.title}
            </Typography>
            <Chip
              label={status.toUpperCase()}
              color={status === 'active' ? 'success' : status === 'upcoming' ? 'warning' : 'default'}
              size="small"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            {quiz.description}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CalendarIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatDateTime(quiz.startTime)} - {formatDateTime(quiz.endTime)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <TimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Duration: {quiz.duration} minutes
            </Typography>
          </Box>

          {/* Participant Types Display */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <GroupIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              For: {formatParticipantTypes(quiz)}
            </Typography>
          </Box>

          {/* Eligibility Display */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <SchoolIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatEligibility(quiz)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <PeopleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Registered: {registrationCount}
              {maxParticipants > 0 && ` / ${maxParticipants}`}
            </Typography>
          </Box>

          {/* Team/Individual Mode Display */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {quiz?.participationMode === 'team' ? (
              <GroupIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            ) : (
              <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            )}
            <Typography variant="body2" color="text.secondary">
              {quiz?.participationMode === 'team'
                ? `Team Mode (${quiz?.teamSize || 1} members per team)`
                : 'Individual Mode'
              }
            </Typography>
          </Box>

          {/* Registration Settings Display */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <EventIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Registration: {quiz?.registrationEnabled ? 'Enabled' : 'Disabled'} •
              Spot Registration: {quiz?.spotRegistrationEnabled ? 'Enabled' : 'Disabled'}
            </Typography>
          </Box>

          {quiz.eventDetails && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EventIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {quiz.eventDetails.name}
                </Typography>
              </Box>

              {quiz.eventDetails.venue && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {quiz.eventDetails.venue}
                  </Typography>
                </Box>
              )}
            </>
          )}

          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label={`${quiz.questions?.length || 0} Questions`} size="small" variant="outlined" />
            {quiz.passingMarks > 0 && (
              <Chip label={`Pass: ${quiz.passingMarks}%`} size="small" variant="outlined" />
            )}
            {quiz.participantTypes?.includes('external') && (
              <Chip label="Open to All" size="small" variant="outlined" color="primary" />
            )}
            {status === 'active' && quiz.spotRegistrationEnabled && (
              <Chip label="Spot Registration Available" size="small" variant="outlined" color="warning" />
            )}
          </Box>
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0 }}>
          {/* Upcoming Quiz Registration */}
          {status === 'upcoming' && quiz.registrationEnabled && !isRegistrationFull && (
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => handleRegister(quiz)}
              startIcon={<PersonIcon />}
            >
              Register Now
            </Button>
          )}

          {/* Active Quiz - Show Login and Spot Registration (if enabled) */}
          {status === 'active' && (
            <>
              {/* Only show registration if spot registration is explicitly enabled */}
              {quiz.spotRegistrationEnabled && !isRegistrationFull && (
                <Button
                  variant="contained"
                  color="warning"
                  fullWidth
                  onClick={() => handleRegister(quiz)}
                  startIcon={<PersonIcon />}
                  sx={{ mb: 1 }}
                >
                  Spot Registration
                </Button>
              )}

              {/* Show message when spot registration is not available */}
              {!quiz.spotRegistrationEnabled && (
                <Button variant="outlined" fullWidth disabled sx={{ mb: 1 }}>
                  Registration Closed (Quiz Started)
                </Button>
              )}

              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={() => navigate(`/quiz/${quiz._id}/login`)}
                startIcon={<LoginIcon />}
              >
                Login to Take Quiz
              </Button>
            </>
          )}

          {/* Registration Full */}
          {(status === 'upcoming' || status === 'active') && isRegistrationFull && (
            <Button variant="outlined" fullWidth disabled>
              Registration Full
            </Button>
          )}

          {/* Completed Quiz */}
          {status === 'completed' && (
            <Button variant="outlined" fullWidth disabled>
              Quiz Completed
            </Button>
          )}
        </CardActions>
      </Card>
    );
  };

  if (loading && activeQuizzes.length === 0 && upcomingQuizzes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <EventIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Event Quizzes
          </Typography>
          <Button
            color="inherit"
            startIcon={<RefreshIcon />}
            onClick={fetchEventQuizzes}
            disabled={loading}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button color="inherit" startIcon={<HomeIcon />} onClick={() => navigate('/')}>
            Home
          </Button>
          <Button color="inherit" startIcon={<LoginIcon />} onClick={() => navigate('/login')}>
            Login
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Welcome Section */}
        <Paper sx={{ p: 4, mb: 4, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h3" component="h1" gutterBottom>
            Welcome to Event Quizzes
          </Typography>
          <Typography variant="h6" component="p">
            Participate in exciting quizzes organized by various departments and organizations
          </Typography>
        </Paper>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            variant="fullWidth"
            indicatorColor="primary"
          >
            <Tab
              label={`Active Quizzes (${activeQuizzes.length})`}
              icon={<EventIcon />}
              iconPosition="start"
            />
            <Tab
              label={`Upcoming Quizzes (${upcomingQuizzes.length})`}
              icon={<CalendarIcon />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Quiz Content */}
        {tabValue === 0 && (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              🔴 Live Quizzes - Join Now!
            </Typography>
            {activeQuizzes.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No active quizzes at the moment
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Check back later or browse upcoming quizzes
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {activeQuizzes.map((quiz) => (
                  <Grid item xs={12} sm={6} md={4} key={quiz._id}>
                    <QuizCard quiz={quiz} isActive={true} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
              📅 Upcoming Quizzes - Register Now!
            </Typography>
            {upcomingQuizzes.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No upcoming quizzes scheduled
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  New quizzes will be announced soon
                </Typography>
                {/* Debug info */}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Debug: Total quizzes fetched: {activeQuizzes.length + upcomingQuizzes.length}
                </Typography>
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {upcomingQuizzes.map((quiz) => (
                  <Grid item xs={12} sm={6} md={4} key={quiz._id}>
                    <QuizCard quiz={quiz} />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}

        {/* Debug Section - Show all quizzes if needed */}
        {(activeQuizzes.length === 0 && upcomingQuizzes.length === 0) && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" color="error" gutterBottom>
              Debug: No quizzes found in either category
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Check browser console for detailed logs. This might indicate a data fetching or categorization issue.
            </Typography>
          </Box>
        )}

        {/* Enhanced Registration Dialog */}
        <Dialog
          open={registrationOpen}
          onClose={() => setRegistrationOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Register for Quiz: {selectedQuiz?.title}
            {selectedQuiz?.participationMode === 'team' && (
              <Typography variant="subtitle2" color="text.secondary">
                Team Size: {selectedQuiz?.teamSize} members
              </Typography>
            )}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {/* Success Message inside Dialog */}
              {registrationSuccess && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <Typography variant="body1">
                    🎉 Registration Successful!
                  </Typography>
                  <Typography variant="body2">
                    {selectedQuiz?.participationMode === 'team'
                      ? `Your team "${registrationData.teamName}" has been registered for "${selectedQuiz.title}".`
                      : `You have been registered for "${selectedQuiz.title}".`
                    }
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    You will receive confirmation details via email shortly.
                  </Typography>
                </Alert>
              )}

              {/* Show form only if registration is not successful */}
              {!registrationSuccess && (
                <>
                  {/* Participant Type Selection - Only show if quiz accepts both types */}
                  {selectedQuiz?.participantTypes?.includes('college') && selectedQuiz?.participantTypes?.includes('external') && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Participant Type
                  </Typography>
                  <FormControl component="fieldset" required>
                    <RadioGroup
                      row
                      value={registrationData.participantType || ''}
                      onChange={(e) => setRegistrationData(prev => ({ ...prev, participantType: e.target.value }))}
                    >
                      <FormControlLabel
                        value="college"
                        control={<Radio />}
                        label="College Student"
                      />
                      <FormControlLabel
                        value="external"
                        control={<Radio />}
                        label="External Student"
                      />
                    </RadioGroup>
                  </FormControl>

                  {/* Show eligibility criteria for college students */}
                  {registrationData.participantType === 'college' && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      <Typography variant="body2">
                        <strong>Eligibility for College Students:</strong><br />
                        {formatEligibility(selectedQuiz)}
                      </Typography>
                    </Alert>
                  )}
                </Box>
              )}

              {/* Team Name (only for team quizzes) */}
              {selectedQuiz?.participationMode === 'team' && (
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label="Team Name"
                    value={registrationData.teamName}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, teamName: e.target.value }))}
                    required
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="h6" gutterBottom>
                    Team Leader Details
                  </Typography>
                </Box>
              )}

              {/* Individual/Team Leader Registration Form */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={selectedQuiz?.participationMode === 'team' ? "Leader Name" : "Full Name"}
                    value={selectedQuiz?.participationMode === 'team' ? registrationData.teamLeader.name : registrationData.name}
                    onChange={(e) => {
                      if (selectedQuiz?.participationMode === 'team') {
                        updateTeamLeader('name', e.target.value);
                      } else {
                        setRegistrationData(prev => ({ ...prev, name: e.target.value }));
                      }
                    }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={selectedQuiz?.participationMode === 'team' ? registrationData.teamLeader.email : registrationData.email}
                    onChange={(e) => {
                      if (selectedQuiz?.participationMode === 'team') {
                        updateTeamLeader('email', e.target.value);
                      } else {
                        setRegistrationData(prev => ({ ...prev, email: e.target.value }));
                      }
                    }}
                    required
                  />
                </Grid>
                {/* Phone Number - Show for college students */}
                {(registrationData.participantType === 'college' ||
                  (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={selectedQuiz?.participationMode === 'team' ? registrationData.teamLeader.phoneNumber : registrationData.phoneNumber}
                      onChange={(e) => {
                        if (selectedQuiz?.participationMode === 'team') {
                          updateTeamLeader('phoneNumber', e.target.value);
                        } else {
                          setRegistrationData(prev => ({ ...prev, phoneNumber: e.target.value }));
                        }
                      }}
                      required
                    />
                  </Grid>
                )}

                {/* Admission Number - Show for college students */}
                {(registrationData.participantType === 'college' ||
                  (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) && (
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Admission Number"
                      value={selectedQuiz?.participationMode === 'team' ? registrationData.teamLeader.admissionNumber : registrationData.admissionNumber}
                      onChange={(e) => {
                        if (selectedQuiz?.participationMode === 'team') {
                          updateTeamLeader('admissionNumber', e.target.value);
                        } else {
                          setRegistrationData(prev => ({ ...prev, admissionNumber: e.target.value }));
                        }
                      }}
                      required
                    />
                  </Grid>
                )}

                {/* College/Institution - Only show for external students */}
                {(registrationData.participantType === 'external' ||
                  (!selectedQuiz?.participantTypes?.includes('college') && selectedQuiz?.participantTypes?.includes('external'))) && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="College/Institution"
                      value={selectedQuiz?.participationMode === 'team' ? registrationData.teamLeader.college : registrationData.college}
                      onChange={(e) => {
                        if (selectedQuiz?.participationMode === 'team') {
                          updateTeamLeader('college', e.target.value);
                        } else {
                          setRegistrationData(prev => ({ ...prev, college: e.target.value }));
                        }
                      }}
                      required
                    />
                  </Grid>
                )}

                {/* Department - Show for college students */}
                {(registrationData.participantType === 'college' ||
                  (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={selectedQuiz?.participationMode === 'team' ? registrationData.teamLeader.department : registrationData.department}
                        label="Department"
                        onChange={(e) => {
                          if (selectedQuiz?.participationMode === 'team') {
                            updateTeamLeader('department', e.target.value);
                          } else {
                            setRegistrationData(prev => ({ ...prev, department: e.target.value }));
                          }
                        }}
                        disabled={selectedQuiz?.departments && !selectedQuiz.departments.includes('all')}
                      >
                        {selectedQuiz?.departments && !selectedQuiz.departments.includes('all') ? (
                          // Quiz has specific department requirements - show only those
                          selectedQuiz.departments.map((dept) => (
                            <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                          ))
                        ) : (
                          // Quiz allows all departments - show unique departments from academic details
                          [...new Set(academicDetails.map(detail => detail.department))].filter(Boolean).map((dept) => (
                            <MenuItem key={dept} value={dept}>
                              {dept}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {/* Year - Show for college students */}
                {(registrationData.participantType === 'college' ||
                  (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Year</InputLabel>
                      <Select
                        value={selectedQuiz?.participationMode === 'team' ? registrationData.teamLeader.year : registrationData.year}
                        label="Year"
                        onChange={(e) => {
                          if (selectedQuiz?.participationMode === 'team') {
                            updateTeamLeader('year', e.target.value);
                          } else {
                            setRegistrationData(prev => ({ ...prev, year: e.target.value }));
                          }
                        }}
                        disabled={selectedQuiz?.years && !selectedQuiz.years.includes('all')}
                      >
                        {selectedQuiz?.years && !selectedQuiz.years.includes('all') ? (
                          // Quiz has specific year requirements - show only those
                          selectedQuiz.years.map((year) => (
                            <MenuItem key={year} value={year}>
                              {year === 'other' ? 'Other' : `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`}
                            </MenuItem>
                          ))
                        ) : (
                          // Quiz allows all years - show standard years
                          ['1', '2', '3', '4'].map((year) => (
                            <MenuItem key={year} value={year}>
                              {`${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                )}






              </Grid>

              {/* Team Members Section (only for team registration) */}
              {selectedQuiz?.participationMode === 'team' && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Team Members ({registrationData.teamMembers.length}/{selectedQuiz?.teamSize - 1} required)
                  </Typography>

                  {registrationData.teamMembers.map((member, index) => (
                    <Paper
                      key={index}
                      sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: 'background.paper',
                        border: 1,
                        borderColor: 'divider'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle1">
                          Member {index + 1}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => removeTeamMember(index)}
                          disabled={registrationData.teamMembers.length <= selectedQuiz?.teamSize - 1}
                        >
                          Remove
                        </Button>
                      </Box>

                      <Grid container spacing={2}>
                        {/* Participant Type Selection for each team member - Only show if quiz accepts both types */}
                        {selectedQuiz?.participantTypes?.includes('college') && selectedQuiz?.participantTypes?.includes('external') && (
                          <Grid item xs={12}>
                            <Typography variant="subtitle2" gutterBottom>
                              Participant Type
                            </Typography>
                            <FormControl component="fieldset" required size="small">
                              <RadioGroup
                                row
                                value={member.participantType || ''}
                                onChange={(e) => updateTeamMember(index, 'participantType', e.target.value)}
                              >
                                <FormControlLabel
                                  value="college"
                                  control={<Radio size="small" />}
                                  label="College Student"
                                />
                                <FormControlLabel
                                  value="external"
                                  control={<Radio size="small" />}
                                  label="External Student"
                                />
                              </RadioGroup>
                            </FormControl>
                          </Grid>
                        )}

                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Name"
                            value={member.name}
                            onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
                            required
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={member.email}
                            onChange={(e) => updateTeamMember(index, 'email', e.target.value)}
                            required
                            size="small"
                          />
                        </Grid>
                        {/* Phone Number - Show for college students */}
                        {(member.participantType === 'college' ||
                          (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) && (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Phone Number"
                              value={member.phoneNumber}
                              onChange={(e) => updateTeamMember(index, 'phoneNumber', e.target.value)}
                              size="small"
                              required
                            />
                          </Grid>
                        )}

                        {/* Admission Number - Show for college students */}
                        {(member.participantType === 'college' ||
                          (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) && (
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Admission Number"
                              value={member.admissionNumber}
                              onChange={(e) => updateTeamMember(index, 'admissionNumber', e.target.value)}
                              size="small"
                              required
                            />
                          </Grid>
                        )}

                        {/* College/Institution - Only show for external students */}
                        {(member.participantType === 'external' ||
                          (!selectedQuiz?.participantTypes?.includes('college') && selectedQuiz?.participantTypes?.includes('external'))) && (
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="College/Institution"
                              value={member.college}
                              onChange={(e) => updateTeamMember(index, 'college', e.target.value)}
                              required
                              size="small"
                            />
                          </Grid>
                        )}

                        {/* Department - Show for college students */}
                        {(member.participantType === 'college' ||
                          (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) && (
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small" required>
                              <InputLabel>Department</InputLabel>
                              <Select
                                value={member.department}
                                label="Department"
                                onChange={(e) => updateTeamMember(index, 'department', e.target.value)}
                                disabled={selectedQuiz?.departments && !selectedQuiz.departments.includes('all')}
                              >
                                {selectedQuiz?.departments && !selectedQuiz.departments.includes('all') ? (
                                  // Quiz has specific department requirements - show only those
                                  selectedQuiz.departments.map((dept) => (
                                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                                  ))
                                ) : (
                                  // Quiz allows all departments - show unique departments from academic details
                                  [...new Set(academicDetails.map(detail => detail.department))].filter(Boolean).map((dept) => (
                                    <MenuItem key={dept} value={dept}>
                                      {dept}
                                    </MenuItem>
                                  ))
                                )}
                              </Select>
                            </FormControl>
                          </Grid>
                        )}

                        {/* Year - Show for college students */}
                        {(member.participantType === 'college' ||
                          (selectedQuiz?.participantTypes?.includes('college') && !selectedQuiz?.participantTypes?.includes('external'))) && (
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small" required>
                              <InputLabel>Year</InputLabel>
                              <Select
                                value={member.year}
                                label="Year"
                                onChange={(e) => updateTeamMember(index, 'year', e.target.value)}
                                disabled={selectedQuiz?.years && !selectedQuiz.years.includes('all')}
                              >
                                {selectedQuiz?.years && !selectedQuiz.years.includes('all') ? (
                                  // Quiz has specific year requirements - show only those
                                  selectedQuiz.years.map((year) => (
                                    <MenuItem key={year} value={year}>
                                      {year === 'other' ? 'Other' : `${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`}
                                    </MenuItem>
                                  ))
                                ) : (
                                  // Quiz allows all years - show standard years
                                  ['1', '2', '3', '4'].map((year) => (
                                    <MenuItem key={year} value={year}>
                                      {`${year}${year === '1' ? 'st' : year === '2' ? 'nd' : year === '3' ? 'rd' : 'th'} Year`}
                                    </MenuItem>
                                  ))
                                )}
                              </Select>
                            </FormControl>
                          </Grid>
                        )}


                      </Grid>
                    </Paper>
                  ))}

                  {registrationData.teamMembers.length < 10 && (
                    <Button
                      variant="outlined"
                      onClick={addTeamMember}
                      sx={{ mt: 1 }}
                      disabled={registrationData.teamMembers.length >= selectedQuiz?.teamSize - 1}
                    >
                      Add Team Member
                    </Button>
                  )}
                </Box>
              )}
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            {registrationSuccess ? (
              <Button
                onClick={() => setRegistrationOpen(false)}
                variant="contained"
                color="success"
                fullWidth
              >
                Close
              </Button>
            ) : (
              <>
                <Button onClick={() => setRegistrationOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRegistrationSubmit}
                  variant="contained"
                  disabled={loading || !validateTeamRegistration()}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Registering...
                    </>
                  ) : (
                    'Register'
                  )}
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default EventQuizzes;