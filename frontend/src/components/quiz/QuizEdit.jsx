import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Card,
  CardContent,
  FormControlLabel,
  Radio,
  RadioGroup,
  OutlinedInput,
  Chip,
  Switch,
  FormGroup,
  Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CodeIcon from '@mui/icons-material/Code';
import FormatIndentIncreaseIcon from '@mui/icons-material/FormatIndentIncrease';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';
import AddQuestionModal from './AddQuestionModal';

const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
const YEARS = [1, 2, 3, 4];
const SEMESTERS = ['1', '2'];

// Universal Indentation Restoration Function (SAME AS MANUAL FORM)
const restoreIndentationForAllLanguages = (questionText) => {
  if (!questionText || typeof questionText !== 'string') return questionText;

  const lines = questionText.split('\n');
  const restoredLines = [];
  let currentIndentLevel = 0;
  let insideBraces = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      restoredLines.push('');
      continue;
    }

    // PYTHON - Function/class definitions stay at base level
    if (line.match(/^(def|class)\s+\w+/)) {
      currentIndentLevel = 0;
      restoredLines.push(line);
      if (line.endsWith(':')) {
        currentIndentLevel = 1;
      }
      continue;
    }

    // PYTHON - Control structures inside functions
    if (line.match(/^(if|elif|else|for|while|try|except|finally|with)\s/)) {
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      if (line.endsWith(':')) {
        currentIndentLevel++;
      }
      continue;
    }

    // PYTHON - Return statements (always inside functions)
    if (line.match(/^(return|break|continue|pass|raise)\s/)) {
      const indent = '    '.repeat(Math.max(currentIndentLevel, 1));
      restoredLines.push(indent + line);
      continue;
    }

    // PYTHON - Print statements - check if they're at base level or inside function
    if (line.match(/^print\s*\(/)) {
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
      if (!nextLine || nextLine.match(/^[A-D]\)/)) {
        restoredLines.push(line);
        currentIndentLevel = 0;
      } else {
        const indent = '    '.repeat(Math.max(currentIndentLevel, 1));
        restoredLines.push(indent + line);
      }
      continue;
    }

    // PYTHON - Import statements (always at base level)
    if (line.match(/^(import|from)\s/)) {
      restoredLines.push(line);
      currentIndentLevel = 0;
      continue;
    }

    // PYTHON - Variable assignments and function calls
    if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*[=+\-*\/]/) ||
        line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\(/)) {
      if (currentIndentLevel > 0) {
        const indent = '    '.repeat(currentIndentLevel);
        restoredLines.push(indent + line);
      } else {
        restoredLines.push(line);
      }
      continue;
    }

    // C/C++/JAVA/JAVASCRIPT - Function definitions and control structures
    if (line.match(/^(public|private|protected|static|void|int|float|double|char|string|bool|function|var|let|const)\s/) ||
        line.match(/^(if|else|for|while|do|switch|case|default|try|catch|finally)\s*\(/) ||
        line.match(/^\w+\s+\w+\s*\(/)) {
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      if (line.includes('{')) {
        currentIndentLevel++;
        insideBraces++;
      }
      continue;
    }

    // Handle closing braces
    if (line.includes('}')) {
      currentIndentLevel = Math.max(0, currentIndentLevel - 1);
      insideBraces = Math.max(0, insideBraces - 1);
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      continue;
    }

    // Handle opening braces on separate lines
    if (line === '{') {
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      currentIndentLevel++;
      insideBraces++;
      continue;
    }

    // C/C++/JAVA/JAVASCRIPT - Regular statements inside blocks
    if (line.match(/.*;$/) || line.match(/^\/\//)) {
      const indent = '    '.repeat(Math.max(currentIndentLevel, insideBraces > 0 ? 1 : 0));
      restoredLines.push(indent + line);
      continue;
    }

    // HTML/XML - Tags
    if (line.match(/^<\w+/) || line.match(/^<\/\w+/)) {
      const indent = '    '.repeat(currentIndentLevel);
      restoredLines.push(indent + line);
      continue;
    }

    // Default: apply current indentation if we're inside any block
    if (currentIndentLevel > 0 || insideBraces > 0) {
      const indent = '    '.repeat(Math.max(currentIndentLevel, insideBraces > 0 ? 1 : 0));
      restoredLines.push(indent + line);
    } else {
      restoredLines.push(line);
    }
  }

  return restoredLines.join('\n');
};

// Function to detect if text needs format preservation
const needsFormatPreservation = (text) => {
  if (!text) return false;
  return text.includes('def ') || text.includes('if ') || text.includes('for ') ||
         text.includes('while ') || text.includes('class ') || text.includes('function ') ||
         text.includes('{') || text.includes('}') || text.includes('<') || text.includes('>') ||
         text.includes('    ') || text.includes('\t') || text.includes('print(') ||
         text.includes('import ') || text.includes('from ') || text.includes('return ');
};

const QuizEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Function to determine the correct back navigation path
  const getBackPath = () => {
    const currentPath = location.pathname;
    console.log('Current path:', currentPath);
    console.log('User role:', user?.role);

    // If accessed from admin routes, go back to admin quizzes
    if (currentPath.includes('/admin/')) {
      return '/admin/quizzes';
    }
    // If accessed from faculty routes, go back to faculty quizzes
    else if (currentPath.includes('/faculty/')) {
      return '/faculty/quizzes';
    }
    // Default fallback based on user role
    else if (user?.role === 'admin') {
      return '/admin/quizzes';
    }
    else if (user?.role === 'faculty') {
      return '/faculty/quizzes';
    }
    // Final fallback
    return '/faculty/quizzes';
  };

  const handleBackNavigation = () => {
    const backPath = getBackPath();
    console.log('Navigating back to:', backPath);
    navigate(backPath);
  };
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [academicStructure, setAcademicStructure] = useState(null);
  const [filters, setFilters] = useState({
    year: '',
    department: '',
    semester: '',
    sections: []
  });

  const [quiz, setQuiz] = useState({
    title: '',
    subject: '',
    duration: 30,
    startTime: '',
    endTime: '',
    negativeMarkingEnabled: false,
    shuffleQuestions: false,
    securitySettings: {
      enableFullscreen: false,
      disableRightClick: false,
      disableCopyPaste: false,
      disableTabSwitch: false,
      enableProctoringMode: false
    },
    questions: [
      {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        marks: 1,
        negativeMarks: 0
      }
    ],
    allowedGroups: [],
    year: '',
    semester: '',
    department: ''
  });

  // Add Question Modal state
  const [addQuestionModalOpen, setAddQuestionModalOpen] = useState(false);

  // Fetch faculty structure on mount
  useEffect(() => {
    const fetchFacultyStructure = async () => {
      try {
        const response = await api.get('/api/academic-details/faculty-structure');
        console.log('Faculty structure:', response.data);
        setAcademicStructure(response.data || {});
        // Set available departments based on faculty permissions
        const facultyDepts = Object.keys(response.data || {});
        setDepartments(facultyDepts);
      } catch (error) {
        console.error('Error fetching faculty structure:', error);
      }
    };
    fetchFacultyStructure();
  }, []);

  // Update subjects from academic structure
  useEffect(() => {
    if (!quiz.department || !quiz.year || !quiz.semester || !academicStructure) {
      setSubjects([]);
      return;
    }

    try {
      const semesterData = academicStructure[quiz.department]?.years[quiz.year]?.semesters[quiz.semester];
      if (semesterData?.subjects && Array.isArray(semesterData.subjects)) {
        console.log('Setting subjects from academic structure:', semesterData.subjects);
        setSubjects(semesterData.subjects);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error getting subjects:', error);
      setSubjects([]);
    }
  }, [quiz.department, quiz.year, quiz.semester, academicStructure]);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      console.log('Fetching quiz with ID:', id);
      const response = await api.get(`/api/quiz/${id}`);
      console.log('Quiz data received:', response);
      
      // Helper function to safely format date
      const formatDate = (dateString) => {
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return '';
          return date.toISOString().slice(0, 16);
        } catch (error) {
          console.error('Error formatting date:', error);
          return '';
        }
      };

      // Get department, year, semester, and sections from allowedGroups
      const firstGroup = response.allowedGroups?.[0] || {};
      const sections = response.allowedGroups?.map(group => group.section) || [];

      // Format quiz data
      const formattedQuiz = {
        ...response,
        title: response.title || '',
        startTime: formatDate(response.startTime),
        endTime: formatDate(response.endTime),
        questions: response.questions?.length ? response.questions : [{
          question: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          marks: 1
        }],
        department: firstGroup.department || '',
        year: firstGroup.year || '',
        semester: firstGroup.semester || '',
        sections: sections,
        subject: response.subject?.code || response.subject || '',
        shuffleQuestions: response.shuffleQuestions || false,
        securitySettings: response.securitySettings || {
          enableFullscreen: false,
          disableRightClick: false,
          disableCopyPaste: false,
          disableTabSwitch: false,
          enableProctoringMode: false
        }
      };
      
      console.log('Formatted quiz data:', formattedQuiz);
      setQuiz(formattedQuiz);
      
      // Update filters with quiz data
      setFilters({
        department: firstGroup.department || '',
        year: firstGroup.year || '',
        semester: firstGroup.semester || '',
        sections: sections
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      setError('Failed to load quiz');
      setLoading(false);
    }
  };

  const handleBasicDetailsChange = (e) => {
    const { name, value } = e.target;

    if (name === 'subject') {
      // Find the full subject data
      const selectedSubject = subjects.find(s => s.code === value);
      if (selectedSubject) {
        setQuiz(prev => ({
          ...prev,
          subject: {
            code: selectedSubject.code,
            name: selectedSubject.name
          }
        }));
      }
    } else if (name === 'negativeMarkingEnabled') {
      // Handle negative marking toggle
      setQuiz(prev => {
        const updatedQuiz = {
          ...prev,
          [name]: value
        };

        // If disabling negative marking, set all negative marks to 0
        if (!value) {
          updatedQuiz.questions = prev.questions.map(q => ({
            ...q,
            negativeMarks: 0
          }));
        } else {
          // If enabling negative marking, set default negative marks equal to positive marks
          updatedQuiz.questions = prev.questions.map(q => ({
            ...q,
            negativeMarks: q.negativeMarks > 0 ? q.negativeMarks : (q.marks || 1)
          }));
        }

        return updatedQuiz;
      });
    } else {
      setQuiz(prev => ({
        ...prev,
        [name]: value,
        // Clear subject when year, semester, or department changes
        subject: ['year', 'semester', 'department'].includes(name) ? '' : prev.subject
      }));
    }
  };

  const handleMultiSelectChange = (e, field) => {
    const { value } = e.target;
    setQuiz(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionChange = (questionIndex, field, value) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex) {
          const updatedQuestion = { ...q, [field]: value };

          // If marks are changed and negative marking is enabled, auto-update negative marks
          if (field === 'marks' && prev.negativeMarkingEnabled) {
            const newMarks = Number(value);
            const currentNegativeMarks = q.negativeMarks || 0;

            // Calculate expected default based on old marks (equal to marks value)
            const oldMarks = q.marks || 1;
            const expectedDefault = oldMarks;

            // Only auto-update if current negative marks seem to be default or 0
            if (currentNegativeMarks === 0 || currentNegativeMarks === expectedDefault) {
              updatedQuestion.negativeMarks = newMarks;
            }
          }

          return updatedQuestion;
        }
        return q;
      })
    }));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => {
        if (i === questionIndex) {
          const newOptions = [...q.options];
          newOptions[optionIndex] = value;
          return { ...q, options: newOptions };
        }
        return q;
      })
    }));
  };

  const addQuestion = () => {
    setAddQuestionModalOpen(true);
  };

  const handleQuestionsAdded = (newQuestions) => {
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, ...newQuestions]
    }));
  };

  const removeQuestion = (index) => {
    if (quiz.questions.length > 1) {
      setQuiz(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async () => {
    try {
      setError('');
      setSuccess('');

      // Validate required fields
      if (!quiz.title || !quiz.subject || !quiz.duration || !quiz.startTime || !quiz.endTime) {
        setError('Please fill in all required fields');
        return;
      }

      // Find the full subject data
      const subjectData = subjects.find(s => s.code === quiz.subject || s.code === quiz.subject.code);
      if (!subjectData) {
        setError('Invalid subject selected');
        return;
      }

      // Create allowed groups from sections
      const allowedGroups = quiz.sections.map(section => ({
        department: quiz.department,
        year: parseInt(quiz.year),
        semester: parseInt(quiz.semester),
        section
      }));

      // Prepare quiz data for submission
      const quizData = {
        ...quiz,
        subject: {
          code: subjectData.code,
          name: subjectData.name
        },
        allowedGroups
      };

      // Remove unnecessary fields
      delete quizData.sections;
      delete quizData.department;
      delete quizData.year;
      delete quizData.semester;

      console.log('Submitting quiz data:', quizData);

      const response = await api.put(`/api/quiz/${id}`, quizData);
      console.log('Quiz updated successfully:', response.data);
      
      setSuccess('Quiz updated successfully');
      setTimeout(() => {
        handleBackNavigation();
      }, 2000);
    } catch (error) {
      console.error('Error updating quiz:', error);
      setError(error.response?.data?.message || 'Failed to update quiz');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    setQuiz(prev => ({
      ...prev,
      [name]: value,
      // Clear subject when year or semester changes
      subject: name === 'year' || name === 'semester' ? '' : prev.subject
    }));
  };

  const getAvailableYears = (department) => {
    if (!department || !academicStructure) return YEARS;
    if (user.role === 'faculty') {
      const deptData = academicStructure[department];
      if (!deptData) return YEARS;

      // If years is an array
      if (Array.isArray(deptData.years)) {
        return deptData.years.map(y => typeof y === 'object' ? y.year : y);
      }
      
      // If years is an object with numeric keys
      if (typeof deptData.years === 'object') {
        return Object.keys(deptData.years).map(Number).filter(y => !isNaN(y));
      }

      return YEARS;
    }
    return YEARS;
  };

  const getAvailableSemesters = (department, year) => {
    if (!department || !year || !academicStructure) return SEMESTERS;
    if (user.role === 'faculty') {
      const deptData = academicStructure[department];
      if (!deptData || !deptData.years) return SEMESTERS;

      // If years is an array
      if (Array.isArray(deptData.years)) {
        const yearData = deptData.years.find(y => 
          (typeof y === 'object' && y.year === parseInt(year)) || y === parseInt(year)
        );
        if (yearData && Array.isArray(yearData.semesters)) {
          return yearData.semesters.map(s => typeof s === 'object' ? s.semester : s);
        }
      }
      
      // If years is an object with numeric keys
      if (typeof deptData.years === 'object') {
        const yearData = deptData.years[year];
        if (yearData && Array.isArray(yearData.semesters)) {
          return yearData.semesters.map(s => typeof s === 'object' ? s.semester : s);
        }
      }

      return SEMESTERS;
    }
    return SEMESTERS;
  };

  const getAvailableSections = (department, year, semester) => {
    if (!department || !year || !semester || !academicStructure) return SECTIONS;
    if (user.role === 'faculty') {
      const deptData = academicStructure[department];
      if (!deptData || !deptData.years) return SECTIONS;

      // If years is an array
      if (Array.isArray(deptData.years)) {
        const yearData = deptData.years.find(y => 
          (typeof y === 'object' && y.year === parseInt(year)) || y === parseInt(year)
        );
        if (yearData && Array.isArray(yearData.semesters)) {
          const semesterData = yearData.semesters.find(s =>
            (typeof s === 'object' && s.semester === parseInt(semester)) || s === parseInt(semester)
          );
          if (semesterData && Array.isArray(semesterData.sections)) {
            return semesterData.sections;
          }
        }
      }
      
      // If years is an object with numeric keys
      if (typeof deptData.years === 'object') {
        const yearData = deptData.years[year];
        if (yearData && Array.isArray(yearData.semesters)) {
          const semesterData = yearData.semesters.find(s =>
            (typeof s === 'object' && s.semester === parseInt(semester)) || s === parseInt(semester)
          );
          if (semesterData && Array.isArray(semesterData.sections)) {
            return semesterData.sections;
          }
        }
      }

      return SECTIONS;
    }
    return SECTIONS;
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBackNavigation}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4">Edit Quiz</Typography>
        </Box>

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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Quiz Title"
                name="title"
                value={quiz.title}
                onChange={handleBasicDetailsChange}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Department</InputLabel>
                <Select
                  value={quiz.department}
                  onChange={(e) => handleBasicDetailsChange({
                    target: { name: 'department', value: e.target.value }
                  })}
                  required
                >
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Year</InputLabel>
                <Select
                  value={quiz.year}
                  onChange={(e) => handleBasicDetailsChange({
                    target: { name: 'year', value: e.target.value }
                  })}
                  required
                >
                  {getAvailableYears(quiz.department).map(year => (
                    <MenuItem key={year} value={year}>
                      Year {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Semester</InputLabel>
                <Select
                  value={quiz.semester}
                  onChange={(e) => handleBasicDetailsChange({
                    target: { name: 'semester', value: e.target.value }
                  })}
                  required
                >
                  {getAvailableSemesters(quiz.department, quiz.year).map(sem => (
                    <MenuItem key={sem} value={sem}>
                      Semester {sem}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Sections</InputLabel>
                <Select
                  multiple
                  value={quiz.sections || []}
                  onChange={(e) => handleBasicDetailsChange({
                    target: { name: 'sections', value: e.target.value }
                  })}
                  input={<OutlinedInput label="Sections" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} />
                      ))}
                    </Box>
                  )}
                  required
                >
                  {getAvailableSections(quiz.department, quiz.year, quiz.semester).map(section => (
                    <MenuItem key={section} value={section}>
                      Section {section}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="number"
                label="Duration (minutes)"
                name="duration"
                value={quiz.duration}
                onChange={handleBasicDetailsChange}
                inputProps={{ min: 1 }}
              />
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
                      checked={quiz.negativeMarkingEnabled || false}
                      onChange={(e) => handleBasicDetailsChange({
                        target: { name: 'negativeMarkingEnabled', value: e.target.checked }
                      })}
                      name="negativeMarkingEnabled"
                    />
                  }
                  label="Enable Negative Marking"
                />
              </FormGroup>

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                💡 This setting indicates whether negative marking is allowed in this quiz. Individual negative marks are set per question.
              </Typography>
            </Grid>

            {/* Security Settings */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                🔒 Security Settings
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={quiz.securitySettings?.enableFullscreen || false}
                          onChange={(e) => setQuiz(prev => ({
                            ...prev,
                            securitySettings: {
                              ...prev.securitySettings,
                              enableFullscreen: e.target.checked
                            }
                          }))}
                          name="enableFullscreen"
                        />
                      }
                      label="Enable Fullscreen Mode"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Forces quiz to open in fullscreen mode and prevents exiting
                    </Typography>
                  </FormGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={quiz.securitySettings?.disableRightClick || false}
                          onChange={(e) => setQuiz(prev => ({
                            ...prev,
                            securitySettings: {
                              ...prev.securitySettings,
                              disableRightClick: e.target.checked
                            }
                          }))}
                          name="disableRightClick"
                        />
                      }
                      label="Disable Right Click"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Prevents right-click context menu during quiz
                    </Typography>
                  </FormGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={quiz.securitySettings?.disableCopyPaste || false}
                          onChange={(e) => setQuiz(prev => ({
                            ...prev,
                            securitySettings: {
                              ...prev.securitySettings,
                              disableCopyPaste: e.target.checked
                            }
                          }))}
                          name="disableCopyPaste"
                        />
                      }
                      label="Disable Copy/Paste"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Prevents copying and pasting during quiz
                    </Typography>
                  </FormGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={quiz.securitySettings?.disableTabSwitch || false}
                          onChange={(e) => setQuiz(prev => ({
                            ...prev,
                            securitySettings: {
                              ...prev.securitySettings,
                              disableTabSwitch: e.target.checked
                            }
                          }))}
                          name="disableTabSwitch"
                        />
                      }
                      label="Disable Tab Switching"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Warns when user tries to switch tabs or windows
                    </Typography>
                  </FormGroup>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={quiz.securitySettings?.enableProctoringMode || false}
                          onChange={(e) => setQuiz(prev => ({
                            ...prev,
                            securitySettings: {
                              ...prev.securitySettings,
                              enableProctoringMode: e.target.checked
                            }
                          }))}
                          name="enableProctoringMode"
                        />
                      }
                      label="Enable Proctoring Mode"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Enables all security features and monitors user activity
                    </Typography>
                  </FormGroup>
                </Grid>
              </Grid>

              {/* Shuffle Questions Setting */}
              <Grid item xs={12}>
                <FormGroup sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={quiz.shuffleQuestions || false}
                        onChange={(e) => setQuiz(prev => ({
                          ...prev,
                          shuffleQuestions: e.target.checked
                        }))}
                        name="shuffleQuestions"
                      />
                    }
                    label="🔀 Shuffle Questions"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Each student will receive questions in a different random order
                  </Typography>
                </FormGroup>
              </Grid>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="datetime-local"
                label="Start Time"
                name="startTime"
                value={quiz.startTime}
                onChange={handleBasicDetailsChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                type="datetime-local"
                label="End Time"
                name="endTime"
                value={quiz.endTime}
                onChange={handleBasicDetailsChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Subject</InputLabel>
                <Select
                  name="subject"
                  value={quiz.subject?.code || quiz.subject || ''}
                  onChange={handleBasicDetailsChange}
                  label="Subject"
                >
                  {subjects.map((subject) => (
                    <MenuItem key={subject.code} value={subject.code}>
                      {subject.name} ({subject.code})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Questions</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addQuestion}
          >
            Add Question
          </Button>
        </Box>

        {(quiz.questions || []).map((question, questionIndex) => (
          <Card key={questionIndex} sx={{ mb: 3, position: 'relative' }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={11}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Question {questionIndex + 1} ({question.marks || 1} marks{quiz.negativeMarkingEnabled && question.negativeMarks > 0 ? ` | -${question.negativeMarks} for wrong` : ''})
                    </Typography>

                    {/* Enhanced Question Input with Smart Indentation */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Question Text (with smart indentation support):
                        </Typography>
                        {needsFormatPreservation(question.question) && (
                          <>
                            <Chip
                              icon={<CodeIcon />}
                              label="Code Detected"
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Tooltip title="Apply smart indentation for programming code">
                              <Button
                                size="small"
                                startIcon={<FormatIndentIncreaseIcon />}
                                onClick={() => {
                                  const formattedText = restoreIndentationForAllLanguages(question.question);
                                  handleQuestionChange(questionIndex, 'question', formattedText);
                                }}
                                variant="outlined"
                                color="secondary"
                              >
                                Fix Indentation
                              </Button>
                            </Tooltip>
                          </>
                        )}
                      </Box>

                      {/* Display formatted question text for easy reading */}
                      <Box sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: needsFormatPreservation(question.question) ? 'primary.main' : 'divider',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        overflow: 'auto',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        {needsFormatPreservation(question.question) && (
                          <Typography variant="caption" color="primary.main" sx={{ display: 'block', mb: 1 }}>
                            ✓ Programming Code Preview:
                          </Typography>
                        )}
                        {question.question ? (
                          question.question.includes('<pre>') ? (
                            <div dangerouslySetInnerHTML={{ __html: question.question }} />
                          ) : (
                            question.question
                          )
                        ) : (
                          'Enter your question below...'
                        )}
                      </Box>

                      <TextField
                        required
                        fullWidth
                        label="Edit Question Text"
                        value={question.question}
                        onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                        multiline
                        rows={needsFormatPreservation(question.question) ? 8 : 6}
                        sx={{
                          '& .MuiInputBase-input': {
                            fontFamily: needsFormatPreservation(question.question) ? 'monospace' : 'inherit',
                            fontSize: needsFormatPreservation(question.question) ? '0.9rem' : 'inherit',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap'
                          }
                        }}
                        helperText={
                          needsFormatPreservation(question.question)
                            ? "Programming code detected. Use 'Fix Indentation' to apply smart formatting."
                            : "Enter your question text. Programming code will be automatically detected."
                        }
                      />
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={1}>
                  <IconButton
                    color="error"
                    onClick={() => removeQuestion(questionIndex)}
                    disabled={quiz.questions.length === 1}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Options
                  </Typography>
                  <FormControl component="fieldset">
                    <RadioGroup
                      value={question.correctAnswer}
                      onChange={(e) => handleQuestionChange(questionIndex, 'correctAnswer', parseInt(e.target.value))}
                    >
                      {question.options.map((option, optionIndex) => (
                        <Box key={optionIndex} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <FormControlLabel
                            value={optionIndex}
                            control={<Radio />}
                            label=""
                          />
                          <TextField
                            required
                            fullWidth
                            label={`Option ${optionIndex + 1}`}
                            value={option}
                            onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                            size="small"
                          />
                        </Box>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Marks (for correct answer)"
                    value={question.marks}
                    onChange={(e) => handleQuestionChange(questionIndex, 'marks', parseInt(e.target.value))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Negative Marks (for wrong answer)"
                    value={question.negativeMarks || 0}
                    onChange={(e) => handleQuestionChange(questionIndex, 'negativeMarks', parseFloat(e.target.value))}
                    inputProps={{ min: 0, step: 0.25 }}
                    helperText="Marks deducted for wrong answer (0 = no negative marking)"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        ))}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="outlined"
            onClick={handleBackNavigation}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
          >
            Save Changes
          </Button>
        </Box>
      </Paper>

      {/* Add Question Modal */}
      <AddQuestionModal
        open={addQuestionModalOpen}
        onClose={() => setAddQuestionModalOpen(false)}
        onQuestionsAdded={handleQuestionsAdded}
        negativeMarkingEnabled={quiz.negativeMarkingEnabled}
        isEventQuiz={false}
      />
    </Container>
  );
};

export default QuizEdit; 