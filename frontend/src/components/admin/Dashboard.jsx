import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Avatar,
  useTheme,
  useMediaQuery,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  People as PeopleIcon,
  School as SchoolIcon,
  Event as EventIcon,
  Quiz as QuizIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Dashboard as DashboardIcon,
  Groups as GroupsIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [stats, setStats] = useState({
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch comprehensive admin statistics
        const [statsResponse, usersResponse, quizzesResponse, submissionsResponse] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/admin/users'),
          api.get('/api/admin/quizzes'),
          api.get('/api/admin/submissions')
        ]);

        console.log('Admin stats response:', statsResponse);

        // Process user counts by role
        const users = usersResponse || [];
        const students = users.filter(user => user.role === 'student');
        const faculty = users.filter(user => user.role === 'faculty');
        const eventManagers = users.filter(user => user.role === 'event');

        // Process quiz statistics
        const quizzes = quizzesResponse || [];
        const submissions = submissionsResponse || [];
        const now = new Date();

        const activeQuizzes = quizzes.filter(quiz =>
          new Date(quiz.startTime) <= now && new Date(quiz.endTime) >= now
        ).length;

        const completedQuizzes = quizzes.filter(quiz =>
          new Date(quiz.endTime) < now
        ).length;

        const evaluatedSubmissions = submissions.filter(sub => sub.status === 'evaluated');
        const averageScore = evaluatedSubmissions.length > 0
          ? (evaluatedSubmissions.reduce((sum, sub) => sum + (sub.totalScore || 0), 0) / evaluatedSubmissions.length).toFixed(1)
          : 0;

        // Ensure we have default values for all stats
        setStats({
          totalUsers: users.length || 0,
          totalStudents: students.length || 0,
          totalFaculty: faculty.length || 0,
          totalEventManagers: eventManagers.length || 0,
          totalQuizzes: quizzes.length || 0,
          totalSubmissions: submissions.length || 0,
          activeQuizzes: activeQuizzes || 0,
          completedQuizzes: completedQuizzes || 0,
          averageScore: averageScore || 0,
          recentActivity: submissions.slice(-5) || []
        });
        setLoading(false);
      } catch (err) {
        console.error('Error fetching admin stats:', err);
        setError('Failed to fetch dashboard statistics');
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
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
          {value.toLocaleString()}
        </Typography>

        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon
              sx={{
                fontSize: '1rem',
                color: trend > 0 ? 'success.main' : 'error.main'
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: trend > 0 ? 'success.main' : 'error.main',
                fontWeight: 600
              }}
            >
              {trend > 0 ? '+' : ''}{trend}% from last month
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
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
          Admin Dashboard
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            fontSize: { xs: '1rem', sm: '1.25rem' },
            fontWeight: 400
          }}
        >
          Comprehensive overview of your quiz management system
        </Typography>
      </Box>

      {/* User Statistics Cards */}
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
          👥 User Management
        </Typography>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              icon={<SchoolIcon />}
              color="primary"
              trend={12}
              subtitle="Registered learners"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Faculty Members"
              value={stats.totalFaculty}
              icon={<PeopleIcon />}
              color="secondary"
              trend={5}
              subtitle="Teaching staff"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Event Managers"
              value={stats.totalEventManagers}
              icon={<EventIcon />}
              color="warning"
              trend={8}
              subtitle="Event coordinators"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={<GroupsIcon />}
              color="success"
              trend={15}
              subtitle="All system users"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Quiz & Activity Statistics */}
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
          📊 Quiz Analytics
        </Typography>
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Total Quizzes"
              value={stats.totalQuizzes}
              icon={<QuizIcon />}
              color="info"
              trend={20}
              subtitle="All created quizzes"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Active Quizzes"
              value={stats.activeQuizzes}
              icon={<DashboardIcon />}
              color="success"
              subtitle="Currently running"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Total Submissions"
              value={stats.totalSubmissions}
              icon={<AssignmentIcon />}
              color="primary"
              trend={25}
              subtitle="Quiz attempts"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              icon={<TrendingUpIcon />}
              color="warning"
              trend={3}
              subtitle="Overall performance"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Quick Stats Summary */}
      <Card
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.secondary.main}08 100%)`,
          border: `1px solid ${theme.palette.primary.main}20`,
          borderRadius: 3,
          p: { xs: 2, sm: 3 }
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            mb: 2,
            color: 'text.primary'
          }}
        >
          📈 System Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
                {stats.completedQuizzes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Quizzes
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 700 }}>
                {((stats.totalSubmissions / (stats.totalStudents * stats.totalQuizzes)) * 100 || 0).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Participation Rate
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                {stats.recentActivity.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recent Activities
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Card>
    </Container>
  );
};

export default Dashboard; 