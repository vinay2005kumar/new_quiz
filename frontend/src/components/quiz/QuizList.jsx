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
  Chip,
  Box,
  CircularProgress,
  Alert,
  ButtonGroup,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  IconButton,
  Tooltip,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupIcon from '@mui/icons-material/Group';
import ClassIcon from '@mui/icons-material/Class';
import QuizIcon from '@mui/icons-material/Quiz';

const COLORS = {
  excellent: '#4caf50',
  good: '#2196f3',
  average: '#ff9800',
  poor: '#f44336',
  submitted: '#4caf50',
  notSubmitted: '#f44336'
};

// Add CountdownTimer component
const CountdownTimer = ({ startTime }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const start = new Date(startTime).getTime();
      const difference = start - now;

      if (difference <= 0) {
        setTimeLeft('Starting now...');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      let timeString = '';
      if (days > 0) timeString += `${days}d `;
      if (hours > 0) timeString += `${hours}h `;
      if (minutes > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;

      setTimeLeft(timeString);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return (
    <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <AccessTimeIcon fontSize="small" />
      Starts in: {timeLeft}
    </Typography>
  );
};

const QuizList = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [filters, setFilters] = useState({
    department: '',
    year: '',
    semester: '',
    section: '',
    status: ''
  });

  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    submittedCount: 0,
    averageScore: 0,
    scoreDistribution: {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0
    }
  });

  const [detailedStats, setDetailedStats] = useState({
    subjectWiseStats: {},
    departmentWiseStats: {},
    yearWiseStats: {}
  });

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchQuizzes();
    fetchFacultyStructure();
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      calculateStatistics();
    }
  }, [quizzes, submissions]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDetailedStatistics();
    }
  }, [filters]);

  // Add a focus effect to refresh data when tab becomes active
  useEffect(() => {
    const handleFocus = () => {
      fetchQuizzes();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      let allQuizzes = [];

      // Fetch academic quizzes
      const academicResponse = await api.get('/api/quiz');
      console.log('Academic Response:', academicResponse);
      
      // Handle academic quizzes
      if (Array.isArray(academicResponse)) {
        allQuizzes = [...academicResponse.map(q => ({ ...q, type: 'academic' }))];
      } else if (Array.isArray(academicResponse.data)) {
        allQuizzes = [...academicResponse.data.map(q => ({ ...q, type: 'academic' }))];
      }
      console.log('After adding academic quizzes:', allQuizzes);

      // For admin, also fetch event quizzes
      if (user?.role === 'admin') {
        const eventResponse = await api.get('/api/event-quiz');
        console.log('Event Response:', eventResponse);
        
        // Handle event quizzes
        if (Array.isArray(eventResponse)) {
          allQuizzes = [...allQuizzes, ...eventResponse.map(q => ({ ...q, type: 'event' }))];
        } else if (Array.isArray(eventResponse.data)) {
          allQuizzes = [...allQuizzes, ...eventResponse.data.map(q => ({ ...q, type: 'event' }))];
        }
        console.log('After adding event quizzes:', allQuizzes);
      }

      console.log('Final quizzes array:', allQuizzes);
      setQuizzes(allQuizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacultyStructure = async () => {
    try {
      const response = await api.get('/api/academic-details/faculty-structure');
      // Set available departments based on faculty permissions
      if (user?.assignments) {
        const facultyDepts = [...new Set(user.assignments.map(a => a.department))];
        setDepartments(facultyDepts);
      }
    } catch (error) {
      console.error('Error fetching faculty structure:', error);
      setDepartments([]);
    }
  };

  // Get available sections based on faculty assignments
  const getAvailableSections = () => {
    if (!selectedDepartment || !selectedYear || !filters.semester || !user?.assignments) return [];
    return [...new Set(
      user.assignments
        .filter(a => 
          a.department === selectedDepartment && 
          a.year.toString() === selectedYear.toString() && 
          a.semester.toString() === filters.semester.toString()
        )
        .flatMap(a => a.sections)
    )].sort();
  };

  // Get available years based on faculty assignments
  const getAvailableYears = () => {
    if (!selectedDepartment || !user?.assignments) return [];
    return [...new Set(
      user.assignments
        .filter(a => a.department === selectedDepartment)
        .map(a => a.year)
    )].sort((a, b) => a - b);
  };

  // Get available semesters based on faculty assignments
  const getAvailableSemesters = () => {
    if (!selectedDepartment || !selectedYear || !user?.assignments) return [];
    return [...new Set(
      user.assignments
        .filter(a => 
          a.department === selectedDepartment && 
          a.year.toString() === selectedYear.toString()
        )
        .map(a => parseInt(a.semester))
    )].sort((a, b) => a - b);
  };

  const calculateStatistics = () => {
    if (!quizzes || !submissions) return;

    const stats = {
      totalStudents: 0,
      submittedCount: 0,
      averageScore: 0,
      scoreDistribution: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0
      }
    };

    quizzes.forEach(quiz => {
      if (!quiz) return;

      // Use the actual authorized student count from the backend
      stats.totalStudents += quiz.totalAuthorizedStudents || 0;
      
      // Calculate submission statistics
      const quizSubmissions = submissions[quiz._id] || [];
      stats.submittedCount += Array.isArray(quizSubmissions) ? quizSubmissions.length : 0;
      
      // Calculate score distribution
      if (Array.isArray(quizSubmissions)) {
        quizSubmissions.forEach(submission => {
          if (!submission?.answers) return;
          
          const score = submission.answers.reduce((total, ans) => total + (ans?.marks || 0), 0);
          const percentage = quiz.totalMarks > 0 ? (score / quiz.totalMarks) * 100 : 0;
          
          if (percentage > 90) stats.scoreDistribution.excellent++;
          else if (percentage > 70) stats.scoreDistribution.good++;
          else if (percentage > 50) stats.scoreDistribution.average++;
          else stats.scoreDistribution.poor++;
          
          stats.averageScore += score;
        });
      }
    });

    // Calculate final average
    if (stats.submittedCount > 0) {
      stats.averageScore = stats.averageScore / stats.submittedCount;
    }

    setStatistics(stats);
  };

  const fetchDetailedStatistics = async () => {
    try {
      if (user.role !== 'admin') return;

      console.log('Fetching detailed statistics with filters:', filters);
      const response = await api.get('/api/quiz/statistics', {
        params: {
          department: filters.department !== 'all' ? filters.department : undefined,
          year: filters.year !== 'all' ? filters.year : undefined,
          section: filters.section !== 'all' ? filters.section : undefined
        }
      });
      console.log('Statistics response:', response.data);

      if (response.data) {
        setDetailedStats({
          subjectWiseStats: response.data.subjectWiseStats || {},
          departmentWiseStats: response.data.departmentWiseStats || {},
          yearWiseStats: response.data.yearWiseStats || {}
        });

        setStatistics({
          totalStudents: response.data.totalStudents || 0,
          submittedCount: response.data.submittedCount || 0,
          averageScore: response.data.averageScore || 0,
          scoreDistribution: {
            excellent: response.data.scoreDistribution?.excellent || 0,
            good: response.data.scoreDistribution?.good || 0,
            average: response.data.scoreDistribution?.average || 0,
            poor: response.data.scoreDistribution?.poor || 0
          }
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to fetch statistics');
    }
  };

  const getQuizStatus = (quiz, submission) => {
    const now = new Date();
    const startTime = new Date(quiz.startTime);
    const endTime = new Date(quiz.endTime);

    console.log('Quiz Status Check:', {
      quiz: quiz.title,
      now: now.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isBeforeStart: now < startTime,
      isDuringQuiz: now >= startTime && now <= endTime,
      isAfterEnd: now > endTime,
      hasSubmission: !!submission,
      submissionStatus: submission?.status
    });

    // First check if there's a submission
    if (submission && (submission.status === 'submitted' || submission.status === 'evaluated')) {
      return { label: 'Submitted', color: 'success' };
    } else if (now < startTime) {
      return { label: 'Upcoming', color: 'info' };
    } else if (now > endTime) {
      return { label: 'Expired', color: 'error' };
    } else {
      return { label: 'Active', color: 'primary' };
    }
  };

  const getButtonConfig = (quiz, status, submission) => {
    const now = new Date().getTime();
    const startTime = new Date(quiz.startTime).getTime();
    const endTime = new Date(quiz.endTime).getTime();

    // Check if quiz has been submitted
    if (submission && (submission.status === 'submitted' || submission.status === 'evaluated')) {
      return {
        label: 'View Results',
        color: 'info',
        onClick: () => navigate(`/student/quizzes/${quiz._id}/review`),
        icon: <AssessmentIcon />,
        isButton: true
      };
    }

    // Quiz hasn't started yet
    if (now < startTime) {
      return {
        component: <CountdownTimer startTime={quiz.startTime} />,
        isButton: false
      };
    }

    // Quiz is ongoing
    if (now >= startTime && now <= endTime) {
      return {
        label: 'Start Quiz',
        color: 'primary',
        onClick: () => navigate(`/student/quizzes/${quiz._id}/attempt`),
        icon: <QuizIcon />,
        isButton: true
      };
    }

    // Quiz has ended
    return {
      label: 'Expired',
      color: 'error',
      disabled: true,
      icon: null,
      isButton: true
    };
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleDeleteClick = (quiz) => {
    setQuizToDelete(quiz);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setLoading(true);
      await api.delete(`/api/quiz/${quizToDelete._id}`);
      setDeleteDialog(false);
      setQuizToDelete(null);
      // Update the quizzes state instead of reloading
      setQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz._id !== quizToDelete._id));
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
    setQuizToDelete(null);
  };

  const getFilteredQuizzes = () => {
    console.log('Current pathname:', window.location.pathname);
    console.log('All quizzes before filtering:', quizzes);

    if (!Array.isArray(quizzes)) {
      console.warn('Quizzes is not an array:', quizzes);
      return [];
    }

    // First filter by quiz type based on tab
    const typeFilteredQuizzes = quizzes.filter(quiz => {
      if (!quiz) return false;
      
      const isAcademic = quiz.type === 'academic';
      const isEvent = quiz.type === 'event';
      const matchesTab = tabValue === 0 ? isAcademic : isEvent;
      
      console.log('Quiz filtering:', {
        title: quiz.title,
        type: quiz.type,
        isAcademic,
        isEvent,
        tabValue,
        matchesTab
      });
      
      return matchesTab;
    });

    console.log('Quizzes after type filtering:', typeFilteredQuizzes);

    // Apply additional filters
    return typeFilteredQuizzes.filter(quiz => {
      if (!quiz.startTime || !quiz.endTime) return false;

      const now = new Date();
      const startTime = new Date(quiz.startTime);
      const endTime = new Date(quiz.endTime);
      const submission = submissions[quiz._id];
      
      const isUpcoming = now < startTime;
      const isActive = now >= startTime && now <= endTime;
      const isSubmitted = submission && (submission.status === 'submitted' || submission.status === 'evaluated');

      // For student view, filter based on route
      if (user.role === 'student') {
        if (window.location.pathname === '/student/review-quizzes') {
          return isSubmitted;
        } else if (window.location.pathname === '/student/upcoming-quizzes') {
          return isUpcoming && !isSubmitted;
        } else if (window.location.pathname === '/student/quizzes') {
          return (isActive || isUpcoming) && !isSubmitted;
        }
      }

      // For faculty/admin view, apply regular filters
      const departmentMatch = !filters.department || (quiz.allowedGroups && quiz.allowedGroups.some(g => g && g.department === filters.department));
      const yearMatch = !filters.year || (quiz.allowedGroups && quiz.allowedGroups.some(g => g && g.year === Number(filters.year)));
      const semesterMatch = !filters.semester || (quiz.allowedGroups && quiz.allowedGroups.some(g => g && g.semester === Number(filters.semester)));
      const sectionMatch = !filters.section || (quiz.allowedGroups && quiz.allowedGroups.some(g => g && g.section === filters.section));
      const statusMatch = !filters.status || getQuizStatus(quiz).label.toLowerCase() === filters.status.toLowerCase();
      
      return departmentMatch && yearMatch && semesterMatch && sectionMatch && statusMatch;
    });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
    setSelectedSection(''); // Reset section when department changes
  };

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
    setSelectedSection(''); // Reset section when year changes
  };

  const handleSectionChange = (event) => {
    setSelectedSection(event.target.value);
  };

  const handleCreateQuiz = () => {
    navigate('/faculty/quizzes/create');
  };

  const handleViewSubmissions = (quizId) => {
    navigate(`/faculty/quizzes/${quizId}/submissions`);
  };

  const handleEditQuiz = (quizId) => {
    navigate(`/faculty/quizzes/${quizId}/edit`);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setError('');
  };

  const renderFilters = () => (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterListIcon /> Filters
        </Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Department</InputLabel>
            <Select
              name="department"
              value={selectedDepartment}
              onChange={handleDepartmentChange}
              label="Department"
            >
              <MenuItem value="">All</MenuItem>
              {departments.map(dept => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Year</InputLabel>
            <Select
              name="year"
              value={selectedYear}
              onChange={handleYearChange}
              label="Year"
              disabled={!selectedDepartment}
            >
              <MenuItem value="">All</MenuItem>
              {getAvailableYears().map(year => (
                <MenuItem key={year} value={year}>Year {year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Semester</InputLabel>
            <Select
              name="semester"
              value={filters.semester}
              onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
              label="Semester"
              disabled={!selectedYear}
            >
              <MenuItem value="">All</MenuItem>
              {getAvailableSemesters().map(sem => (
                <MenuItem key={sem} value={sem.toString()}>
                  Semester {sem}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Section</InputLabel>
            <Select
              name="section"
              value={selectedSection}
              onChange={handleSectionChange}
              label="Section"
              disabled={!filters.semester}
            >
              <MenuItem value="">All</MenuItem>
              {getAvailableSections().map(section => (
                <MenuItem key={section} value={section}>
                  Section {section}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              setSelectedDepartment('');
              setSelectedYear('');
              setSelectedSection('');
              setFilters({
                department: '',
                year: '',
                semester: '',
                section: '',
                status: ''
              });
            }}
            disabled={!selectedDepartment && !selectedYear && !selectedSection && !filters.status}
          >
            Clear Filters
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderStatisticsCharts = () => {
    // Prepare data for submission status pie chart
    const submissionData = [
      { 
        name: 'Submitted', 
        value: statistics?.submittedCount || 0, 
        color: COLORS.submitted 
      },
      { 
        name: 'Not Submitted', 
        value: (statistics?.totalStudents || 0) - (statistics?.submittedCount || 0),
        color: COLORS.notSubmitted 
      }
    ].filter(item => item.value > 0); // Only show non-zero values

    // Prepare data for score distribution pie chart
    const scoreDistributionData = [
      { 
        name: 'Excellent', 
        value: statistics?.scoreDistribution?.excellent || 0, 
        color: COLORS.excellent 
      },
      { 
        name: 'Good', 
        value: statistics?.scoreDistribution?.good || 0, 
        color: COLORS.good 
      },
      { 
        name: 'Average', 
        value: statistics?.scoreDistribution?.average || 0, 
        color: COLORS.average 
      },
      { 
        name: 'Poor', 
        value: statistics?.scoreDistribution?.poor || 0, 
        color: COLORS.poor 
      }
    ].filter(item => item.value > 0); // Only show non-zero values

    // Don't render charts if no data
    if (submissionData.length === 0 && scoreDistributionData.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          No statistics available yet. Start creating quizzes and collecting submissions to see analytics.
        </Alert>
      );
    }

    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {submissionData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">
                Submission Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={submissionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {submissionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
        
        {scoreDistributionData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom align="center">
                Score Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={scoreDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {scoreDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderDetailedStatistics = () => {
    // Check if we have any detailed statistics
    if (!detailedStats || 
        (!Object.keys(detailedStats.subjectWiseStats || {}).length && 
         !Object.keys(detailedStats.departmentWiseStats || {}).length && 
         !Object.keys(detailedStats.yearWiseStats || {}).length)) {
      return null;
    }

    // Prepare data for bar charts
    const subjectData = Object.entries(detailedStats.subjectWiseStats || {})
      .map(([id, data]) => ({
        name: data.code || 'Unknown',
        submissions: data.totalSubmissions || 0,
        average: parseFloat((data.averageScore || 0).toFixed(1))
      }))
      .filter(item => item.submissions > 0);

    const departmentData = Object.entries(detailedStats.departmentWiseStats || {})
      .map(([dept, data]) => ({
        name: dept || 'Unknown',
        submissions: data.totalSubmissions || 0,
        average: parseFloat((data.averageScore || 0).toFixed(1))
      }))
      .filter(item => item.submissions > 0);

    const yearData = Object.entries(detailedStats.yearWiseStats || {})
      .map(([year, data]) => ({
        name: `Year ${year}`,
        submissions: data.totalSubmissions || 0,
        average: parseFloat((data.averageScore || 0).toFixed(1))
      }))
      .filter(item => item.submissions > 0);

    return (
      <Grid container spacing={2} sx={{ mt: 2 }}>
        {/* Subject-wise Statistics */}
        {subjectData.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom align="center">
                Subject-wise Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="submissions" name="Submissions" fill="#8884d8" />
                  <Bar yAxisId="right" dataKey="average" name="Average Score %" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Department-wise Statistics */}
        {departmentData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom align="center">
                Department-wise Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="submissions" name="Submissions" fill="#8884d8" />
                  <Bar dataKey="average" name="Average Score %" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Year-wise Statistics */}
        {yearData.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom align="center">
                Year-wise Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yearData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="submissions" name="Submissions" fill="#8884d8" />
                  <Bar dataKey="average" name="Average Score %" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };

  const renderQuizCard = (quiz) => {
    const submission = submissions[quiz._id];
    const status = getQuizStatus(quiz, submission);
    const buttonConfig = getButtonConfig(quiz, status, submission);

    // Helper function to get subject display text
    const getSubjectDisplay = (subject) => {
      if (!subject) return 'N/A';
      if (typeof subject === 'string') return subject;
      if (subject.code && subject.name) {
        if (subject.code === subject.name) return subject.code;
        return `${subject.name} (${subject.code})`;
      }
      if (subject.name) return subject.name;
      if (subject.code) return subject.code;
      return 'N/A';
    };

    return (
      <Card 
        key={quiz._id} 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100%',
          maxWidth: '100%'
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom noWrap>
              {quiz.title}
            </Typography>
          </Box>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ClassIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                  Subject: {getSubjectDisplay(quiz.subject)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccessTimeIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                  Duration: {quiz.duration} minutes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <GroupIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                  {quiz.allowedGroups?.map(group => 
                    `${group.department} - Year ${group.year} - Semester ${group.semester || 'N/A'} - Section ${group.section}`
                  ).join(', ')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start: {formatDateTime(quiz.startTime)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  End: {formatDateTime(quiz.endTime)}
                </Typography>
                {status && (
                  <Typography 
                    variant="body2" 
                    color={status.color + '.main'}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    Status: {status.label}
                  </Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
        <CardActions sx={{ p: 2, pt: 0, mt: 'auto' }}>
          {user?.role === 'faculty' ? (
            <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => handleEditQuiz(quiz._id)}
                size="small"
                fullWidth
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteClick(quiz)}
                size="small"
                fullWidth
              >
                Delete
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AssessmentIcon />}
                onClick={() => handleViewSubmissions(quiz._id)}
                size="small"
                fullWidth
              >
                Results
              </Button>
            </Stack>
          ) : (
            buttonConfig.isButton ? (
              <Button
                fullWidth
                variant="contained"
                color={buttonConfig.color}
                onClick={buttonConfig.onClick}
                disabled={buttonConfig.disabled}
                startIcon={buttonConfig.icon}
              >
                {buttonConfig.label}
              </Button>
            ) : (
              buttonConfig.component
            )
          )}
        </CardActions>
      </Card>
    );
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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Quizzes</Typography>
        {user?.role === 'faculty' && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateQuiz}
          >
            Create Quiz
          </Button>
        )}
      </Box>

      <Box sx={{ width: '100%', maxWidth: '1200px' }}>
        {/* Add Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Academic Quizzes" />
            <Tab label="Event Quizzes" />
          </Tabs>
        </Box>

        {/* Show filters and statistics only for admin */}
        {user?.role === 'admin' && (
          <>
            <Box sx={{ width: '100%' }}>
              {renderFilters()}
            </Box>
            {renderStatisticsCharts()}
            {renderDetailedStatistics()}
          </>
        )}

        {/* Show filters based on role */}
        {(user?.role === 'faculty' || user?.role === 'event') && (
          <Box sx={{ width: '100%', mb: 3 }}>
            <Paper sx={{ p: 2 }}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <FilterListIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Filters</Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Department</InputLabel>
                    <Select
                      name="department"
                      value={selectedDepartment}
                      onChange={handleDepartmentChange}
                      label="Department"
                    >
                      <MenuItem value="">All</MenuItem>
                      {departments.map(dept => (
                        <MenuItem key={dept} value={dept}>
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Year</InputLabel>
                    <Select
                      name="year"
                      value={selectedYear}
                      onChange={handleYearChange}
                      label="Year"
                      disabled={!selectedDepartment}
                    >
                      <MenuItem value="">All</MenuItem>
                      {getAvailableYears().map(year => (
                        <MenuItem key={year} value={year}>Year {year}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Semester</InputLabel>
                    <Select
                      name="semester"
                      value={filters.semester}
                      onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
                      label="Semester"
                      disabled={!selectedYear}
                    >
                      <MenuItem value="">All</MenuItem>
                      {getAvailableSemesters().map(sem => (
                        <MenuItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Section</InputLabel>
                    <Select
                      name="section"
                      value={selectedSection}
                      onChange={handleSectionChange}
                      label="Section"
                      disabled={!filters.semester}
                    >
                      <MenuItem value="">All</MenuItem>
                      {getAvailableSections().map(section => (
                        <MenuItem key={section} value={section}>
                          Section {section}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => {
                      setSelectedDepartment('');
                      setSelectedYear('');
                      setSelectedSection('');
                      setFilters({
                        department: '',
                        year: '',
                        semester: '',
                        section: '',
                        status: ''
                      });
                    }}
                    disabled={!selectedDepartment && !selectedYear && !selectedSection && !filters.status}
                  >
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        )}

        {/* Quiz Cards */}
        <Grid container spacing={3}>
          {getFilteredQuizzes().map((quiz) => (
            <Grid item xs={12} sm={6} md={4} key={quiz._id}>
                  <Box sx={{ width: '100%', maxWidth: '320px' }}>
                    {renderQuizCard(quiz)}
                  </Box>
                </Grid>
          ))}
          </Grid>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Quiz</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the quiz "{quizToDelete?.title}"? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuizList; 