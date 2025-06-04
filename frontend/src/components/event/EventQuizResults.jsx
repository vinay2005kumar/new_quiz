import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  TablePagination,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  School as SchoolIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import api from '../../config/axios';

const EventQuizResults = () => {
  const { quizId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    passCount: 0
  });

  useEffect(() => {
    const fetchQuizAndResults = async () => {
      try {
        setLoading(true);
        const [quizResponse, resultsResponse] = await Promise.all([
          api.get(`/api/event-quiz/${quizId}`),
          api.get(`/api/event-quiz/${quizId}/results`)
        ]);

        setQuiz(quizResponse);
        setResults(resultsResponse);

        // Calculate statistics
        if (resultsResponse.length > 0) {
          const scores = resultsResponse.map(r => r.score);
          const passCount = resultsResponse.filter(r => r.score >= (quiz?.passingMarks || 0)).length;
          
          setStats({
            totalParticipants: resultsResponse.length,
            averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            passCount
          });
        }
      } catch (error) {
        console.error('Error fetching quiz results:', error);
        setError(error.response?.data?.message || 'Failed to fetch quiz results');
      } finally {
        setLoading(false);
      }
    };

    fetchQuizAndResults();
  }, [quizId]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!quiz) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="info">Quiz not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Quiz Results
      </Typography>

      {/* Quiz Details Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {quiz.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {quiz.description}
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TimerIcon color="action" />
                <Typography variant="body2">
                  Duration: {quiz.duration} minutes
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <GroupIcon color="action" />
                <Typography variant="body2">
                  Total Participants: {stats.totalParticipants}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AssessmentIcon color="action" />
                <Typography variant="body2">
                  Pass Rate: {((stats.passCount / stats.totalParticipants) * 100).toFixed(1)}%
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Stack direction="row" spacing={1} alignItems="center">
                <SchoolIcon color="action" />
                <Typography variant="body2">
                  Average Score: {stats.averageScore.toFixed(1)}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Year</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Time Taken</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((result) => (
                <TableRow key={result._id}>
                  <TableCell>{result.student?.name || 'N/A'}</TableCell>
                  <TableCell>{result.student?.department || 'N/A'}</TableCell>
                  <TableCell>{result.student?.year || 'N/A'}</TableCell>
                  <TableCell>{result.score}</TableCell>
                  <TableCell>{result.timeTaken} minutes</TableCell>
                  <TableCell>
                    <Chip
                      label={result.score >= (quiz.passingMarks || 0) ? 'Pass' : 'Fail'}
                      color={result.score >= (quiz.passingMarks || 0) ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={results.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Container>
  );
};

export default EventQuizResults; 