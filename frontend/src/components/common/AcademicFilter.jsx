import React, { useState, useEffect } from 'react';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  Box,
  Typography,
  Chip,
  Button
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import { useAuth } from '../../context/AuthContext';

const AcademicFilter = ({
  filters = {},
  onFilterChange,
  onClearFilters,
  showFilters = ['department', 'year', 'semester', 'section', 'subject'],
  size = 'small',
  title = 'Filters',
  showTitle = true,
  showClearButton = true,
  showRefreshButton = false,
  onRefresh,
  customFilters = [],
  disabled = false,
  sx = {}
}) => {
  const { user } = useAuth();
  const [academicData, setAcademicData] = useState({
    departments: [],
    years: [],
    semesters: [],
    sections: [],
    subjects: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAcademicData();
  }, []);

  const fetchAcademicData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch departments from college settings (now public for all users)
      const deptResponse = await api.get('/api/admin/settings/departments');
      console.log('🏢 Departments API response:', deptResponse);

      // Extract departments from the response structure: { departments: [...] }
      let departments = [];
      if (deptResponse && deptResponse.departments && Array.isArray(deptResponse.departments)) {
        departments = deptResponse.departments.map(dept => dept.name);
      }
      console.log('🏢 Processed departments:', departments);

      // Fetch academic details (same as college settings)
      const academicResponse = await api.get('/api/academic-details');
      console.log('📚 Academic details API response:', academicResponse);

      // The data is directly in the response object (same as college settings)
      const academicDetails = Array.isArray(academicResponse) ? academicResponse : [];
      console.log('📚 Processed academic details:', academicDetails);

      // Also extract departments from academic details as fallback (in case college settings is empty)
      const academicDepartments = [...new Set(academicDetails.map(detail => detail.department))].filter(Boolean).sort();
      console.log('🏢 Departments from academic details:', academicDepartments);

      // Use departments from college settings, but fallback to academic details if college settings is empty
      const finalDepartments = departments.length > 0 ? departments : academicDepartments;
      console.log('🏢 Final departments to use:', finalDepartments);

      // Extract unique years and semesters (same as college settings)
      const years = [...new Set(academicDetails.map(detail => detail.year))].filter(Boolean).sort((a, b) => a - b);
      const semesters = [...new Set(academicDetails.map(detail => detail.semester))].filter(Boolean).sort((a, b) => a - b);
      console.log('📅 Extracted years:', years);
      console.log('📅 Extracted semesters:', semesters);

      // Extract sections (split comma-separated values and flatten) - same as college settings
      const allSections = academicDetails.reduce((acc, detail) => {
        if (detail && detail.sections) {
          const sectionArray = detail.sections.split(',').map(s => s.trim()).filter(s => s);
          return [...acc, ...sectionArray];
        }
        return acc;
      }, []);
      const sections = [...new Set(allSections)].filter(Boolean).sort();
      console.log('📝 Extracted sections:', sections);

      // Extract subjects (split comma-separated values and parse subject names) - same as college settings
      const allSubjects = [];
      academicDetails.forEach(detail => {
        if (detail && detail.subjects) {
          const subjectsArray = detail.subjects.trim()
            ? detail.subjects.split(',').filter(s => s.trim())
            : [];

          subjectsArray.forEach(subject => {
            const match = subject.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
            if (match) {
              allSubjects.push({
                name: match[1].trim(),
                code: match[2],
                fullName: subject.trim(),
                department: detail.department,
                year: detail.year || 1,
                semester: detail.semester || 1,
                credits: detail.credits || 3
              });
            }
          });
        }
      });

      // Get unique subjects by code
      const uniqueSubjects = [];
      const seenSubjects = new Set();
      allSubjects.forEach(subject => {
        const key = subject.code;
        if (!seenSubjects.has(key)) {
          seenSubjects.add(key);
          uniqueSubjects.push(subject);
        }
      });

      const subjects = uniqueSubjects.sort((a, b) => a.name.localeCompare(b.name));
      console.log('📖 Extracted subjects:', subjects);

      console.log('✅ Final processed academic data:', {
        departments: finalDepartments,
        years,
        semesters,
        sections,
        subjects
      });

      // Filter data based on faculty permissions
      let filteredDepartments = finalDepartments;
      let filteredYears = years;
      let filteredSemesters = semesters;
      let filteredSections = sections;
      let filteredSubjects = subjects;

      if (user?.role === 'faculty') {
        // Filter departments
        if (user?.departments) {
          filteredDepartments = finalDepartments.filter(dept => user.departments.includes(dept));
        }

        // Filter years
        if (user?.years) {
          const facultyYears = user.years.map(year => parseInt(year));
          filteredYears = years.filter(year => facultyYears.includes(year));
        }

        // Filter semesters
        if (user?.semesters) {
          const facultySemesters = user.semesters.map(semester => parseInt(semester));
          filteredSemesters = semesters.filter(semester => facultySemesters.includes(semester));
        }

        // Filter sections
        if (user?.sections) {
          filteredSections = sections.filter(section => user.sections.includes(section));
        }

        // Filter subjects based on faculty departments
        if (user?.departments) {
          filteredSubjects = subjects.filter(subject => user.departments.includes(subject.department));
        }
      }

      setAcademicData({
        departments: filteredDepartments,
        years: filteredYears,
        semesters: filteredSemesters,
        sections: filteredSections,
        subjects: filteredSubjects
      });

    } catch (error) {
      console.error('Error fetching academic data:', error);
      setError('Failed to load filter options');

      // Fallback data
      setAcademicData({
        departments: ['Computer Science and Engineering', 'Electronics and Communication Engineering'],
        years: [1, 2, 3, 4],
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        sections: ['A', 'B', 'C', 'D'],
        subjects: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterName, value) => {
    if (onFilterChange) {
      onFilterChange(filterName, value);
    }
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    }
  };

  const handleRefresh = () => {
    fetchAcademicData();
    if (onRefresh) {
      onRefresh();
    }
  };

  const getFilterValue = (filterName) => {
    return filters[filterName] || '';
  };

  const renderFilterField = (filterType) => {
    const commonProps = {
      fullWidth: true,
      size: size,
      disabled: disabled || loading
    };

    switch (filterType) {
      case 'department':
        return (
          <Grid item xs={12} sm={6} md={2} key="department">
            <FormControl {...commonProps}>
              <InputLabel>Department {academicData.departments.length > 0 ? `(${academicData.departments.length})` : ''}</InputLabel>
              <Select
                value={getFilterValue('department')}
                label={`Department ${academicData.departments.length > 0 ? `(${academicData.departments.length})` : ''}`}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <MenuItem value="">All Departments</MenuItem>
                {academicData.departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );

      case 'year':
        return (
          <Grid item xs={12} sm={6} md={2} key="year">
            <FormControl {...commonProps}>
              <InputLabel>Year {academicData.years.length > 0 ? `(${academicData.years.length})` : ''}</InputLabel>
              <Select
                value={getFilterValue('year')}
                label={`Year ${academicData.years.length > 0 ? `(${academicData.years.length})` : ''}`}
                onChange={(e) => handleFilterChange('year', e.target.value)}
              >
                <MenuItem value="">All Years</MenuItem>
                {academicData.years.map((year) => (
                  <MenuItem key={year} value={year}>
                    Year {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );

      case 'semester':
        return (
          <Grid item xs={12} sm={6} md={2} key="semester">
            <FormControl {...commonProps}>
              <InputLabel>Semester {academicData.semesters.length > 0 ? `(${academicData.semesters.length})` : ''}</InputLabel>
              <Select
                value={getFilterValue('semester')}
                label={`Semester ${academicData.semesters.length > 0 ? `(${academicData.semesters.length})` : ''}`}
                onChange={(e) => handleFilterChange('semester', e.target.value)}
              >
                <MenuItem value="">All Semesters</MenuItem>
                {academicData.semesters.map((semester) => (
                  <MenuItem key={semester} value={semester}>
                    Semester {semester}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );

      case 'section':
        return (
          <Grid item xs={12} sm={6} md={2} key="section">
            <FormControl {...commonProps}>
              <InputLabel>Section {academicData.sections.length > 0 ? `(${academicData.sections.length})` : ''}</InputLabel>
              <Select
                value={getFilterValue('section')}
                label={`Section ${academicData.sections.length > 0 ? `(${academicData.sections.length})` : ''}`}
                onChange={(e) => handleFilterChange('section', e.target.value)}
              >
                <MenuItem value="">All Sections</MenuItem>
                {academicData.sections.map((section) => (
                  <MenuItem key={section} value={section}>
                    Section {section}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );

      case 'subject':
        return (
          <Grid item xs={12} sm={6} md={2} key="subject">
            <FormControl {...commonProps}>
              <InputLabel>Subject {academicData.subjects.length > 0 ? `(${academicData.subjects.length})` : ''}</InputLabel>
              <Select
                value={getFilterValue('subject')}
                label={`Subject ${academicData.subjects.length > 0 ? `(${academicData.subjects.length})` : ''}`}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
              >
                <MenuItem value="">All Subjects</MenuItem>
                {academicData.subjects.map((subject) => (
                  <MenuItem key={subject.code} value={subject.fullName}>
                    {subject.name} ({subject.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        );

      case 'search':
        return (
          <Grid item xs={12} sm={6} md={3} key="search">
            <TextField
              {...commonProps}
              label="Search"
              placeholder="Search by name, code, etc."
              value={getFilterValue('search')}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </Grid>
        );

      default:
        return null;
    }
  };

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => value && value !== '').length;
  };

  return (
    <Paper sx={{ p: 2, mb: 2, ...sx }}>
      {showTitle && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListIcon />
            <Typography variant="h6">{title}</Typography>
            {getActiveFiltersCount() > 0 && (
              <Chip 
                label={`${getActiveFiltersCount()} active`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {showRefreshButton && (
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
            )}
            {showClearButton && getActiveFiltersCount() > 0 && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                color="secondary"
              >
                Clear All
              </Button>
            )}
          </Box>
        </Box>
      )}

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}

      <Grid container spacing={2}>
        {/* Render standard academic filters */}
        {showFilters.map(filterType => renderFilterField(filterType))}
        
        {/* Render custom filters */}
        {customFilters.map((customFilter, index) => (
          <Grid item xs={12} sm={6} md={2} key={`custom-${index}`}>
            {customFilter}
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default AcademicFilter;
