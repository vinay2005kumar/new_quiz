import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Alert,
  useTheme,
  useMediaQuery,
  Stack,
  Chip
} from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  Event as EventIcon,
  Quiz as QuizIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Dashboard as DashboardIcon,
  Groups as GroupsIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  PlayCircle as PlayCircleIcon,
  Info as InfoIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';

import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    upcomingQuizzes: 0,
    completedQuizzes: 0,
    activeQuizzes: 0,
    averageScore: 0,
    submissions: [],
    recentQuizzes: [],
    totalStudents: 0,
    totalSubmissions: 0,
    totalRegistrations: 0,
    pendingQuizzes: 0
  });
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalFaculty: 0,
    totalEventManagers: 0,
    totalQuizzes: 0,
    totalSubmissions: 0,
    activeQuizzes: 0,
    completedQuizzes: 0,
    averageScore: 0,
    recentActivity: []
  });
  const [anchorEl, setAnchorEl] = useState(null);

  // Track adminStats changes for admin dashboard
  useEffect(() => {
    // AdminStats updated
  }, [adminStats]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError('');
        setLoading(true);

        // Reset all state when user changes
        setStats({
          totalQuizzes: 0,
          upcomingQuizzes: 0,
          completedQuizzes: 0,
          activeQuizzes: 0,
          averageScore: 0,
          submissions: [],
          recentQuizzes: [],
          totalStudents: 0,
          totalSubmissions: 0,
          totalRegistrations: 0,
          pendingQuizzes: 0
        });

        setAdminStats({
          totalUsers: 0,
          totalStudents: 0,
          totalFaculty: 0,
          totalEventManagers: 0,
          totalQuizzes: 0,
          totalSubmissions: 0,
          activeQuizzes: 0,
          completedQuizzes: 0,
          averageScore: 0,
          recentActivity: []
        });

        // Get quizzes based on user role
        let quizzes = [];

        if (user?.role === 'event') {
          // For event managers, fetch only their own event quizzes (backend already filters by user)
          const quizzesResponse = await api.get('/api/event-quiz');
          quizzes = Array.isArray(quizzesResponse) ? quizzesResponse : [];
        } else {
          // For other roles, fetch academic quizzes
          // For students, include past quizzes for proper dashboard statistics
          const includeParam = user?.role === 'student' ? '?includePast=true' : '';
          const quizzesResponse = await api.get(`/api/quiz${includeParam}`);
          quizzes = Array.isArray(quizzesResponse) ? quizzesResponse : [];
        }

        // For students, fetch their submissions using bulk endpoint
        let submissions = [];
        if (user?.role === 'student') {
          try {
            // Use the bulk submissions endpoint - much more efficient!
            const submissionsResponse = await api.get('/api/quiz/my-submissions');
            const actualSubmissions = Array.isArray(submissionsResponse) ? submissionsResponse : [];

            // Create a map of submitted quiz IDs for quick lookup
            const submittedQuizIds = new Set(actualSubmissions.map(sub => sub.quiz._id));

            const now = new Date();

            // Process actual submissions
            const processedSubmissions = actualSubmissions.map(sub => ({
              quizId: sub.quiz._id,
              quiz: sub.quiz,
              ...sub,
              totalScore: Array.isArray(sub.answers)
                ? sub.answers.reduce((total, ans) => total + (Number(ans.marks) || 0), 0)
                : 0
            }));

            // Add placeholder entries for quizzes without submissions
            const quizzesWithoutSubmissions = quizzes
              .filter(quiz => !submittedQuizIds.has(quiz._id))
              .map(quiz => ({
                quizId: quiz._id,
                quiz: quiz,
                status: new Date(quiz.startTime) > now ? 'upcoming' :
                       (new Date(quiz.endTime) >= now ? 'ongoing' : 'not_attempted'),
                totalScore: 0
              }));

            // Combine and sort all submissions
            submissions = [...processedSubmissions, ...quizzesWithoutSubmissions]
              .sort((a, b) => {
                // Sort by status priority
                const statusPriority = {
                  'evaluated': 1,
                  'ongoing': 2,
                  'upcoming': 3,
                  'not_attempted': 4
                };

                const statusDiff = statusPriority[a.status] - statusPriority[b.status];
                if (statusDiff !== 0) return statusDiff;

                // For same status, sort by date
                if (a.status === 'evaluated' && a.submitTime && b.submitTime) {
                  return new Date(b.submitTime) - new Date(a.submitTime);
                }

                // For upcoming/ongoing, sort by start time
                return new Date(a.quiz.startTime) - new Date(b.quiz.startTime);
              });
          } catch (error) {
            console.error('Error fetching student submissions:', error);
            submissions = [];
          }
        }

        // Create recent quizzes data from submissions
        const recentQuizzes = submissions.slice(0, 3).map(sub => ({
          title: sub.quiz?.title || 'Quiz',
          subject: typeof sub.quiz?.subject === 'object'
            ? sub.quiz?.subject?.name || sub.quiz?.subject?.code || 'General'
            : sub.quiz?.subject || 'General',
          duration: sub.quiz?.duration || 30,
          status: sub.status === 'evaluated' ? 'Completed' : 'Pending',
          score: sub.status === 'evaluated' ? sub.totalScore : null
        }));

        // Calculate statistics properly
        const now = new Date();

        // Get submitted quiz IDs
        const submittedQuizIds = new Set(submissions
          .filter(sub => sub.status === 'evaluated')
          .map(sub => sub.quizId)
        );

        // Categorize quizzes
        const upcomingQuizzes = quizzes.filter(quiz => new Date(quiz.startTime) > now);
        const activeQuizzes = quizzes.filter(quiz =>
          new Date(quiz.startTime) <= now && new Date(quiz.endTime) >= now
        );

        // For event managers and faculty, completed quizzes are those that have ended
        // For students, completed quizzes are those with submissions
        let completedQuizzes;
        if (user?.role === 'event' || user?.role === 'faculty') {
          completedQuizzes = quizzes.filter(quiz => new Date(quiz.endTime) < now);
        } else {
          completedQuizzes = quizzes.filter(quiz => submittedQuizIds.has(quiz._id));
        }

        const expiredQuizzes = quizzes.filter(quiz =>
          new Date(quiz.endTime) < now && !submittedQuizIds.has(quiz._id)
        );
        const pendingQuizzes = quizzes.filter(quiz =>
          (new Date(quiz.startTime) <= now && new Date(quiz.endTime) >= now) ||
          (new Date(quiz.startTime) > now)
        ).filter(quiz => !submittedQuizIds.has(quiz._id));

        const stats = {
          totalQuizzes: quizzes.length,
          upcomingQuizzes: upcomingQuizzes.length,
          activeQuizzes: activeQuizzes.length,
          completedQuizzes: completedQuizzes.length,
          pendingQuizzes: pendingQuizzes.length,
          expiredQuizzes: expiredQuizzes.length,
          expiredQuizzesList: expiredQuizzes, // For displaying expired quiz details
          submissions: submissions,
          recentQuizzes: recentQuizzes,
          totalStudents: 0, // Will be populated for faculty/event dashboards
          totalSubmissions: submissions.length,
          totalRegistrations: 0 // Will be populated for event dashboard
        };

        setStats(stats);

        // Fetch admin-specific statistics if user is admin
        if (user?.role === 'admin') {
          try {
            // Use the correct admin API endpoints that actually exist
            const [studentsResponse, facultyResponse, eventAccountsResponse, adminStatsResponse] = await Promise.all([
              api.get('/api/admin/accounts?role=student').catch(() => ({ accounts: [] })),
              api.get('/api/admin/accounts?role=faculty').catch(() => ({ accounts: [] })),
              api.get('/api/admin/event-quiz-accounts').catch(() => ({ accounts: [] })),
              api.get('/api/admin/stats').catch(() => ({}))
            ]);

            // Extract accounts from the response structure
            const students = studentsResponse?.accounts || [];
            const faculty = facultyResponse?.accounts || [];
            // Event accounts endpoint returns { accounts: [...] } format
            const eventAccounts = eventAccountsResponse?.accounts || [];

            // Use admin stats from the backend if available
            const backendStats = adminStatsResponse || {};

            // Fetch event quizzes to get complete picture
            let eventQuizzes = [];
            try {
              const eventQuizzesResponse = await api.get('/api/event-quiz').catch(() => []);
              eventQuizzes = Array.isArray(eventQuizzesResponse) ? eventQuizzesResponse : [];
            } catch (error) {
              console.error('Error fetching event quizzes:', error);
              eventQuizzes = [];
            }

            // Calculate quiz statistics for both academic and event quizzes
            const academicActiveQuizzes = quizzes.filter(quiz =>
              new Date(quiz.startTime) <= now && new Date(quiz.endTime) >= now
            ).length;

            const eventActiveQuizzes = eventQuizzes.filter(quiz =>
              new Date(quiz.startTime) <= now && new Date(quiz.endTime) >= now
            ).length;

            const academicCompletedQuizzes = quizzes.filter(quiz =>
              new Date(quiz.endTime) < now
            ).length;

            const eventCompletedQuizzes = eventQuizzes.filter(quiz =>
              new Date(quiz.endTime) < now
            ).length;

            const academicUpcomingQuizzes = quizzes.filter(quiz =>
              new Date(quiz.startTime) > now
            ).length;

            const eventUpcomingQuizzes = eventQuizzes.filter(quiz =>
              new Date(quiz.startTime) > now
            ).length;

            const totalActiveQuizzes = academicActiveQuizzes + eventActiveQuizzes;
            const totalCompletedQuizzes = academicCompletedQuizzes + eventCompletedQuizzes;

            // Calculate average score from submissions
            const evaluatedSubmissions = submissions.filter(sub => sub.status === 'evaluated');
            const averageScore = evaluatedSubmissions.length > 0
              ? (evaluatedSubmissions.reduce((sum, sub) => sum + (sub.totalScore || 0), 0) / evaluatedSubmissions.length).toFixed(1)
              : 0;

            // Calculate total users correctly
            const totalUsersCount = students.length + faculty.length + eventAccounts.length;

            // Admin dashboard data calculated

            const newAdminStats = {
              totalUsers: totalUsersCount, // Always use calculated count, not backend stats
              totalStudents: students.length,
              totalFaculty: faculty.length,
              totalEventManagers: eventAccounts.length,
              totalQuizzes: (quizzes.length + eventQuizzes.length) || 0,
              eventQuizzes: eventQuizzes.length || 0,
              totalSubmissions: backendStats.totalSubmissions || submissions.length || 0,
              activeQuizzes: totalActiveQuizzes || 0,
              completedQuizzes: totalCompletedQuizzes || 0,
              academicCompletedQuizzes: academicCompletedQuizzes || 0,
              eventCompletedQuizzes: eventCompletedQuizzes || 0,
              academicActiveQuizzes: academicActiveQuizzes || 0,
              eventActiveQuizzes: eventActiveQuizzes || 0,
              academicUpcomingQuizzes: academicUpcomingQuizzes || 0,
              eventUpcomingQuizzes: eventUpcomingQuizzes || 0,
              averageScore: averageScore || 0,
              recentActivity: submissions.slice(-5) || []
            };

            // Setting admin stats
            setAdminStats(newAdminStats);
          } catch (adminError) {
            console.error('Error fetching admin stats:', adminError);
            // Set default values if API calls fail
            setAdminStats({
              totalUsers: 0,
              totalStudents: 0,
              totalFaculty: 0,
              totalEventManagers: 0,
              totalQuizzes: 0,
              totalSubmissions: 0,
              activeQuizzes: 0,
              completedQuizzes: 0,
              averageScore: 0,
              recentActivity: []
            });
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user?.id, user?.role, user?._id, user?.email]); // More specific dependencies to ensure re-run on user change

  // Cleanup effect to reset state when component unmounts
  useEffect(() => {
    return () => {
      // Reset state on unmount to prevent stale data
      setStats({
        totalQuizzes: 0,
        upcomingQuizzes: 0,
        completedQuizzes: 0,
        activeQuizzes: 0,
        averageScore: 0,
        submissions: [],
        recentQuizzes: [],
        totalStudents: 0,
        totalSubmissions: 0,
        totalRegistrations: 0,
        pendingQuizzes: 0
      });
      setAdminStats({
        totalUsers: 0,
        totalStudents: 0,
        totalFaculty: 0,
        totalEventManagers: 0,
        totalQuizzes: 0,
        totalSubmissions: 0,
        activeQuizzes: 0,
        completedQuizzes: 0,
        averageScore: 0,
        recentActivity: []
      });
    };
  }, []);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    logout();
  };

  // Professional StatCard component
  const StatCard = ({ title, value, icon, color = 'primary', trend, subtitle }) => (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${theme.palette[color].main}15 0%, ${theme.palette[color].main}05 100%)`,
        border: `1px solid ${theme.palette[color].main}20`,
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: `0 20px 40px ${theme.palette[color].main}20`,
          border: `1px solid ${theme.palette[color].main}40`,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${theme.palette[color].main}, ${theme.palette[color].light})`,
        }
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontWeight: 500,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                mb: 0.5
              }}
            >
              {title}
            </Typography>
            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${theme.palette[color].main}20`,
              color: theme.palette[color].main,
              width: { xs: 40, sm: 48 },
              height: { xs: 40, sm: 48 },
            }}
          >
            {icon}
          </Avatar>
        </Box>

        <Typography
          variant="h3"
          component="div"
          sx={{
            fontWeight: 700,
            color: theme.palette[color].main,
            fontSize: { xs: '2rem', sm: '2.5rem' },
            lineHeight: 1,
            mb: 1
          }}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>

        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              +{trend}% this month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const StudentDashboard = () => {
    if (!user) return null;
    return (
      <Container maxWidth="xl" className="main-content-with-navbar" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Header Section */}
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Welcome, {user.name}!
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 400,
              mb: 1
            }}
          >
            {typeof user.department === 'object' ? user.department?.name || user.department?.code || 'Department' : user.department} - Year {user.year}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 400
            }}
          >
            Admission Number: {user.admissionNumber}
          </Typography>
        </Box>

        {/* Quiz Statistics */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: 3,
              color: 'text.primary',
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            📊 Your Quiz Statistics
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Total Quizzes"
                value={stats.totalQuizzes}
                icon={<QuizIcon />}
                color="primary"
                subtitle="Available to attempt"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Completed"
                value={stats.completedQuizzes}
                icon={<CheckCircleIcon />}
                color="success"
                subtitle="Successfully finished"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Pending"
                value={stats.pendingQuizzes}
                icon={<PendingIcon />}
                color="warning"
                subtitle="Awaiting attempt"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Expired"
                value={stats.expiredQuizzes}
                icon={<AccessTimeIcon />}
                color="error"
                subtitle="Missed opportunities"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Expired Quizzes Details */}
        {stats.expiredQuizzesList && stats.expiredQuizzesList.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 3,
                color: 'text.primary',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              ⏰ Expired Quizzes
            </Typography>
            <Card
              elevation={0}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Grid container spacing={2}>
                  {stats.expiredQuizzesList.slice(0, 6).map((quiz, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card
                        elevation={0}
                        sx={{
                          height: '100%',
                          background: 'background.paper',
                          border: `1px solid ${theme.palette.error.light}`,
                          borderRadius: 2,
                          borderLeft: `4px solid ${theme.palette.error.main}`,
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem' }}>
                            {quiz.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {typeof quiz.subject === 'object' ? quiz.subject?.name || quiz.subject?.code || 'Subject' : quiz.subject}
                          </Typography>
                          <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                            Expired: {new Date(quiz.endTime).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {stats.expiredQuizzesList.length > 6 && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      And {stats.expiredQuizzesList.length - 6} more expired quizzes...
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Upcoming Quizzes Section */}
        {stats.upcomingQuizzes > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 3,
                color: 'text.primary',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              🚀 Upcoming Quizzes
            </Typography>
            <Card
              elevation={0}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Grid container spacing={2}>
                  {quizzes
                    .filter(quiz => new Date(quiz.startTime) > new Date())
                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                    .slice(0, 6)
                    .map((quiz, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card
                        elevation={0}
                        sx={{
                          height: '100%',
                          background: 'background.paper',
                          border: `1px solid ${theme.palette.primary.light}`,
                          borderRadius: 2,
                          borderLeft: `4px solid ${theme.palette.primary.main}`,
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem' }}>
                            {quiz.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {typeof quiz.subject === 'object' ? quiz.subject?.name || quiz.subject?.code || 'Subject' : quiz.subject}
                          </Typography>
                          <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600, mb: 1 }}>
                            Starts: {new Date(quiz.startTime).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Duration: {quiz.duration} minutes
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {quizzes.filter(quiz => new Date(quiz.startTime) > new Date()).length > 6 && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      And {quizzes.filter(quiz => new Date(quiz.startTime) > new Date()).length - 6} more upcoming quizzes...
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        )}
      </Container>
    );
  };

  const FacultyDashboard = () => {
    if (!user) return null;
    return (
      <Container maxWidth="xl" className="main-content-with-navbar" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Header Section */}
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Welcome, {user.name}!
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 400
            }}
          >
            {typeof user.department === 'object' ? user.department?.name || user.department?.code || 'Department' : user.department} - Faculty Dashboard
          </Typography>
        </Box>

        {/* Quiz Management Statistics */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: 3,
              color: 'text.primary',
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            📊 Quiz Management Overview
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Total Quizzes"
                value={stats.totalQuizzes}
                icon={<QuizIcon />}
                color="primary"
                subtitle="Created by you"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Active Quizzes"
                value={stats.activeQuizzes}
                icon={<PlayCircleIcon />}
                color="success"
                subtitle="Currently running"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Upcoming Quizzes"
                value={stats.upcomingQuizzes}
                icon={<AccessTimeIcon />}
                color="info"
                subtitle="Scheduled quizzes"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Completed Quizzes"
                value={stats.completedQuizzes}
                icon={<CheckCircleIcon />}
                color="success"
                subtitle="Finished quizzes"
              />
            </Grid>
          </Grid>
        </Box>


      </Container>
    );
  };

  const AdminDashboard = () => {
    if (!user) return null;
    return (
      <Box
        sx={{
          mt: 0,
          mb: { xs: 2, sm: 4 },
          px: { xs: 0, sm: 2, md: 3 },
          width: '100%',
          maxWidth: '100vw',
          overflow: 'hidden'
        }}
      >
        {/* Header Section */}
        <Box sx={{ mb: { xs: 1, sm: 1.5 } }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: { xs: 0.25, sm: 0.5 },
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            Admin Dashboard
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
              fontWeight: 400,
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            Welcome back, {user.name}! Here's your comprehensive system overview.
          </Typography>
        </Box>

        {/* User Statistics Cards */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: { xs: 1.5, sm: 2 },
              color: 'text.primary',
              fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            👥 User Management
          </Typography>
          <Grid container spacing={{ xs: 0, sm: 1.5, md: 2 }} sx={{ width: '100%', m: 0, justifyContent: { xs: 'space-between', sm: 'flex-start' } }}>
            <Grid item xs={6} sm={6} md={3} lg={3} sx={{ pr: { xs: 0.25, sm: 0 } }}>
              <StatCard
                title="Total Students"
                value={adminStats.totalStudents}
                icon={<SchoolIcon />}
                color="primary"
                subtitle="Registered learners"
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3} lg={3} sx={{ pl: { xs: 0.25, sm: 0 } }}>
              <StatCard
                title="Faculty Members"
                value={adminStats.totalFaculty}
                icon={<PeopleIcon />}
                color="secondary"
                subtitle="Teaching staff"
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3} lg={3} sx={{ pr: { xs: 0.25, sm: 0 } }}>
              <StatCard
                title="Event Managers"
                value={adminStats.totalEventManagers}
                icon={<EventIcon />}
                color="warning"
                subtitle="Event coordinators"
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3} lg={3} sx={{ pl: { xs: 0.25, sm: 0 } }}>
              <StatCard
                title="Total Users"
                value={adminStats.totalUsers}
                icon={<GroupsIcon />}
                color="success"
                subtitle="All system users"
              />
            </Grid>
          </Grid>
        </Box>

        {/* Quiz & Activity Statistics */}
        <Box sx={{ mb: { xs: 2, sm: 3 } }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: { xs: 1.5, sm: 2 },
              color: 'text.primary',
              fontSize: { xs: '1.1rem', sm: '1.25rem', md: '1.5rem' },
              textAlign: { xs: 'center', sm: 'left' }
            }}
          >
            📊 Quiz Analytics
          </Typography>

          {/* Faculty Quizzes Section */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 2,
                color: 'primary.main',
                fontSize: { xs: '1rem', sm: '1.1rem' }
              }}
            >
              👨‍🏫 Faculty Quizzes (Academic)
            </Typography>
            <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={3}>
                <StatCard
                  title="Total Academic"
                  value={adminStats.totalQuizzes - (adminStats.eventQuizzes || 0)}
                  icon={<QuizIcon />}
                  color="primary"
                  subtitle="Faculty created"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  title="Active Academic"
                  value={adminStats.academicActiveQuizzes || 0}
                  icon={<PlayCircleIcon />}
                  color="success"
                  subtitle="Currently running"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  title="Upcoming Academic"
                  value={adminStats.academicUpcomingQuizzes || 0}
                  icon={<AccessTimeIcon />}
                  color="info"
                  subtitle="Scheduled"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  title="Completed Academic"
                  value={adminStats.academicCompletedQuizzes || 0}
                  icon={<CheckCircleIcon />}
                  color="warning"
                  subtitle="Finished"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Event Manager Quizzes Section */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                mb: 2,
                color: 'secondary.main',
                fontSize: { xs: '1rem', sm: '1.1rem' }
              }}
            >
              🎯 Event Manager Quizzes
            </Typography>
            <Grid container spacing={{ xs: 1, sm: 2 }}>
              <Grid item xs={6} sm={3}>
                <StatCard
                  title="Total Events"
                  value={adminStats.eventQuizzes || 0}
                  icon={<EventIcon />}
                  color="secondary"
                  subtitle="Event created"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  title="Active Events"
                  value={adminStats.eventActiveQuizzes || 0}
                  icon={<PlayCircleIcon />}
                  color="success"
                  subtitle="Currently running"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  title="Upcoming Events"
                  value={adminStats.eventUpcomingQuizzes || 0}
                  icon={<AccessTimeIcon />}
                  color="info"
                  subtitle="Scheduled"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  title="Completed Events"
                  value={adminStats.eventCompletedQuizzes || 0}
                  icon={<CheckCircleIcon />}
                  color="warning"
                  subtitle="Finished"
                />
              </Grid>
            </Grid>
          </Box>
        </Box>



        {/* Upcoming Quizzes Section for Admin */}
        {stats.upcomingQuizzes > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 3,
                color: 'text.primary',
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              📅 Upcoming Academic Quizzes
            </Typography>
            <Card
              elevation={0}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Grid container spacing={2}>
                  {quizzes
                    .filter(quiz => new Date(quiz.startTime) > new Date())
                    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                    .slice(0, 6)
                    .map((quiz, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card
                        elevation={0}
                        sx={{
                          height: '100%',
                          background: 'background.paper',
                          border: `1px solid ${theme.palette.success.light}`,
                          borderRadius: 2,
                          borderLeft: `4px solid ${theme.palette.success.main}`,
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem' }}>
                            {quiz.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {typeof quiz.subject === 'object' ? quiz.subject?.name || quiz.subject?.code || 'Subject' : quiz.subject}
                          </Typography>
                          <Typography variant="body2" color="success.main" sx={{ fontWeight: 600, mb: 1 }}>
                            Starts: {new Date(quiz.startTime).toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Duration: {quiz.duration} minutes
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    );
  };

  const EventDashboard = () => {
    if (!user) return null;
    return (
      <Container maxWidth="xl" className="main-content-with-navbar" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Header Section */}
        <Box sx={{ mb: { xs: 3, sm: 4 } }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1
            }}
          >
            Welcome, {user.name}!
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 400,
              mb: 1
            }}
          >
            {typeof user.department === 'object' ? user.department?.name || user.department?.code || 'Department' : user.department} - Event Manager Dashboard
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.875rem', sm: '1rem' },
              fontWeight: 400
            }}
          >
            Event Type: {typeof user.eventType === 'object' ? user.eventType?.name || user.eventType?.code || 'Event' : user.eventType}
          </Typography>
        </Box>

        {/* Event Management Statistics */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: 3,
              color: 'text.primary',
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            🎯 Event Quiz Management
          </Typography>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Total Events"
                value={stats.totalQuizzes}
                icon={<EventIcon />}
                color="primary"
                subtitle="Created events"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Active Events"
                value={stats.activeQuizzes}
                icon={<PlayCircleIcon />}
                color="success"
                subtitle="Currently running"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Upcoming Events"
                value={stats.upcomingQuizzes}
                icon={<AccessTimeIcon />}
                color="info"
                subtitle="Scheduled events"
              />
            </Grid>
            <Grid item xs={12} sm={6} lg={3}>
              <StatCard
                title="Completed Events"
                value={stats.completedQuizzes}
                icon={<CheckCircleIcon />}
                color="success"
                subtitle="Finished events"
              />
            </Grid>
          </Grid>
        </Box>




      </Container>
    );
  };

  // Helper function for next quiz time
  const getNextQuizTime = () => {
    if (!stats.submissions || stats.submissions.length === 0) return '';

    const now = new Date();
    const upcomingQuizzes = stats.submissions
      .filter(sub => new Date(sub.quiz.startTime) > now)
      .sort((a, b) => new Date(a.quiz.startTime) - new Date(b.quiz.startTime));

    if (upcomingQuizzes.length === 0) return '';

    const nextQuiz = upcomingQuizzes[0];
    const timeUntilStart = new Date(nextQuiz.quiz.startTime) - now;
    const hoursUntilStart = Math.floor(timeUntilStart / (1000 * 60 * 60));
    const minutesUntilStart = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursUntilStart > 24) {
      const daysUntilStart = Math.floor(hoursUntilStart / 24);
      return `${daysUntilStart} days`;
    }
    return `${hoursUntilStart}h ${minutesUntilStart}m`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        pt: { xs: 2, sm: 3 },
        pb: { xs: 2, sm: 4 }
      }}
    >
      <Container
        maxWidth="xl"
        sx={{
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
        {user.role === 'student' ? (
          <StudentDashboard />
        ) : user.role === 'admin' ? (
          <AdminDashboard />
        ) : user.role === 'event' ? (
          <EventDashboard />
        ) : (
          <FacultyDashboard />
        )}
      </Container>
    </Box>
  );
};

export default Dashboard; 