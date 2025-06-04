import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Typography,
  Card,
  CardContent,
  FormGroup,
  FormControlLabel,
  Switch,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../../config/axios';

const EventQuizBasicDetails = ({ basicDetails, setBasicDetails, error, setError, onNext }) => {
  const [academicDetails, setAcademicDetails] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [years, setYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    fetchAcademicDetails();
  }, []);

  const fetchAcademicDetails = async () => {
    try {
      const response = await api.get('/api/academic-details/faculty-structure');
      setAcademicDetails(response.data);
      
      // Extract unique departments
      const depts = Object.keys(response.data || {});
      setDepartments(depts);
    } catch (error) {
      console.error('Error fetching academic details:', error);
      setError('Failed to load academic details');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBasicDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEventDetailsChange = (e) => {
    const { name, value } = e.target;
    setBasicDetails(prev => ({
      ...prev,
      eventDetails: {
        ...prev.eventDetails,
        [name]: value
      }
    }));
  };

  const handleDateChange = (field, value) => {
    setBasicDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleParticipantTypesChange = (event) => {
    const { value } = event.target;
    setBasicDetails(prev => ({
      ...prev,
      participantTypes: value
    }));
  };

  const handleEligibilityChange = (field, value) => {
    setBasicDetails(prev => ({
      ...prev,
      eligibility: {
        ...prev.eligibility,
        [field]: value
      }
    }));

    // Update dependent fields
    if (field === 'departments') {
      const selectedDept = value[0];
      const deptYears = [...new Set(academicDetails[selectedDept]?.map(detail => detail.year))];
      setYears(deptYears.sort((a, b) => a - b));
      
      setBasicDetails(prev => ({
        ...prev,
        eligibility: {
          ...prev.eligibility,
          years: [],
          semesters: [],
          sections: []
        }
      }));
    }

    if (field === 'years') {
      const selectedDept = basicDetails.eligibility.departments[0];
      const selectedYear = value[0];
      
      const deptYearDetails = academicDetails[selectedDept]?.filter(
        detail => detail.year === selectedYear
      );
      
      const availableSemesters = [...new Set(deptYearDetails?.map(detail => detail.semester))];
      setSemesters(availableSemesters.sort((a, b) => a - b));
      
      setBasicDetails(prev => ({
        ...prev,
        eligibility: {
          ...prev.eligibility,
          semesters: [],
          sections: []
        }
      }));
    }

    if (field === 'semesters') {
      const selectedDept = basicDetails.eligibility.departments[0];
      const selectedYear = basicDetails.eligibility.years[0];
      const selectedSemester = value[0];
      
      const deptYearSemDetails = academicDetails[selectedDept]?.filter(
        detail => detail.year === selectedYear && detail.semester === selectedSemester
      );
      
      const availableSections = [...new Set(deptYearSemDetails?.map(detail => detail.section))];
      setSections(availableSections.sort());
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          {/* Basic Quiz Details */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Basic Quiz Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Quiz Title"
                      name="title"
                      value={basicDetails.title}
                      onChange={handleInputChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      name="description"
                      value={basicDetails.description}
                      onChange={handleInputChange}
                      multiline
                      rows={3}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Duration (minutes)"
                      name="duration"
                      type="number"
                      value={basicDetails.duration}
                      onChange={handleInputChange}
                      required
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DateTimePicker
                      label="Start Time"
                      value={basicDetails.startTime}
                      onChange={(value) => handleDateChange('startTime', value)}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <DateTimePicker
                      label="End Time"
                      value={basicDetails.endTime}
                      onChange={(value) => handleDateChange('endTime', value)}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Event Details */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Event Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Event Name"
                      name="name"
                      value={basicDetails.eventDetails.name}
                      onChange={handleEventDetailsChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Event Description"
                      name="description"
                      value={basicDetails.eventDetails.description}
                      onChange={handleEventDetailsChange}
                      multiline
                      rows={3}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Organizer"
                      name="organizer"
                      value={basicDetails.eventDetails.organizer}
                      onChange={handleEventDetailsChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Venue"
                      name="venue"
                      value={basicDetails.eventDetails.venue}
                      onChange={handleEventDetailsChange}
                      required
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Participant Types */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Participant Types
                </Typography>
                <FormControl fullWidth>
                  <InputLabel>Select Participant Types</InputLabel>
                  <Select
                    multiple
                    value={basicDetails.participantTypes}
                    onChange={handleParticipantTypesChange}
                    input={<OutlinedInput label="Select Participant Types" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value === 'college' ? 'College Students' : 'External Students'} />
                        ))}
                      </Box>
                    )}
                  >
                    <MenuItem value="college">
                      <Checkbox checked={basicDetails.participantTypes.includes('college')} />
                      <ListItemText primary="College Students" />
                    </MenuItem>
                    <MenuItem value="external">
                      <Checkbox checked={basicDetails.participantTypes.includes('external')} />
                      <ListItemText primary="External Students" />
                    </MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>
          </Grid>

          {/* College Students Eligibility */}
          {basicDetails.participantTypes.includes('college') && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    College Students Eligibility
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Department</InputLabel>
                        <Select
                          value={basicDetails.eligibility.departments}
                          onChange={(e) => handleEligibilityChange('departments', e.target.value)}
                          multiple
                          input={<OutlinedInput label="Department" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={value} />
                              ))}
                            </Box>
                          )}
                        >
                          {departments.map((dept) => (
                            <MenuItem key={dept} value={dept}>
                              <Checkbox checked={basicDetails.eligibility.departments.includes(dept)} />
                              <ListItemText primary={dept} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Year</InputLabel>
                        <Select
                          value={basicDetails.eligibility.years}
                          onChange={(e) => handleEligibilityChange('years', e.target.value)}
                          multiple
                          input={<OutlinedInput label="Year" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={`Year ${value}`} />
                              ))}
                            </Box>
                          )}
                        >
                          {years.map((year) => (
                            <MenuItem key={year} value={year}>
                              <Checkbox checked={basicDetails.eligibility.years.includes(year)} />
                              <ListItemText primary={`Year ${year}`} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Semester</InputLabel>
                        <Select
                          value={basicDetails.eligibility.semesters}
                          onChange={(e) => handleEligibilityChange('semesters', e.target.value)}
                          multiple
                          input={<OutlinedInput label="Semester" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={`Semester ${value}`} />
                              ))}
                            </Box>
                          )}
                        >
                          {semesters.map((semester) => (
                            <MenuItem key={semester} value={semester}>
                              <Checkbox checked={basicDetails.eligibility.semesters.includes(semester)} />
                              <ListItemText primary={`Semester ${semester}`} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Sections</InputLabel>
                        <Select
                          value={basicDetails.eligibility.sections}
                          onChange={(e) => handleEligibilityChange('sections', e.target.value)}
                          multiple
                          input={<OutlinedInput label="Sections" />}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((value) => (
                                <Chip key={value} label={`Section ${value}`} />
                              ))}
                            </Box>
                          )}
                        >
                          {sections.map((section) => (
                            <MenuItem key={section} value={section}>
                              <Checkbox checked={basicDetails.eligibility.sections.includes(section)} />
                              <ListItemText primary={`Section ${section}`} />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Additional Settings */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Additional Settings
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Maximum Participants"
                      name="maxParticipants"
                      type="number"
                      value={basicDetails.maxParticipants}
                      onChange={handleInputChange}
                      inputProps={{ min: 0 }}
                      helperText="0 for unlimited"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Passing Marks"
                      name="passingMarks"
                      type="number"
                      value={basicDetails.passingMarks}
                      onChange={handleInputChange}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={basicDetails.enableSpotRegistration}
                            onChange={(e) => handleInputChange({
                              target: {
                                name: 'enableSpotRegistration',
                                value: e.target.checked
                              }
                            })}
                            name="enableSpotRegistration"
                          />
                        }
                        label="Enable Spot Registration"
                      />
                    </FormGroup>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default EventQuizBasicDetails; 