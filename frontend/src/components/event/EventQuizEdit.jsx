import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  IconButton,
  Stack,
  Switch,
  Radio,
  RadioGroup
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import api from '../../config/axios';

// Constants for dropdown options (fallback values)
const DEPARTMENTS = [
  'All Departments',
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Information Technology',
  'Artificial Intelligence and Machine Learning',
  'Data Science',
  'Internet of Things',
  'Cyber Security',
  'Robotics and Automation'
];

const YEARS = ['All Years', '1', '2', '3', '4'];
const SEMESTERS = ['All Semesters', '1', '2'];

const EventQuizEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Function to determine the correct back navigation path
  const getBackPath = () => {
    const currentPath = location.pathname;
    console.log('EventQuizEdit - Current path:', currentPath);

    // If accessed from admin routes, go back to admin quizzes
    if (currentPath.includes('/admin/')) {
      return '/admin/quizzes';
    }
    // Default to event quizzes page
    return '/event/quizzes';
  };

  const handleBackNavigation = () => {
    const backPath = getBackPath();
    console.log('EventQuizEdit - Navigating back to:', backPath);
    navigate(backPath);
  };
  const [academicStructure, setAcademicStructure] = useState({
    departments: DEPARTMENTS,
    years: YEARS,
    semesters: SEMESTERS
  });
  const [academicDetails, setAcademicDetails] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    startTime: new Date(),
    endTime: new Date(),
    participantTypes: ['college'],
    departments: ['all'],
    years: ['all'],
    semesters: ['all'],
    maxParticipants: 0,
    passingMarks: 0,
    registrationEnabled: true,
    spotRegistrationEnabled: false,
    participationMode: 'individual',
    teamSize: 2,
    questions: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch academic details
        const academicResponse = await api.get('/api/academic-details');
        if (academicResponse && Array.isArray(academicResponse)) {
          // Extract unique departments, years, and semesters
          const departments = [...new Set(academicResponse.map(detail => detail.department))].filter(Boolean);
          const years = [...new Set(academicResponse.map(detail => detail.year))].filter(Boolean).sort((a, b) => a - b);
          const semesters = [...new Set(academicResponse.map(detail => detail.semester))].filter(Boolean).sort((a, b) => a - b);
          
          setAcademicStructure({
            departments: ['All Departments', ...departments],
            years: ['All Years', ...years.map(String)],
            semesters: ['All Semesters', ...semesters.map(String)]
          });
          setAcademicDetails(academicResponse);
        }

        // Fetch quiz data
        const quizResponse = await api.get(`/api/event-quiz/${id}`);
        setFormData({
          title: quizResponse.title || '',
          description: quizResponse.description || '',
          duration: quizResponse.duration || 30,
          startTime: quizResponse.startTime ? new Date(quizResponse.startTime) : new Date(),
          endTime: quizResponse.endTime ? new Date(quizResponse.endTime) : new Date(),
          participantTypes: quizResponse.participantTypes || ['college'],
          departments: quizResponse.departments || ['all'],
          years: quizResponse.years || ['all'],
          semesters: quizResponse.semesters || ['all'],
          maxParticipants: quizResponse.maxParticipants || 0,
          passingMarks: quizResponse.passingMarks || 0,
          registrationEnabled: quizResponse.registrationEnabled !== undefined ? quizResponse.registrationEnabled : true,
          spotRegistrationEnabled: quizResponse.spotRegistrationEnabled !== undefined ? quizResponse.spotRegistrationEnabled : false,
          participationMode: quizResponse.participationMode || 'individual',
          teamSize: quizResponse.teamSize || 2,
          questions: quizResponse.questions || []
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.response?.data?.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Get unique departments from academic structure
  const getDepartments = () => {
    if (!academicStructure?.departments?.length) {
      return ['all'];
    }
    return ['all', ...academicStructure.departments];
  };

  // Get unique years for selected department
  const getYears = () => {
    const selectedDept = formData.departments[0];
    
    if (selectedDept === 'all' || !academicStructure?.years?.length) {
      return ['all'];
    }

    // Get years configured for the selected department
    const departmentDetails = academicDetails.filter(detail => detail.department === selectedDept);
    const availableYears = [...new Set(departmentDetails.map(detail => detail.year))]
      .sort((a, b) => a - b);

    return ['all', ...availableYears.map(String)];
  };

  // Get unique semesters based on selected department and year
  const getSemesters = () => {
    const selectedDept = formData.departments[0];
    const selectedYear = formData.years[0];
    
    if (selectedDept === 'all' || selectedYear === 'all') {
      return ['all'];
    }

    // Get semesters configured for the selected department and year
    const departmentYearDetails = academicDetails.filter(detail => 
      detail.department === selectedDept && 
      detail.year === Number(selectedYear)
    );
    
    const availableSemesters = [...new Set(departmentYearDetails.map(detail => detail.semester))]
      .sort((a, b) => a - b);

    return ['all', ...availableSemesters.map(String)];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMultiSelectChange = (e) => {
    const { name, value } = e.target;
    
    // Handle 'All' selections
    let newValue;
    if (name === 'departments' && value.includes('All Departments')) {
      newValue = ['all'];
    } else if (name === 'years' && value.includes('All Years')) {
      newValue = ['all'];
    } else if (name === 'semesters' && value.includes('All Semesters')) {
      newValue = ['all'];
    } else {
      newValue = value;
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setFormData(prev => {
      const newQuestions = [...prev.questions];
      newQuestions[index] = {
        ...newQuestions[index],
        [field]: value
      };
      return {
        ...prev,
        questions: newQuestions
      };
    });
  };

  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          marks: 1
        }
      ]
    }));
  };

  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      setLoading(true);
      await api.put(`/api/event-quiz/${id}`, formData);
      setSuccess('Quiz updated successfully');
      setTimeout(() => handleBackNavigation(), 1500);
    } catch (error) {
      console.error('Error updating quiz:', error);
      setError(error.response?.data?.message || 'Failed to update quiz');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Edit Event Quiz
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Quiz Title"
                name="title"
                value={formData.title}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="Duration (minutes)"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Participants (0 for unlimited)"
                name="maxParticipants"
                value={formData.maxParticipants}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="Start Time"
                  value={formData.startTime}
                  onChange={(value) => handleDateChange('startTime', value)}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DateTimePicker
                  label="End Time"
                  value={formData.endTime}
                  onChange={(value) => handleDateChange('endTime', value)}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Participant Types</InputLabel>
                <Select
                  multiple
                  name="participantTypes"
                  value={formData.participantTypes || []}
                  onChange={handleMultiSelectChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip
                          key={value}
                          label={value === 'college' ? 'College Students' : 'External Students'}
                        />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="college">College Students</MenuItem>
                  <MenuItem value="external">External Students</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Registration Settings */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Registration Settings
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.registrationEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, registrationEnabled: e.target.checked }))}
                    name="registrationEnabled"
                  />
                }
                label="Enable Registration"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.spotRegistrationEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, spotRegistrationEnabled: e.target.checked }))}
                    name="spotRegistrationEnabled"
                  />
                }
                label="Enable Spot Registration"
              />
            </Grid>

            {/* Participation Mode Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                Participation Mode
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={formData.participationMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, participationMode: e.target.value }))}
                >
                  <FormControlLabel
                    value="individual"
                    control={<Radio />}
                    label="Individual"
                  />
                  <FormControlLabel
                    value="team"
                    control={<Radio />}
                    label="Team"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>

            {/* Team Size - Only shown if team mode is selected */}
            {formData.participationMode === 'team' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Team Size"
                  name="teamSize"
                  type="number"
                  value={formData.teamSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamSize: parseInt(e.target.value) }))}
                  inputProps={{ min: 2, max: 10 }}
                  helperText="Number of members per team (2-10)"
                  required
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="Passing Marks"
                name="passingMarks"
                value={formData.passingMarks}
                onChange={handleChange}
                inputProps={{ min: 0 }}
              />
            </Grid>

            {formData.participantTypes?.includes('college') && (
              <>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Departments</InputLabel>
                    <Select
                      multiple
                      name="departments"
                      value={formData.departments || []}
                      onChange={handleMultiSelectChange}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip 
                              key={value} 
                              label={value === 'all' ? 'All Departments' : value} 
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {getDepartments().map((dept) => (
                        <MenuItem 
                          key={dept} 
                          value={dept === 'All Departments' ? 'all' : dept}
                        >
                          {dept}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Years</InputLabel>
                    <Select
                      multiple
                      name="years"
                      value={formData.years || []}
                      onChange={handleMultiSelectChange}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip 
                              key={value} 
                              label={value === 'all' ? 'All Years' : `Year ${value}`} 
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {getYears().map((year) => (
                        <MenuItem 
                          key={year} 
                          value={year === 'All Years' ? 'all' : year}
                        >
                          {year === 'All Years' ? year : `Year ${year}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Semesters</InputLabel>
                    <Select
                      multiple
                      name="semesters"
                      value={formData.semesters || []}
                      onChange={handleMultiSelectChange}
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((value) => (
                            <Chip 
                              key={value} 
                              label={value === 'all' ? 'All Semesters' : `Semester ${value}`} 
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {getSemesters().map((sem) => (
                        <MenuItem 
                          key={sem} 
                          value={sem === 'All Semesters' ? 'all' : sem}
                        >
                          {sem === 'All Semesters' ? sem : `Semester ${sem}`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Questions</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={addQuestion}
                  variant="contained"
                  color="primary"
                >
                  Add Question
                </Button>
              </Box>

              {(formData.questions || []).map((question, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="subtitle1">Question {index + 1}</Typography>
                      <IconButton 
                        color="error" 
                        onClick={() => removeQuestion(index)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <TextField
                      required
                      fullWidth
                      multiline
                      rows={2}
                      label="Question Text"
                      value={question.question || ''}
                      onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                    />

                    {(question.options || []).map((option, optionIndex) => (
                      <Box key={optionIndex} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={question.correctAnswer === optionIndex}
                              onChange={() => handleQuestionChange(index, 'correctAnswer', optionIndex)}
                            />
                          }
                          label={`Option ${optionIndex + 1}`}
                        />
                        <TextField
                          required
                          fullWidth
                          value={option || ''}
                          onChange={(e) => {
                            const newOptions = [...(question.options || [])];
                            newOptions[optionIndex] = e.target.value;
                            handleQuestionChange(index, 'options', newOptions);
                          }}
                        />
                      </Box>
                    ))}

                    <TextField
                      required
                      label="Marks"
                      type="number"
                      value={question.marks || 1}
                      onChange={(e) => handleQuestionChange(index, 'marks', parseInt(e.target.value))}
                      inputProps={{ min: 1 }}
                      sx={{ width: 100 }}
                    />
                  </Stack>
                </Paper>
              ))}
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={handleBackNavigation}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default EventQuizEdit; 