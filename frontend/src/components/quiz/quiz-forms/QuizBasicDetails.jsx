import { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  OutlinedInput,
  Alert,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../config/axios';

const QuizBasicDetails = ({ 
  basicDetails, 
  setBasicDetails, 
  error, 
  setError,
  filters,
  setFilters 
}) => {
  const { user } = useAuth();
  const [academicStructure, setAcademicStructure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);

  // Fetch academic structure
  useEffect(() => {
    const fetchAcademicStructure = async () => {
      try {
        setLoading(true);

        // Fetch departments from college settings (now public)
        const deptResponse = await api.get('/api/admin/settings/departments');
        let collegeDepartments = [];
        if (deptResponse && deptResponse.departments && Array.isArray(deptResponse.departments)) {
          collegeDepartments = deptResponse.departments.map(dept => dept.name);
        }

        // First get all academic details
        const allDetailsResponse = await api.get('/api/academic-details');

        // Then get faculty-specific structure
        const facultyResponse = await api.get('/api/academic-details/faculty-structure');

        if (allDetailsResponse && Array.isArray(allDetailsResponse)) {
          // Process all academic details into structure
          const structure = allDetailsResponse.reduce((acc, detail) => {
            if (!detail || !detail.department || !detail.year || !detail.semester) return acc;

            // Initialize department if not exists
            if (!acc[detail.department]) {
              acc[detail.department] = { years: {} };
            }

            // Initialize year if not exists
            if (!acc[detail.department].years[detail.year]) {
              acc[detail.department].years[detail.year] = { semesters: {} };
            }

            // Add semester data
            acc[detail.department].years[detail.year].semesters[detail.semester] = {
              sections: detail.sections ? detail.sections.split(',').map(s => s.trim()) : [],
              subjects: detail.subjects ? detail.subjects.split(',')
                .map(s => {
                  const match = s.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
                  return match ? {
                    name: match[1].trim(),
                    code: match[2]
                  } : null;
                })
                .filter(s => s !== null) : []
            };

            return acc;
          }, {});

          // Add departments from college settings that might not be in academic details
          collegeDepartments.forEach(dept => {
            if (!structure[dept]) {
              structure[dept] = { years: {} };
            }
          });

          // Mark departments that faculty has access to
          if (facultyResponse?.data) {
            Object.keys(structure).forEach(dept => {
              structure[dept].hasAccess = !!facultyResponse.data[dept];
            });
          }

          setAcademicStructure(structure);
        }
      } catch (error) {
        console.error('Error fetching academic structure:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAcademicStructure();
  }, []);

  // Auto-select department for faculty
  useEffect(() => {
    if (
      academicStructure && 
      user?.assignments?.length === 1 && 
      !filters.department
    ) {
      const assignment = user.assignments[0];
      const dept = assignment.department;
      if (academicStructure[dept]?.hasAccess) {
        setFilters(prev => ({
          ...prev,
          department: dept
        }));
      }
    }
  }, [academicStructure, user?.assignments, filters.department]);

  // Handle filter changes
  const handleFilterChange = useCallback((event) => {
    const { name, value } = event.target;
    
    setFilters(prev => {
      const newFilters = { ...prev };
      newFilters[name] = value;

      // Reset dependent fields
      if (name === 'department') {
        newFilters.year = '';
        newFilters.semester = '';
        newFilters.sections = [];
      } else if (name === 'year') {
        newFilters.semester = '';
        newFilters.sections = [];
      } else if (name === 'semester') {
        newFilters.sections = [];
      }

      return newFilters;
    });

    // Update basicDetails in a separate effect
    if (name === 'sections') {
      const sections = typeof value === 'string' ? value.split(',') : value;
      if (filters.department && filters.year && filters.semester) {
        const allowedGroups = sections.map(section => ({
          department: filters.department,
          year: parseInt(filters.year),
          semester: parseInt(filters.semester),
          section
        }));
        
        setBasicDetails(prev => ({
          ...prev,
          allowedGroups
        }));
      }
    }
  }, [filters.department, filters.year, filters.semester, setBasicDetails, setFilters, academicStructure]);

  // Update subjects from academic structure
  useEffect(() => {
    if (!filters.department || !filters.year || !filters.semester || !academicStructure) {
      setSubjects([]);
      return;
    }

    try {
      const semesterData = academicStructure[filters.department]?.years[filters.year]?.semesters[filters.semester];
      if (semesterData?.subjects && Array.isArray(semesterData.subjects)) {
        setSubjects(semesterData.subjects);
      } else {
        setSubjects([]);
      }
    } catch (error) {
      console.error('Error getting subjects:', error);
      setSubjects([]);
    }
  }, [filters.department, filters.year, filters.semester, academicStructure]);

  const getAvailableYears = () => {
    if (!academicStructure || !filters.department) return [];
    const deptData = academicStructure[filters.department];
    if (!deptData?.years) return [];

    let availableYears = Object.keys(deptData.years).map(Number).sort((a, b) => a - b);

    // For faculty users, filter years based on their permissions
    if (user?.role === 'faculty' && user?.years) {
      const facultyYears = user.years.map(year => parseInt(year));
      availableYears = availableYears.filter(year => facultyYears.includes(year));
    }

    return availableYears;
  };

  const getAvailableSemesters = () => {
    if (!academicStructure || !filters.department || !filters.year) return [];
    const yearData = academicStructure[filters.department]?.years[filters.year];
    if (!yearData?.semesters) return [];

    let availableSemesters = Object.keys(yearData.semesters).map(Number).sort((a, b) => a - b);

    // For faculty users, filter semesters based on their permissions
    if (user?.role === 'faculty' && user?.semesters) {
      const facultySemesters = user.semesters.map(semester => parseInt(semester));
      availableSemesters = availableSemesters.filter(semester => facultySemesters.includes(semester));
    }

    return availableSemesters;
  };

  const getAvailableSections = () => {
    if (!academicStructure || !filters.department || !filters.year || !filters.semester) return [];
    const semesterData = academicStructure[filters.department]?.years[filters.year]?.semesters[filters.semester];
    let availableSections = semesterData?.sections || [];

    // For faculty users, filter sections based on their permissions
    if (user?.role === 'faculty' && user?.sections) {
      availableSections = availableSections.filter(section => user.sections.includes(section));
    }

    return availableSections;
  };

  // Handle basic details changes with enhanced date validation
  const handleBasicDetailsChange = (event) => {
    const { name, value } = event.target;

    // Validate dates if changing start or end time
    if (name === 'startTime' || name === 'endTime') {
      const startTime = name === 'startTime' ? new Date(value) : new Date(basicDetails.startTime);
      const endTime = name === 'endTime' ? new Date(value) : new Date(basicDetails.endTime);
      const now = new Date();

      // Set seconds and milliseconds to 0 for fair comparison
      startTime.setSeconds(0, 0);
      endTime.setSeconds(0, 0);
      now.setSeconds(0, 0);

      // Only validate if both dates are set
      if (basicDetails.startTime && basicDetails.endTime) {
        if (endTime <= startTime) {
          setError('End time must be after start time');
          return;
        }
        
        // Allow start time if it's within 5 minutes of current time
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
        if (startTime < fiveMinutesAgo) {
          setError('Start time must not be more than 5 minutes in the past');
          return;
        }
        
        setError(null); // Clear error if dates are valid
      }
    }

    // For subject selection, ensure we're using both code and name
    if (name === 'subject' && value) {
      const selectedSubject = subjects.find(s => s.code === value);
      if (selectedSubject) {
        setBasicDetails(prev => ({
          ...prev,
          subject: {
            code: selectedSubject.code,
            name: selectedSubject.name
          }
        }));
        return;
      }
    }

    setBasicDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Grid container spacing={2}>
      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Quiz Title"
          name="title"
          value={basicDetails.title}
          onChange={handleBasicDetailsChange}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Department</InputLabel>
          <Select
            name="department"
            value={filters.department}
            onChange={handleFilterChange}
            disabled={loading}
          >
            {academicStructure && Object.keys(academicStructure)
              .filter(dept => {
                // For faculty users, only show departments they have access to
                if (user?.role === 'faculty') {
                  return user?.departments?.includes(dept);
                }
                // For admin users, show all departments
                return true;
              })
              .map(dept => (
                <MenuItem key={dept} value={dept}>
                  {dept}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Year</InputLabel>
          <Select
            name="year"
            value={filters.year}
            onChange={handleFilterChange}
            disabled={!filters.department || loading}
          >
            {getAvailableYears().map(year => (
              <MenuItem key={year} value={year}>
                Year {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Semester</InputLabel>
          <Select
            name="semester"
            value={filters.semester}
            onChange={handleFilterChange}
            disabled={!filters.year || loading}
          >
            {getAvailableSemesters().map(semester => (
              <MenuItem key={semester} value={semester}>
                Semester {semester}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Sections</InputLabel>
          <Select
            multiple
            name="sections"
            value={filters.sections}
            onChange={handleFilterChange}
            input={<OutlinedInput label="Sections" />}
            disabled={!filters.semester || loading}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            {getAvailableSections().map(section => (
              <MenuItem key={section} value={section}>
                Section {section}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth required>
          <InputLabel>Subject</InputLabel>
          <Select
            name="subject"
            value={basicDetails.subject?.code || basicDetails.subject || ''}
            onChange={handleBasicDetailsChange}
            disabled={!filters.semester || loading}
          >
            {subjects.map(subject => (
              <MenuItem key={subject._id || subject.code} value={subject.code}>
                {subject.name} ({subject.code})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Duration (minutes)"
          name="duration"
          type="number"
          value={basicDetails.duration}
          onChange={handleBasicDetailsChange}
          inputProps={{ min: 1 }}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ mb: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
            Question Display Mode
          </FormLabel>
          <RadioGroup
            row
            name="questionDisplayMode"
            value={basicDetails.questionDisplayMode || 'oneByOne'}
            onChange={handleBasicDetailsChange}
          >
            <FormControlLabel
              value="oneByOne"
              control={<Radio />}
              label="One by One"
            />
            <FormControlLabel
              value="allVertical"
              control={<Radio />}
              label="All Questions Vertically"
            />
          </RadioGroup>
        </FormControl>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Start Time"
          name="startTime"
          type="datetime-local"
          value={basicDetails.startTime}
          onChange={handleBasicDetailsChange}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="End Time"
          name="endTime"
          type="datetime-local"
          value={basicDetails.endTime}
          onChange={handleBasicDetailsChange}
          InputLabelProps={{ shrink: true }}
          required
        />
      </Grid>
    </Grid>
  );
};

export default QuizBasicDetails; 