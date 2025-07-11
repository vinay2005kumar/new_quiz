import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box
} from '@mui/material';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const SubjectCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    department: '',
    year: '',
    semester: '',
    sequence: '1',
    credits: '',
    description: ''
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/admin/departments');
      if (response.data && Array.isArray(response.data)) {
        const deptNames = response.data.map(dept => dept.name);
        setDepartments(deptNames);
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
      // Fallback to some default departments if API fails
      setDepartments([
        'Computer Science and Engineering',
        'Electronics and Communication Engineering',
        'Electrical and Electronics Engineering'
      ]);
    }
  };

  const years = [
    { value: 1, label: 'First Year' },
    { value: 2, label: 'Second Year' },
    { value: 3, label: 'Third Year' },
    { value: 4, label: 'Fourth Year' }
  ];

  const getSemestersByYear = (year) => {
    switch (parseInt(year)) {
      case 1:
        return [
          { value: 1, label: 'First Semester' },
          { value: 2, label: 'Second Semester' }
        ];
      case 2:
        return [
          { value: 3, label: 'Third Semester' },
          { value: 4, label: 'Fourth Semester' }
        ];
      case 3:
        return [
          { value: 5, label: 'Fifth Semester' },
          { value: 6, label: 'Sixth Semester' }
        ];
      case 4:
        return [
          { value: 7, label: 'Seventh Semester' },
          { value: 8, label: 'Eighth Semester' }
        ];
      default:
        return [];
    }
  };

  const sequences = Array.from({ length: 9 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `Subject ${i + 1}`
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      };

      // Reset semester when year changes
      if (name === 'year') {
        newData.semester = '';
      }

      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate subject code format
    const codeRegex = /^[A-Z]{2}[1-4][1-2][1-9]$/i;
    if (!codeRegex.test(formData.code)) {
      setError('Please enter a valid subject code format (e.g., CS311, CS312).');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await api.post('/api/subject', formData);
      navigate('/subjects');
    } catch (error) {
      // Handle specific error cases
      const errorMessage = error.response?.data?.message || '';
      
      if (errorMessage.includes('duplicate key') || errorMessage.toLowerCase().includes('duplicate')) {
        setError(`Subject code "${formData.code}" already exists. Please use a different code.`);
      } else if (errorMessage.includes('validation failed')) {
        if (errorMessage.includes('department')) {
          setError('Please select a valid department.');
        } else if (errorMessage.includes('year')) {
          setError('Please select a valid year (1-4).');
        } else if (errorMessage.includes('semester')) {
          setError('Please select a valid semester for the chosen year.');
        } else if (errorMessage.includes('credits')) {
          setError('Credits must be at least 1.');
        } else {
          setError('Please check all required fields are filled correctly.');
        }
      } else {
        setError('Failed to create subject. Please try again.');
      }
    }
  };

  if (user.role !== 'admin') {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">
          You do not have permission to access this page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Add New Subject
        </Typography>

        {error && (
          <Alert 
            severity={error.includes('already exists') ? 'warning' : 'error'} 
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 2 }}>
                Subject Code Format: XX111 (e.g., CS311, CS312)<br />
                - First two letters: Department code (CS, EC, ME, etc.)<br />
                - First digit: Year (1-4)<br />
                - Second digit: Semester in that year (1-2)<br />
                - Third digit: Subject sequence number (1-9)<br /><br />
                Note: Subject code must be unique across all subjects.
              </Alert>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Subject Code"
                name="code"
                value={formData.code.toUpperCase()}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  handleChange({
                    target: {
                      name: 'code',
                      value: value
                    }
                  });
                }}
                helperText="Format: CS311, CS312, etc. (Must be unique)"
                placeholder="Enter subject code"
                error={error.includes('code')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Subject Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required size="medium">
                <InputLabel id="department-label">Department</InputLabel>
                <Select
                  labelId="department-label"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  label="Department"
                  displayEmpty
                  sx={{
                    minWidth: '200px',
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '42px'
                    }
                  }}
                >
                  <MenuItem value="" disabled>
                    {/* <em>Select Department</em> */}
                  </MenuItem>
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>
                      {dept}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required size="medium">
                <InputLabel id="year-label">Year</InputLabel>
                <Select
                  labelId="year-label"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  label="Year"
                  displayEmpty
                  sx={{
                    minWidth: '200px',
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '42px'
                    }
                  }}
                >
                  <MenuItem value="" disabled>
                    {/* <em>Select Year</em> */}
                  </MenuItem>
                  {years.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required size="medium">
                <InputLabel id="semester-label">Semester</InputLabel>
                <Select
                  labelId="semester-label"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  label="Semester"
                  disabled={!formData.year}
                  displayEmpty
                  sx={{
                    minWidth: '200px',
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '42px'
                    }
                  }}
                >
                  <MenuItem value="" disabled>
                    {/* <em>Select Semester</em> */}
                  </MenuItem>
                  {getSemestersByYear(formData.year).map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required size="medium">
                <InputLabel id="sequence-label">Sequence Number</InputLabel>
                <Select
                  labelId="sequence-label"
                  name="sequence"
                  value={formData.sequence}
                  onChange={handleChange}
                  label="Sequence Number"
                  displayEmpty
                  sx={{
                    minWidth: '200px',
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '42px'
                    }
                  }}
                >
                  <MenuItem value="" disabled>
                    {/* <em>Select Sequence</em> */}
                  </MenuItem>
                  {sequences.map(({ value, label }) => (
                    <MenuItem key={value} value={value}>
                      {label}
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
                label="Credits"
                name="credits"
                value={formData.credits}
                onChange={handleChange}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={() => navigate('/subjects')}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
            >
              Create Subject
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default SubjectCreate; 