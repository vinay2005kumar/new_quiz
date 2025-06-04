import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  Grid,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  ListItemText,
  OutlinedInput,
  FormGroup
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';
import ManualQuizForm from '../quiz/quiz-forms/ManualQuizForm';
import ExcelQuizForm from '../quiz/quiz-forms/ExcelQuizForm';
import WordQuizForm from '../quiz/quiz-forms/WordQuizForm';
import ImageQuizForm from '../quiz/quiz-forms/ImageQuizForm';

const EventQuizCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [inputMethod, setInputMethod] = useState(0);
  const [academicStructure, setAcademicStructure] = useState({
    departments: [],
    years: [],
    semesters: []
  });
  const [academicDetails, setAcademicDetails] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    startTime: null,
    endTime: null,
    duration: 30,
    participantTypes: ['college'],
    maxParticipants: 0,
    passingMarks: 0,
    registrationEnabled: true,
    spotRegistrationEnabled: false,
    questions: [],
    departments: ['all'],
    years: ['all'],
    semesters: ['all']
  });

  const steps = ['Basic Details', 'Questions', 'Review'];

  // Fetch academic structure on component mount
  useEffect(() => {
    const fetchAcademicStructure = async () => {
      try {
        setLoading(true);
        console.log('Fetching academic structure...');
        const response = await api.get('/api/academic-details');
        console.log('Academic structure response:', response);
        
        if (response && Array.isArray(response)) {
          // Extract unique departments, years, and semesters
          const departments = [...new Set(response.map(detail => detail.department))].filter(Boolean);
          const years = [...new Set(response.map(detail => detail.year))].filter(Boolean).sort((a, b) => a - b);
          const semesters = [...new Set(response.map(detail => detail.semester))].filter(Boolean).sort((a, b) => a - b);
          
          setAcademicStructure({
            departments: ['all', ...departments],
            years: ['all', ...years.map(String)],
            semesters: ['all', ...semesters.map(String)]
          });
          setAcademicDetails(response);
          console.log('Updated academic structure:', { departments, years, semesters });
        } else {
          console.warn('Using default academic structure');
          setAcademicStructure({
            departments: ['all'],
            years: ['all'],
            semesters: ['all']
          });
        }
      } catch (error) {
        console.error('Error fetching academic structure:', error);
        setAcademicStructure({
          departments: ['all'],
          years: ['all'],
          semesters: ['all']
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAcademicStructure();
  }, []);

  const handleEligibilityChange = (field, value) => {
    console.log('Handling eligibility change:', field, value);
    
    let newValue;

    // If selecting individual values while 'all' is selected
    if (formData[field].includes('all') && value.length > 1) {
      newValue = value.filter(v => v !== 'all');
    }
    // If deselecting all individual values
    else if (value.length === 0) {
      newValue = ['all'];
    }
    // Otherwise keep the selection as is
    else {
      newValue = value;
    }

    setFormData(prev => ({
      ...prev,
      [field]: newValue
    }));

    // Reset dependent fields when changing selection
    if (field === 'departments' && !newValue.includes('all')) {
      setFormData(prev => ({
        ...prev,
        [field]: newValue,
        years: ['all'],
        semesters: ['all']
      }));
    } else if (field === 'years' && !newValue.includes('all')) {
      setFormData(prev => ({
        ...prev,
        [field]: newValue,
        semesters: ['all']
      }));
    }
  };

  // Get unique departments from academic structure
  const getDepartments = () => {
    return academicStructure?.departments || ['all'];
  };

  // Get unique years for selected department
  const getYears = () => {
    if (!academicStructure?.years?.length) {
      return ['all'];
    }
    return academicStructure.years;
  };

  // Get unique semesters based on selected department and year
  const getSemesters = () => {
    if (!academicStructure?.semesters?.length) {
      return ['all'];
    }
    return academicStructure.semesters;
  };

  const handleInputMethodChange = (event, newValue) => {
    setInputMethod(newValue);
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleParticipantTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      participantTypes: prev.participantTypes.includes(type)
        ? prev.participantTypes.filter(t => t !== type)
        : [...prev.participantTypes, type]
    }));
  };

  const renderBasicDetails = () => (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Quiz Title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            multiline
            rows={3}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Instructions"
            name="instructions"
            value={formData.instructions}
            onChange={handleInputChange}
            multiline
            rows={4}
            helperText="Add any specific instructions for participants (optional)"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Duration (minutes)"
            name="duration"
            type="number"
            value={formData.duration}
            onChange={handleInputChange}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Maximum Participants"
            name="maxParticipants"
            type="number"
            value={formData.maxParticipants}
            onChange={handleInputChange}
            helperText="0 for unlimited"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <DateTimePicker
            label="Start Time"
            value={formData.startTime}
            onChange={(value) => handleDateChange('startTime', value)}
            renderInput={(params) => <TextField {...params} fullWidth required />}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <DateTimePicker
            label="End Time"
            value={formData.endTime}
            onChange={(value) => handleDateChange('endTime', value)}
            renderInput={(params) => <TextField {...params} fullWidth required />}
          />
        </Grid>

        {/* Participant Type Selection */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Participant Types
          </Typography>
          <FormGroup row>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.participantTypes.includes('college')}
                  onChange={() => handleParticipantTypeChange('college')}
                />
              }
              label="College Students"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.participantTypes.includes('external')}
                  onChange={() => handleParticipantTypeChange('external')}
                />
              }
              label="External Students"
            />
          </FormGroup>
        </Grid>

        {/* Eligibility Criteria - Only shown if college students are selected */}
        {formData.participantTypes.includes('college') && (
          <>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Departments</InputLabel>
                <Select
                  multiple
                  value={formData.departments}
                  onChange={(e) => handleEligibilityChange('departments', e.target.value)}
                  input={<OutlinedInput label="Departments" />}
                  renderValue={(selected) => {
                    if (selected.includes('all')) return 'All Departments';
                    return selected.join(', ');
                  }}
                >
                  {getDepartments().map((dept) => (
                    <MenuItem key={dept} value={dept}>
                      <Checkbox checked={formData.departments.includes(dept)} />
                      <ListItemText primary={dept === 'all' ? 'All Departments' : dept} />
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
                  value={formData.years}
                  onChange={(e) => handleEligibilityChange('years', e.target.value)}
                  input={<OutlinedInput label="Years" />}
                  renderValue={(selected) => {
                    if (selected.includes('all')) return 'All Years';
                    return selected.map(year => `Year ${year}`).join(', ');
                  }}
                >
                  {getYears().map((year) => (
                    <MenuItem key={year} value={year}>
                      <Checkbox checked={formData.years.includes(year)} />
                      <ListItemText primary={year === 'all' ? 'All Years' : `Year ${year}`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Semesters</InputLabel>
                <Select
                  multiple
                  value={formData.semesters}
                  onChange={(e) => handleEligibilityChange('semesters', e.target.value)}
                  input={<OutlinedInput label="Semesters" />}
                  renderValue={(selected) => {
                    if (selected.includes('all')) return 'All Semesters';
                    return selected.map(sem => `Semester ${sem}`).join(', ');
                  }}
                >
                  {getSemesters().map((sem) => (
                    <MenuItem key={sem} value={sem}>
                      <Checkbox checked={formData.semesters.includes(sem)} />
                      <ListItemText primary={sem === 'all' ? 'All Semesters' : `Semester ${sem}`} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.registrationEnabled}
                onChange={(e) => handleInputChange({
                  target: { name: 'registrationEnabled', value: e.target.checked }
                })}
                name="registrationEnabled"
              />
            }
            label="Enable Registration"
          />
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.spotRegistrationEnabled}
                onChange={(e) => handleInputChange({
                  target: { name: 'spotRegistrationEnabled', value: e.target.checked }
                })}
                name="spotRegistrationEnabled"
              />
            }
            label="Enable Spot Registration"
          />
        </Grid>
      </Grid>
    </LocalizationProvider>
  );

  const renderQuestionInput = () => (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={inputMethod}
          onChange={handleInputMethodChange}
          variant="fullWidth"
          aria-label="quiz creation method tabs"
        >
          <Tab label="Manual Entry" />
          <Tab label="Excel Upload" />
          <Tab label="Word Upload" />
          <Tab label="Image Upload" />
        </Tabs>
      </Box>

      {inputMethod === 0 && (
        <ManualQuizForm
          questions={formData.questions}
          onQuestionsUpdate={(questions) => setFormData(prev => ({ ...prev, questions }))}
          error={error}
          setError={setError}
        />
      )}
      {inputMethod === 1 && (
        <ExcelQuizForm
          onNext={handleNext}
          error={error}
          setError={setError}
          formData={formData}
          setFormData={setFormData}
        />
      )}
      {inputMethod === 2 && (
        <WordQuizForm
          onNext={handleNext}
          error={error}
          setError={setError}
          formData={formData}
          setFormData={setFormData}
        />
      )}
      {inputMethod === 3 && (
        <ImageQuizForm
          onNext={handleNext}
          error={error}
          setError={setError}
          formData={formData}
          setFormData={setFormData}
        />
      )}
    </Box>
  );

  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Review Quiz Details</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Basic Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography><strong>Title:</strong> {formData.title}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography><strong>Description:</strong> {formData.description}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography><strong>Duration:</strong> {formData.duration} minutes</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography><strong>Start Time:</strong> {formData.startTime ? new Date(formData.startTime).toLocaleString() : 'Not set'}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography><strong>End Time:</strong> {formData.endTime ? new Date(formData.endTime).toLocaleString() : 'Not set'}</Typography>
              </Grid>
              {formData.participantTypes.includes('college') && (
                <>
                  <Grid item xs={12}>
                    <Typography><strong>Departments:</strong> {formData.departments.includes('all') ? 'All Departments' : formData.departments.join(', ')}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Years:</strong> {formData.years.includes('all') ? 'All Years' : formData.years.join(', ')}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography><strong>Semesters:</strong> {formData.semesters.includes('all') ? 'All Semesters' : formData.semesters.join(', ')}</Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Questions ({formData.questions.length})</Typography>
            {formData.questions.map((question, index) => (
              <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  <strong>Question {index + 1}:</strong> {question.question}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>Options:</Typography>
                <ol type="A">
                  {question.options.map((option, optIndex) => (
                    <li key={optIndex}>
                      <Typography 
                        sx={{ 
                          color: optIndex === question.correctAnswer ? 'success.main' : 'inherit',
                          fontWeight: optIndex === question.correctAnswer ? 'bold' : 'normal'
                        }}
                      >
                        {option} {optIndex === question.correctAnswer && '(Correct)'}
                      </Typography>
                    </li>
                  ))}
                </ol>
                <Typography><strong>Marks:</strong> {question.marks}</Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Validate required fields
      if (!formData.title) throw new Error('Title is required');
      if (!formData.startTime) throw new Error('Start time is required');
      if (!formData.endTime) throw new Error('End time is required');
      if (!formData.duration || formData.duration < 1) throw new Error('Valid duration is required');
      if (!formData.questions || formData.questions.length === 0) throw new Error('At least one question is required');

      const quizData = {
        ...formData,
        type: 'event',
        status: 'upcoming',
        createdBy: user._id,
        totalMarks: formData.questions.reduce((sum, q) => sum + (q.marks || 1), 0)
      };

      const response = await api.post('/api/event-quiz', quizData);
      console.log('Quiz created successfully:', response);
      navigate('/event/quizzes');
    } catch (error) {
      console.error('Error creating event quiz:', error);
      setError(error.response?.data?.message || error.message || 'Failed to create event quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Create Event Quiz
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ width: '100%', mb: 3 }}>
          <Stepper activeStep={activeStep}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <form onSubmit={handleSubmit}>
          {activeStep === 0 && renderBasicDetails()}
          {activeStep === 1 && renderQuestionInput()}
          {activeStep === 2 && renderReview()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              disabled={loading}
            >
              {activeStep === steps.length - 1 ? (
                loading ? <CircularProgress size={24} /> : 'Create Quiz'
              ) : (
                'Next'
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};

export default EventQuizCreate; 