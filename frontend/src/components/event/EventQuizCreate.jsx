import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  FormGroup,
  Radio,
  RadioGroup,
  FormHelperText,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, } from '@mui/icons-material'
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
  const location = useLocation();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

  // New state for pre-filled students
  const [prefilledStudents, setPrefilledStudents] = useState([]);
  const [isRegistrationDisabled, setIsRegistrationDisabled] = useState(false);
  const [sourceQuizTitle, setSourceQuizTitle] = useState('');

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
    negativeMarkingEnabled: false,
    securitySettings: {
      enableFullscreen: false,
      disableRightClick: false,
      disableCopyPaste: false,
      disableTabSwitch: false,
      enableProctoringMode: false
    },
    participationMode: 'individual', // 'individual' or 'team'
    teamSize: 2,
    questionDisplayMode: 'one-by-one', // 'one-by-one' or 'all-at-once'
    emailInstructions: 'Please login with the provided credentials 10-15 minutes before the quiz starts. Ensure you have a stable internet connection.',
    questions: [],
    departments: ['all'],
    years: ['all'],
    semesters: ['all']
  });

  const steps = ['Basic Details', 'Questions', 'Review'];

  // Handle query parameters for pre-filled students
  useEffect(() => {
    console.log('🔍 Checking query parameters...');
    console.log('Current location search:', location.search);

    const searchParams = new URLSearchParams(location.search);
    const prefilledStudentsParam = searchParams.get('prefilledStudents');
    const disableRegistrationParam = searchParams.get('disableRegistration');
    const sourceQuizParam = searchParams.get('sourceQuiz');

    console.log('Query params:', {
      prefilledStudentsParam,
      disableRegistrationParam,
      sourceQuizParam
    });

    if (prefilledStudentsParam) {
      try {
        const studentEmails = JSON.parse(prefilledStudentsParam);
        setPrefilledStudents(studentEmails);
        console.log('✅ Pre-filled students loaded:', studentEmails.length, 'students');
        console.log('Student emails:', studentEmails);
      } catch (error) {
        console.error('❌ Error parsing pre-filled students:', error);
      }
    }

    if (disableRegistrationParam === 'true') {
      console.log('🔒 Registration disabled for pre-selected students');
      setIsRegistrationDisabled(true);
      setFormData(prev => ({
        ...prev,
        registrationEnabled: false,
        spotRegistrationEnabled: false
      }));
    }

    if (sourceQuizParam) {
      console.log('📚 Source quiz:', sourceQuizParam);
      setSourceQuizTitle(sourceQuizParam);
      setFormData(prev => ({
        ...prev,
        title: `Follow-up Quiz - ${sourceQuizParam}`,
        description: `This quiz is created for selected students from "${sourceQuizParam}"`
      }));
    }
  }, [location.search]);

  // Fetch academic structure on component mount
  useEffect(() => {
    const fetchAcademicStructure = async () => {
      try {
        setLoading(true);
        console.log('Fetching academic structure...');

        // Fetch departments from college settings (now public)
        const deptResponse = await api.get('/api/admin/settings/departments');
        let departments = [];
        if (deptResponse && deptResponse.departments && Array.isArray(deptResponse.departments)) {
          departments = deptResponse.departments.map(dept => dept.name);
        }

        // Fetch academic details for years and semesters
        const response = await api.get('/api/academic-details');
        console.log('Academic structure response:', response);

        if (response && Array.isArray(response)) {
          // Extract unique departments from academic details as fallback
          const academicDepartments = [...new Set(response.map(detail => detail.department))].filter(Boolean);
          const years = [...new Set(response.map(detail => detail.year))].filter(Boolean).sort((a, b) => a - b);
          const semesters = [...new Set(response.map(detail => detail.semester))].filter(Boolean).sort((a, b) => a - b);

          // Use departments from college settings, fallback to academic details
          const finalDepartments = departments.length > 0 ? departments : academicDepartments;

          setAcademicStructure({
            departments: ['all', ...finalDepartments],
            years: ['all', ...years.map(String)],
            semesters: ['all', ...semesters.map(String)]
          });
          setAcademicDetails(response);
          console.log('Updated academic structure:', { departments: finalDepartments, years, semesters });
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
        {/* Basic Information Card */}
        <Grid item xs={12}>
          <Card sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              📝 Basic Information
            </Typography>
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

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Instructions"
                  name="emailInstructions"
                  value={formData.emailInstructions}
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  helperText="Special instructions to be included in the registration confirmation email"
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Timing & Limits Card */}
        <Grid item xs={12}>
          <Card sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              ⏰ Timing & Limits
            </Typography>
            <Grid container spacing={3}>
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
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      required
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
                        }
                      }}
                    />
                  )}
                  PopperProps={{
                    sx: {
                      '& .MuiPaper-root': {
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2d2d2d !important' : '#ffffff !important',
                        color: (theme) => theme.palette.mode === 'dark' ? '#ffffff !important' : '#000000 !important',
                        '& .MuiPickersDay-root': {
                          color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          '&:hover': {
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                          }
                        },
                        '& .MuiPickersCalendarHeader-root': {
                          color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#000000'
                        }
                      }
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="End Time"
                  value={formData.endTime}
                  onChange={(value) => handleDateChange('endTime', value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      required
                      sx={{
                        '& .MuiInputBase-root': {
                          backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'transparent'
                        }
                      }}
                    />
                  )}
                  PopperProps={{
                    sx: {
                      '& .MuiPaper-root': {
                        backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#2d2d2d !important' : '#ffffff !important',
                        color: (theme) => theme.palette.mode === 'dark' ? '#ffffff !important' : '#000000 !important',
                        '& .MuiPickersDay-root': {
                          color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          '&:hover': {
                            backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                          }
                        },
                        '& .MuiPickersCalendarHeader-root': {
                          color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#000000'
                        }
                      }
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Participant Eligibility Card */}
        <Grid item xs={12}>
          <Card sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              👥 Participant Eligibility
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
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
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      College Student Criteria
                    </Typography>
                  </Grid>
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
            </Grid>
          </Card>
        </Grid>

        {/* Show alert if this is a follow-up quiz */}
        {sourceQuizTitle && (
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Follow-up Quiz:</strong> This quiz is being created for {prefilledStudents.length} selected students from "{sourceQuizTitle}".
                Registration is automatically disabled since students are pre-selected.
              </Typography>
            </Alert>
          </Grid>
        )}

        {/* Show pre-filled students list */}
        {prefilledStudents.length > 0 && (
          <Grid item xs={12}>
            <Card sx={{ bgcolor: 'background.default', border: '1px solid', borderColor: 'primary.main' }}>
              <CardContent>
                <Typography variant="h6" color="primary" gutterBottom>
                  📋 Pre-selected Students ({prefilledStudents.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  This quiz will be available only to the following students:
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                  {prefilledStudents.map((email, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                      {index + 1}. {email}
                    </Typography>
                  ))}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  💡 These students will receive login credentials via email after quiz creation
                </Typography>
              </CardContent>
            </Card>
          </Grid>
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
                disabled={isRegistrationDisabled}
              />
            }
            label="Enable Registration"
          />
          {isRegistrationDisabled && (
            <FormHelperText>Registration is disabled for this quiz as students are pre-selected</FormHelperText>
          )}
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
                disabled={isRegistrationDisabled}
              />
            }
            label="Enable Spot Registration"
          />
          {isRegistrationDisabled && (
            <FormHelperText>Spot registration is disabled for this quiz as students are pre-selected</FormHelperText>
          )}
        </Grid>

        {/* Negative Marking Section */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
            Negative Marking Settings
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.negativeMarkingEnabled || false}
                  onChange={(e) => handleInputChange({
                    target: { name: 'negativeMarkingEnabled', value: e.target.checked }
                  })}
                  name="negativeMarkingEnabled"
                />
              }
              label="Enable Negative Marking"
            />
          </FormGroup>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            💡 This setting indicates whether negative marking is allowed in this quiz. Individual negative marks will be set per question.
          </Typography>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            🔒 Security Settings
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.securitySettings?.enableFullscreen || false}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'securitySettings',
                      value: {
                        ...formData.securitySettings,
                        enableFullscreen: e.target.checked
                      }
                    }
                  })}
                  name="enableFullscreen"
                />
              }
              label="Enable Fullscreen Mode"
            />
            <Typography variant="caption" color="text.secondary">
              Forces quiz to open in fullscreen mode and prevents exiting
            </Typography>
          </FormGroup>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.securitySettings?.disableRightClick || false}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'securitySettings',
                      value: {
                        ...formData.securitySettings,
                        disableRightClick: e.target.checked
                      }
                    }
                  })}
                  name="disableRightClick"
                />
              }
              label="Disable Right Click"
            />
            <Typography variant="caption" color="text.secondary">
              Prevents right-click context menu during quiz
            </Typography>
          </FormGroup>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.securitySettings?.disableCopyPaste || false}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'securitySettings',
                      value: {
                        ...formData.securitySettings,
                        disableCopyPaste: e.target.checked
                      }
                    }
                  })}
                  name="disableCopyPaste"
                />
              }
              label="Disable Copy/Paste"
            />
            <Typography variant="caption" color="text.secondary">
              Prevents copying and pasting during quiz
            </Typography>
          </FormGroup>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.securitySettings?.disableTabSwitch || false}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'securitySettings',
                      value: {
                        ...formData.securitySettings,
                        disableTabSwitch: e.target.checked
                      }
                    }
                  })}
                  name="disableTabSwitch"
                />
              }
              label="Disable Tab Switching"
            />
            <Typography variant="caption" color="text.secondary">
              Warns when user tries to switch tabs or windows
            </Typography>
          </FormGroup>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.securitySettings?.enableProctoringMode || false}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'securitySettings',
                      value: {
                        ...formData.securitySettings,
                        enableProctoringMode: e.target.checked
                      }
                    }
                  })}
                  name="enableProctoringMode"
                />
              }
              label="Enable Proctoring Mode"
            />
            <Typography variant="caption" color="text.secondary">
              Enables all security features and monitors user activity
            </Typography>
          </FormGroup>

          {/* Shuffle Questions Setting */}
          <FormGroup sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.shuffleQuestions || false}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'shuffleQuestions',
                      value: e.target.checked
                    }
                  })}
                  name="shuffleQuestions"
                />
              }
              label="🔀 Shuffle Questions"
            />
            <Typography variant="caption" color="text.secondary">
              Each participant will receive questions in a different random order
            </Typography>
          </FormGroup>
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
              onChange={(e) => handleInputChange({
                target: { name: 'participationMode', value: e.target.value }
              })}
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
              onChange={handleInputChange}
              inputProps={{ min: 2, max: 10 }}
              helperText="Number of members per team (2-10)"
              required
            />
          </Grid>
        )}

        {/* Question Display Mode */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Question Display Mode</InputLabel>
            <Select
              name="questionDisplayMode"
              value={formData.questionDisplayMode}
              onChange={handleInputChange}
              label="Question Display Mode"
            >
              <MenuItem value="one-by-one">
                <Box>
                  <Typography variant="body1">One by One</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Show questions one at a time with navigation
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem value="all-at-once">
                <Box>
                  <Typography variant="body1">All at Once</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Show all questions vertically on one page
                  </Typography>
                </Box>
              </MenuItem>
            </Select>
            <FormHelperText>
              Choose how questions will be displayed to participants
            </FormHelperText>
          </FormControl>
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
          negativeMarkingEnabled={formData.negativeMarkingEnabled}
        />
      )}
      {inputMethod === 1 && (
        <ExcelQuizForm
          onNext={handleNext}
          error={error}
          setError={setError}
          formData={formData}
          setFormData={setFormData}
          onQuestionsUpdate={(questions) => setFormData(prev => ({ ...prev, questions }))}
          isEventQuiz={true}
        />
      )}
      {inputMethod === 2 && (
        <WordQuizForm
          onNext={handleNext}
          error={error}
          setError={setError}
          formData={formData}
          setFormData={setFormData}
          onQuestionsUpdate={(questions) => setFormData(prev => ({ ...prev, questions }))}
          isEventQuiz={true}
        />
      )}
      {inputMethod === 3 && (
        <ImageQuizForm
          onNext={handleNext}
          error={error}
          setError={setError}
          formData={formData}
          setFormData={setFormData}
          onQuestionsUpdate={(questions) => setFormData(prev => ({ ...prev, questions }))}
          isEventQuiz={true}
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
              <Grid item xs={12}>
                <Typography><strong>Participation Mode:</strong> {formData.participationMode === 'team' ? `Team (${formData.teamSize} members)` : 'Individual'}</Typography>
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
                  <strong>Question {index + 1}:</strong>
                </Typography>
                {/* Question Text with UNIVERSAL Formatting Preservation */}
                <Box sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  overflow: 'auto',
                  '& pre': {
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                    padding: 0
                  }
                }}
                dangerouslySetInnerHTML={{ __html: question.question }}
                />
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
        totalMarks: formData.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
        // Include pre-filled students if available
        prefilledStudents: prefilledStudents.length > 0 ? prefilledStudents : undefined
      };

      console.log('Sending quiz data to backend:', quizData);
      console.log('participantTypes being sent:', quizData.participantTypes);
      console.log('prefilledStudents being sent:', quizData.prefilledStudents);

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
    <Container
      maxWidth="md"
      sx={{
        mt: { xs: 2, sm: 3, md: 4 },
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}
    >
      <Paper sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: isMobile ? 1 : 2
      }}>
        <Button
          startIcon={<ArrowBackIcon sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }} />}
          onClick={() => navigate(-1)}
          sx={{
            mb: { xs: 1.5, sm: 2 },
            fontSize: { xs: '0.875rem', sm: '1rem' },
            py: { xs: 0.75, sm: 1 }
          }}
        >
          Back
        </Button>
        <Typography
          variant={isMobile ? "h6" : "h5"}
          gutterBottom
          sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
        >
          Create Event Quiz
        </Typography>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: { xs: 1.5, sm: 2 },
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            {error}
          </Alert>
        )}

        <Box sx={{ width: '100%', mb: { xs: 2, sm: 3 } }}>
          <Stepper
            activeStep={activeStep}
            orientation={isMobile ? "vertical" : "horizontal"}
            sx={{
              '& .MuiStepLabel-label': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
          >
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