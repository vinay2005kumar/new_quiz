import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  LinearProgress
} from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../config/axios';
import AcademicFilter from '../common/AcademicFilter';
import useAcademicFilters from '../../hooks/useAcademicFilters';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const QuizReview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalQuizzes: 0,
    activeQuizzes: 0,
    completedQuizzes: 0,
    totalStudents: 0,
    totalSubmissions: 0,
    averageScore: 0,
    scoreDistribution: {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0
    },
    departmentWiseStats: []
  });
  const {
    filters,
    handleFilterChange,
    clearFilters,
    getFilterParams
  } = useAcademicFilters({
    department: 'all',
    year: 'all',
    section: 'all',
    subject: 'all'
  });

  useEffect(() => {
    fetchStatistics();
  }, [filters]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching statistics with filters:', filters);
      const response = await api.get('/quiz/statistics', { params: getFilterParams() });
      console.log('Statistics response:', response);
      setStats(response);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError(error.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value) => {
    if (typeof value !== 'number' || isNaN(value)) return '0%';
    return `${Math.round(value)}%`;
  };

  const getSubmissionData = () => {
    const totalStudents = stats.totalStudents || 0;
    const totalSubmissions = stats.totalSubmissions || 0;
    return [
      { name: 'Submitted', value: totalSubmissions },
      { name: 'Not Submitted', value: Math.max(0, totalStudents - totalSubmissions) }
    ].filter(item => item.value > 0);
  };

  const getScoreDistributionData = () => {
    const distribution = stats.scoreDistribution || {};
    return [
      { name: 'Excellent (>90%)', value: distribution.excellent || 0 },
      { name: 'Good (70-90%)', value: distribution.good || 0 },
      { name: 'Average (50-70%)', value: distribution.average || 0 },
      { name: 'Poor (<50%)', value: distribution.poor || 0 }
    ].filter(item => item.value > 0);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const submissionData = getSubmissionData();
  const scoreDistributionData = getScoreDistributionData();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Quiz Statistics
        </Typography>

        {/* Filters */}
        <AcademicFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          showFilters={['department', 'year', 'section', 'subject']}
          title="Quiz Statistics Filters"
          showRefreshButton={true}
          onRefresh={fetchStatistics}
        />

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Quizzes
                </Typography>
                <Typography variant="h5">{stats.totalQuizzes}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Quizzes
                </Typography>
                <Typography variant="h5">{stats.activeQuizzes}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Submission Rate
                </Typography>
                <Typography variant="h5">
                  {formatPercentage((stats.totalSubmissions / stats.totalStudents) * 100)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Average Score
                </Typography>
                <Typography variant="h5">{formatPercentage(stats.averageScore)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts and Tables */}
        <Grid container spacing={3}>
          {/* Submission Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Submission Distribution
              </Typography>
              <Box sx={{ height: 300, width: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={submissionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {submissionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Score Distribution */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Score Distribution
              </Typography>
              <Box sx={{ height: 300, width: '100%' }}>
                <ResponsiveContainer>
                  <BarChart data={scoreDistributionData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          {/* Department-wise Performance Table */}
          <Grid item xs={12}>
            <Paper sx={{ width: '100%', overflow: 'hidden' }}>
              <TableContainer>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Department</TableCell>
                      <TableCell align="right">Total Submissions</TableCell>
                      <TableCell align="right">Average Score</TableCell>
                      <TableCell align="right">Submission Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.departmentWiseStats?.map((dept) => (
                      <TableRow key={dept.name}>
                        <TableCell component="th" scope="row">
                          {dept.name}
                        </TableCell>
                        <TableCell align="right">{dept.submissionCount}</TableCell>
                        <TableCell align="right">{formatPercentage(dept.averageScore)}</TableCell>
                        <TableCell align="right">{formatPercentage(dept.submissionRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default QuizReview; 