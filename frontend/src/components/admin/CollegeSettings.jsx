import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Box,
  Tab,
  Tabs,
  Alert,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Tooltip,
  Grid as MuiGrid,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Card,
  CardContent,
  CardHeader,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import * as XLSX from 'xlsx';
import CollegeInformation from './CollegeInformation';

const CollegeSettings = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [openDeptDialog, setOpenDeptDialog] = useState(false);
  const [openSectionDialog, setOpenSectionDialog] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    description: ''
  });
  const [sectionFormData, setSectionFormData] = useState({
    names: [],
    department: '',
    year: 1,
    semester: 1
  });
  const [uploadMode, setUploadMode] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [sectionInput, setSectionInput] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [openSubjectDialog, setOpenSubjectDialog] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectFormData, setSubjectFormData] = useState({
    code: '',
    name: '',
    department: '',
    year: '',
    semester: '',
    credits: '',
    description: ''
  });
  const [semesterSubjects, setSemesterSubjects] = useState([]);
  
  // New state for dialogs
  const [errorDialog, setErrorDialog] = useState({ open: false, message: '' });
  const [successDialog, setSuccessDialog] = useState({ open: false, message: '' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', onConfirm: null });

  const [academicDetails, setAcademicDetails] = useState([]);
  const [deptExcelFile, setDeptExcelFile] = useState(null);
  const [uploadDeptError, setUploadDeptError] = useState('');
  const [uploadDeptSuccess, setUploadDeptSuccess] = useState('');
  
  const [openYearSemDialog, setOpenYearSemDialog] = useState(false);
  const [editingYearSem, setEditingYearSem] = useState(false);
  const [yearSemFormData, setYearSemFormData] = useState({
    year: 1,
    semesters: [1, 2]
  });
  
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const [availableSemesters, setAvailableSemesters] = useState([]);

  // Quiz Settings state
  const [quizSettings, setQuizSettings] = useState({
    adminOverride: {
      enabled: false,
      password: 'admin123',
      triggerButtons: {
        button1: 'Ctrl',
        button2: '6'
      },
      sessionTimeout: 300
    },
    emergencyAccess: {
      enabled: true,
      password: 'Quiz@123',
      description: 'Emergency password allows admin access to any quiz even without registered credentials'
    },
    violationSettings: {
      maxViolations: 5,
      autoTerminate: true,
      warningThreshold: 3
    },
    loggingSettings: {
      logViolations: true,
      logAdminOverrides: true,
      retentionDays: 30
    }
  });
  const [openQuizSettingsDialog, setOpenQuizSettingsDialog] = useState(false);
  const [showEmergencyPassword, setShowEmergencyPassword] = useState(false);

  useEffect(() => {
    fetchAcademicDetails();
    fetchDepartments();
    fetchQuizSettings();
  }, []);

  const fetchAcademicDetails = async () => {
    try {
      console.log('=== FETCHING ACADEMIC DETAILS ===');
      const response = await api.get('/api/academic-details');
      console.log('Raw academic details API response:', response);
      console.log('Response type:', typeof response);

      // The data is directly in the response object
      let academicData = Array.isArray(response) ? response : [];
      console.log('Processed academic details:', academicData);
      console.log('Number of academic details:', academicData.length);

      // Set the academic details state
      setAcademicDetails(academicData);

      // Group sections by department, year, semester
      const groupedSections = {};
      academicData.forEach(detail => {
        if (detail && detail.department && detail.year && detail.semester) {
          const key = `${detail.department}-${detail.year}-${detail.semester}`;
          if (!groupedSections[key]) {
            groupedSections[key] = {
              _id: detail._id,
              department: detail.department,
              year: detail.year,
              semester: detail.semester,
              sections: detail.sections ? detail.sections.split(',').map(s => s.trim()).filter(Boolean) : []
            };
          }
        }
      });
      console.log('Grouped sections:', groupedSections);
      setSections(Object.values(groupedSections));

      // Process subjects
      const allSubjects = [];
      academicData.forEach(detail => {
        if (detail && detail.subjects) {
          const subjectsArray = detail.subjects.trim()
            ? detail.subjects.split(',').filter(s => s.trim())
            : [];

          subjectsArray.forEach(subject => {
            const match = subject.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
            if (match) {
              allSubjects.push({
                _id: detail._id,
                name: match[1].trim(),
                code: match[2],
                department: detail.department,
                year: detail.year || 1,
                semester: detail.semester || 1,
                credits: detail.credits || 3
              });
            }
          });
        }
      });
      console.log('Extracted subjects:', allSubjects);
      setSubjects(allSubjects);

    } catch (error) {
      console.error('Error fetching academic details:', error);
      const errorMessage = error.response?.message ||
                         error.message ||
                         'Failed to fetch academic details';
      setErrorDialog({
        open: true,
        message: errorMessage
      });
      // Reset all state on error
      setAcademicDetails([]);
      setSections([]);
      setSubjects([]);
    }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('=== DEPARTMENT SUBMIT START ===');
      console.log('Form data:', deptFormData);
      console.log('Selected dept:', selectedDept);

      if (!deptFormData.name || !deptFormData.code) {
        console.log('Validation failed: missing name or code');
        showError('Department name and code are required');
        return;
      }

      if (!deptFormData.name.trim() || !deptFormData.code.trim()) {
        console.log('Validation failed: empty name or code after trim');
        showError('Department name and code cannot be empty');
        return;
      }

      console.log('Submitting department data:', deptFormData);

      let response;
      if (selectedDept) {
        console.log('Updating existing department...');
        response = await api.put(`/api/admin/settings/departments/${selectedDept._id}`, deptFormData);
        console.log('Department update response:', response);
      } else {
        console.log('Creating new department...');
        response = await api.post('/api/admin/settings/departments', deptFormData);
        console.log('Department create response:', response);
      }

      console.log('API call successful, refreshing data...');

      // Refresh both departments and academic details
      await Promise.all([
        fetchDepartments(),
        fetchAcademicDetails()
      ]);

      console.log('Data refreshed, closing dialog...');

      setOpenDeptDialog(false);
      setDeptFormData({ name: '', code: '', description: '' });
      setSelectedDept(null);

      // Show success message
      const action = selectedDept ? 'updated' : 'created';
      console.log(`Department ${action} successfully`);
      console.log('=== DEPARTMENT SUBMIT END ===');

    } catch (error) {
      console.error('=== DEPARTMENT SUBMIT ERROR ===');
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      const errorMessage = error.response?.data?.message || error.message || 'Error saving department';
      console.error('Showing error to user:', errorMessage);
      showError(errorMessage);
    }
  };

  const handleSectionSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log('=== SECTION SUBMIT START ===');
      console.log('Form data:', sectionFormData);
      console.log('Section input:', sectionInput);
      console.log('Available semesters:', availableSemesters);

      // Enhanced validation with detailed error messages
      if (!sectionFormData.department) {
        console.log('Validation failed: missing department');
        showError('Please select a department');
        return;
      }

      if (!sectionFormData.year) {
        console.log('Validation failed: missing year');
        showError('Please select a year');
        return;
      }

      if (!sectionFormData.semester) {
        console.log('Validation failed: missing semester');
        showError('Please select a semester');
        return;
      }

      if (sectionFormData.names.length === 0) {
        console.log('Validation failed: no sections provided');
        showError('Please add at least one section');
        return;
      }

      // Validate section format
      const invalidSections = sectionFormData.names.filter(section => !/^[A-Z]$/.test(section));
      if (invalidSections.length > 0) {
        console.log('Validation failed: invalid section format:', invalidSections);
        showError(`Invalid section format: ${invalidSections.join(', ')}. Sections must be single uppercase letters (A, B, C, etc.)`);
        return;
      }

      const academicDetailData = {
        department: sectionFormData.department,
        year: sectionFormData.year,
        semester: sectionFormData.semester,
        sections: sectionFormData.names.join(','),
        subjects: '',
        credits: 3
      };

      console.log('Submitting academic detail:', academicDetailData);

      let response;
      if (selectedSection) {
        // Update existing academic detail
        console.log('Updating existing academic detail with ID:', selectedSection._id);
        response = await api.put(`/api/academic-details/${selectedSection._id}`, academicDetailData);
        console.log('Academic detail updated successfully:', response);
      } else {
        // Create new academic detail
        console.log('Creating new academic detail');
        response = await api.post('/api/academic-details', academicDetailData);
        console.log('Academic detail created successfully:', response);
      }

      // Refresh data
      await fetchAcademicDetails();
      // Reset form
      setSectionFormData({
        names: [],
        department: '',
        year: 1,
        semester: 1
      });
      setSectionInput('');
      setSelectedSection(null);
      setOpenSectionDialog(false);

      console.log('=== SECTION SUBMIT COMPLETE ===');
    } catch (error) {
      console.error('=== SECTION SUBMIT ERROR ===');
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);

      let errorMessage = 'Failed to save academic details';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error('Showing error to user:', errorMessage);
      showError(errorMessage);
    }
  };

  const handleSubjectSubmit = async () => {
    try {
      if (!subjectFormData.name || !subjectFormData.code) {
        showError('Please fill in all required subject fields');
        return;
      }

      // Use sectionFormData for department, year, semester since that's where the main form data is stored
      if (!sectionFormData.department || !sectionFormData.year || !sectionFormData.semester) {
        showError('Please select a valid department, year, and semester first');
        return;
      }

      const newSubject = `${subjectFormData.name.trim()}(${subjectFormData.code.trim()})`;

      // Find existing academic detail using sectionFormData
      const existingDetail = academicDetails.find(detail =>
        detail.department === sectionFormData.department &&
        detail.year === Number(sectionFormData.year) &&
        detail.semester === Number(sectionFormData.semester)
      );

      if (!existingDetail) {
        showError('Please select a valid department, year, and semester first');
        return;
      }

      // Check if subject code already exists in any academic detail
      const subjectCodeExists = academicDetails.some(detail => {
        if (!detail.subjects) return false;
        return detail.subjects.split(',')
          .some(subject => {
            const match = subject.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
            if (!match) return false;
            return match[2] === subjectFormData.code && 
                   (!selectedSubject || subject.trim() !== selectedSubject);
          });
      });

      if (subjectCodeExists) {
        showError(`Subject code ${subjectFormData.code} already exists. Please use a unique code.`);
        return;
      }

      // Get current subjects and add the new one
      const currentSubjects = existingDetail.subjects ? 
        existingDetail.subjects.split(',').filter(s => s.trim()) : 
        [];

      let updatedSubjects;
      if (selectedSubject) {
        // Update existing subject
        updatedSubjects = currentSubjects.map(s => 
          s.trim() === selectedSubject ? newSubject : s
        );
      } else {
        // Add new subject
        updatedSubjects = [...currentSubjects, newSubject];
      }

      // Update the academic detail
      const response = await api.put(`/api/academic-details/${existingDetail._id}`, {
        ...existingDetail,
        subjects: updatedSubjects.join(','),
        credits: subjectFormData.credits || existingDetail.credits || 3
      });

      if (response) {
        await fetchAcademicDetails();
        // Reset only the subject name and code, keep department/year/semester for next subject
        setSubjectFormData({
          name: '',
          code: '',
          department: sectionFormData.department,
          year: sectionFormData.year,
          semester: sectionFormData.semester,
          credits: '',
          description: ''
        });
        setSelectedSubject(null);
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      showError(error.response?.data?.message || 'Error saving subject');
    }
  };

  const handleDeleteDepartment = async (id) => {
    showConfirmation(
      'Are you sure you want to delete this department? This will also delete all associated academic details.',
      async () => {
        try {
          await api.delete(`/api/admin/settings/departments/${id}`);
          await fetchDepartments();
          await fetchAcademicDetails();
        } catch (error) {
          console.error('Error deleting department:', error);
          showError('Error deleting department');
        }
      }
    );
  };

  const handleDeleteSection = async (detail, sectionIndex) => {
    try {
      if (!detail || !detail._id) {
        showError('Invalid academic detail');
        return;
      }

      const sections = detail.sections.split(',').map(s => s.trim());
      sections.splice(sectionIndex, 1);
      const updatedSections = sections.join(',');

      const response = await api.put(`/api/academic-details/${detail._id}`, {
        ...detail,
        sections: updatedSections
      });

      if (response) {
        await fetchAcademicDetails();
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      showError(error.response?.data?.message || 'Error deleting section');
    }
  };

  const handleDeleteSubject = async (detail, subjectIndex) => {
    try {
      if (!detail || !detail._id) {
        showError('Invalid academic detail');
        return;
      }

      const subjects = detail.subjects.split(',').map(s => s.trim());
      subjects.splice(subjectIndex, 1);
      const updatedSubjects = subjects.join(',');

      const response = await api.put(`/api/academic-details/${detail._id}`, {
        ...detail,
        subjects: updatedSubjects
      });

      if (response) {
        await fetchAcademicDetails();
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      showError(error.response?.data?.message || 'Error deleting subject');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        setUploadError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setExcelFile(file);
      setUploadError('');
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['Department', 'Year', 'Semester', 'Sections', 'Subjects', 'Credits'],
      ['Computer Science', '1', '1', 'A,B,C', 'Programming Fundamentals(CS101),Digital Logic(CS102)', '4'],
      ['Computer Science', '1', '2', 'A,B,C', 'Data Structures(CS201),OOP(CS202)', '3'],
      ['Electronics', '2', '3', 'A,B', 'Circuit Theory(EC201),Electronic Devices(EC202)', '4']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Academic Details Template');
    XLSX.writeFile(wb, 'academic_details_template.xlsx');
  };

  const handleExcelUpload = async () => {
    try {
      if (!excelFile) {
        setUploadError('Please select a file first');
        return;
      }

      const formData = new FormData();
      formData.append('file', excelFile);

      const response = await api.post('/api/settings/upload-academic-details', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadSuccess('Academic details uploaded successfully');
      fetchSections();
      fetchSubjects();
      setExcelFile(null);
      setOpenSectionDialog(false);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error.response?.data?.message || 'Error uploading file. Please try again.');
    }
  };

  const handleUploadExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/api/academic-details/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Refresh the data
      fetchAcademicDetails();
      setUploadSuccess('Academic details uploaded successfully');
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Error uploading academic details');
    }
  };

  const handleDeleteAcademicDetail = async (id) => {
    try {
      showConfirmation(
        'Are you sure you want to delete this academic detail? This action cannot be undone.',
        async () => {
          const response = await api.delete(`/api/academic-details/${id}`);
          if (response) {
            await fetchAcademicDetails();
          }
        }
      );
    } catch (error) {
      console.error('Error deleting academic detail:', error);
      showError(error.response?.data?.message || 'Error deleting academic detail');
    }
  };

  // Function to show error dialog
  const showError = (message) => {
    setErrorDialog({ open: true, message });
  };

  // Function to show success dialog
  const showSuccess = (message) => {
    setSuccessDialog({ open: true, message });
  };

  // Function to show confirmation dialog
  const showConfirmation = (message, onConfirm) => {
    setConfirmDialog({ open: true, message, onConfirm });
  };

  // Function to get available semesters for a department and year
  const getAvailableSemesters = (department, year) => {
    if (!department || !year) return [];

    // Get semesters from the year/semester configuration (first table)
    // This gets all semesters configured for the specified year across all departments
    const yearConfigs = academicDetails.reduce((acc, detail) => {
      if (!detail) return acc;
      const detailYear = detail.year;
      if (!acc[detailYear]) {
        acc[detailYear] = new Set();
      }
      acc[detailYear].add(detail.semester);
      return acc;
    }, {});

    // Get semesters for the selected year
    const availableSemesters = yearConfigs[Number(year)] ?
      Array.from(yearConfigs[Number(year)]).sort((a, b) => a - b) : [];

    return availableSemesters;
  };

  // Update semester options when year or department changes
  useEffect(() => {
    if (sectionFormData.department && sectionFormData.year) {
      const semesters = getAvailableSemesters(sectionFormData.department, sectionFormData.year);
      setAvailableSemesters(semesters);

      // If current semester is not in available semesters, reset it
      if (sectionFormData.semester && !semesters.includes(sectionFormData.semester)) {
        setSectionFormData({
          ...sectionFormData,
          semester: ''
        });
        setSubjectFormData({
          ...subjectFormData,
          semester: ''
        });
      }
    } else {
      setAvailableSemesters([]);
    }
  }, [sectionFormData.department, sectionFormData.year, academicDetails]);

  // Note: Removed automatic synchronization useEffect to prevent circular updates
  // sectionInput and sectionFormData.names are now managed independently

  // Function to download department template
  const downloadDeptTemplate = () => {
    const template = [
      ['Department Name', 'Department Code', 'Description'],
      ['Computer Science and Engineering', 'CSE', 'Description for CSE'],
      ['Electronics and Communication Engineering', 'ECE', 'Description for ECE']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Departments Template');
    XLSX.writeFile(wb, 'departments_template.xlsx');
  };

  // Function to handle department file upload
  const handleDeptFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        setUploadDeptError('Please upload an Excel file (.xlsx or .xls)');
        return;
      }
      setDeptExcelFile(file);
      setUploadDeptError('');
    }
  };

  // Function to handle department excel upload
  const handleDeptExcelUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('file', deptExcelFile);

      const response = await api.post('/api/admin/settings/departments/upload', formData);
      
      if (response.success > 0) {
        setUploadDeptSuccess(`Successfully uploaded ${response.success} departments`);
        fetchDepartments();
      }
      
      if (response.errors?.length > 0) {
        setUploadDeptError(response.errors.join('\n'));
      }

      setTimeout(() => {
        setOpenUploadDialog(false);
        setDeptExcelFile(null);
        setUploadDeptError('');
        setUploadDeptSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error uploading departments:', error);
      setUploadDeptError(error.response?.data?.message || 'Error uploading departments');
    }
  };

  const handleYearSemSubmit = async () => {
    try {
      if (!yearSemFormData.year || yearSemFormData.semesters.length === 0) {
        showError('Please fill in all required fields');
        return;
      }

      // Create year/semester configuration for all existing departments
      const response = await api.post('/api/admin/academic-details/years-semesters', yearSemFormData);
      if (response) {
        await fetchAcademicDetails();
        setOpenYearSemDialog(false);
        setEditingYearSem(false);
        setYearSemFormData({
          year: 1,
          semesters: [1, 2]
        });
      }
    } catch (error) {
      console.error('Error saving year/semester configuration:', error);
      showError(error.response?.data?.message || 'Error saving year/semester configuration');
    }
  };

  const handleDeleteYearConfig = async (department, year) => {
    showConfirmation(
      `Are you sure you want to delete all Year ${year} configurations? This will remove Year ${year} from all departments and cannot be undone.`,
      async () => {
        try {
          console.log(`Deleting year ${year} configuration`);

          // Use the admin endpoint to delete all academic details for the given year
          const response = await api.delete(`/api/admin/academic-details/year/${year}`);

          console.log('Delete response:', response);

          await fetchAcademicDetails();
          showSuccess(`Year ${year} configuration deleted successfully`);
        } catch (error) {
          console.error('Error deleting year/semester configuration:', error);
          showError(error.response?.data?.message || 'Error deleting year/semester configuration');
        }
      }
    );
  };



  const handleDeleteSemester = async (year, semester) => {
    showConfirmation(
      `Are you sure you want to delete Semester ${semester} from Year ${year}? This will remove this semester from all departments and cannot be undone.`,
      async () => {
        try {
          console.log(`🗑️ Deleting semester ${semester} from year ${year}`);

          // Get all academic details for this year and semester
          const detailsToDelete = academicDetails.filter(detail =>
            detail.year === year && detail.semester === semester
          );

          console.log(`📋 Found ${detailsToDelete.length} academic details to delete`);

          if (detailsToDelete.length === 0) {
            showError('No academic details found for this semester');
            return;
          }

          // Delete each academic detail individually
          let successCount = 0;
          let errorCount = 0;

          for (const detail of detailsToDelete) {
            try {
              console.log(`🗑️ Deleting academic detail: ${detail.department} Y${detail.year} S${detail.semester}`);
              await api.delete(`/api/academic-details/${detail._id}`);
              successCount++;
              console.log(`✅ Successfully deleted: ${detail.department} Y${detail.year} S${detail.semester}`);
            } catch (deleteError) {
              console.error(`❌ Failed to delete: ${detail.department} Y${detail.year} S${detail.semester}`, deleteError);
              errorCount++;
            }
          }

          console.log(`📊 Deletion summary: ${successCount} successful, ${errorCount} failed`);

          // Refresh the data
          await fetchAcademicDetails();

          if (errorCount === 0) {
            showSuccess(`Semester ${semester} removed from Year ${year} successfully`);
          } else if (successCount > 0) {
            showSuccess(`Partially successful: ${successCount} deleted, ${errorCount} failed`);
          } else {
            showError('Failed to delete semester configuration');
          }

        } catch (error) {
          console.error('❌ Error in handleDeleteSemester:', error);
          showError('Error deleting semester configuration');
        }
      }
    );
  };

  const fetchDepartments = async () => {
    try {
      console.log('=== FETCHING DEPARTMENTS ===');
      const response = await api.get('/api/admin/settings/departments');
      console.log('Departments API response:', response);
      console.log('Response type:', typeof response);
      console.log('Response keys:', Object.keys(response || {}));

      // The backend returns { departments: [...] }
      if (response && response.departments && Array.isArray(response.departments)) {
        console.log('Setting departments:', response.departments);
        console.log('Number of departments:', response.departments.length);
        setDepartments(response.departments);
      } else {
        console.log('No departments found in response or invalid format');
        console.log('Response structure:', JSON.stringify(response, null, 2));
        setDepartments([]);
      }
      console.log('Current departments state after fetch:', departments);
      console.log('=== FETCH DEPARTMENTS COMPLETE ===');
    } catch (error) {
      console.error('=== FETCH DEPARTMENTS ERROR ===');
      console.error('Full error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);

      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        showError('Authentication error. Please check if you are logged in as admin.');
      } else {
        showError('Error fetching departments: ' + (error.response?.data?.message || error.message));
      }
      setDepartments([]);
    }
  };

  // Quiz Settings Functions
  const fetchQuizSettings = async () => {
    try {
      console.log('=== FETCHING QUIZ SETTINGS ===');
      const response = await api.get('/api/admin/quiz-settings');
      console.log('Quiz settings response:', response);

      if (response) {
        // Clean up any legacy defaultSecuritySettings that might still exist in database
        const cleanedSettings = { ...response };
        delete cleanedSettings.defaultSecuritySettings;

        // Ensure only allowed settings remain
        const allowedSettings = {
          adminOverride: cleanedSettings.adminOverride || {
            enabled: false,
            password: 'admin123',
            triggerButtons: { button1: 'Ctrl', button2: '6' },
            sessionTimeout: 300
          },
          emergencyAccess: cleanedSettings.emergencyAccess || {
            enabled: true,
            password: 'Quiz@123',
            description: 'Emergency password allows admin access to any quiz even without registered credentials'
          },
          violationSettings: cleanedSettings.violationSettings || {
            maxViolations: 5,
            autoTerminate: true,
            warningThreshold: 3
          },
          loggingSettings: cleanedSettings.loggingSettings || {
            logViolations: true,
            logAdminOverrides: true,
            retentionDays: 30
          }
        };

        console.log('Cleaned quiz settings (removed defaultSecuritySettings):', allowedSettings);
        setQuizSettings(allowedSettings);
      }
    } catch (error) {
      console.error('Error fetching quiz settings:', error);
      showError('Error fetching quiz settings: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleQuizSettingsSubmit = async () => {
    try {
      console.log('=== UPDATING QUIZ SETTINGS ===');
      console.log('Quiz settings data:', quizSettings);

      // Ensure trigger buttons are properly set
      const settingsToSend = {
        ...quizSettings,
        adminOverride: {
          ...quizSettings.adminOverride,
          triggerButtons: {
            button1: quizSettings.adminOverride?.triggerButtons?.button1 || 'Ctrl',
            button2: quizSettings.adminOverride?.triggerButtons?.button2 || '6'
          }
        }
      };

      console.log('Settings to send:', settingsToSend);

      const response = await api.put('/api/admin/quiz-settings', settingsToSend);
      console.log('Update response:', response);

      showSuccess('Quiz settings updated successfully');
      setOpenQuizSettingsDialog(false);
      await fetchQuizSettings(); // Refresh data
    } catch (error) {
      console.error('Error updating quiz settings:', error);
      showError('Error updating quiz settings: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleQuizSettingsChange = (section, field, value) => {
    setQuizSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedQuizSettingsChange = (section, subsection, field, value) => {
    setQuizSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  // Simpler handler for direct field updates
  const handleDirectQuizSettingsChange = (section, field, value) => {
    console.log(`🔧 Quiz Settings Change: ${section}.${field} = ${value}`);
    setQuizSettings(prev => {
      const newSettings = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      };
      console.log('🔧 Updated quiz settings:', newSettings);
      return newSettings;
    });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 2, md: 4 }, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Typography
        variant={isMobile ? "h5" : "h4"}
        gutterBottom
        sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}
      >
        College Settings
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              fontSize: { xs: '0.8rem', md: '0.875rem' },
              minWidth: { xs: 'auto', md: 160 },
              px: { xs: 1, md: 3 }
            }
          }}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
        >
          <Tab label={isMobile ? "Academic" : "Academic Configuration"} />
          <Tab label={isMobile ? "College" : "College Information"} />
          <Tab label={isMobile ? "Quiz" : "Quiz Settings"} />
        </Tabs>
      </Paper>

      {tabValue === 0 && (
        <Grid container spacing={3}>
        {/* Top Row with Years/Semesters and Departments */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box
              display="flex"
              flexDirection={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              mb={2}
              gap={{ xs: 1, sm: 0 }}
            >
              <Typography
                variant="h6"
                sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}
              >
                Years and Semesters Configuration
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                size="small"
                onClick={() => {
                  setYearSemFormData({
                    year: 1,
                    semesters: [1, 2]
                  });
                  setEditingYearSem(false);
                  setOpenYearSemDialog(true);
                }}
                sx={{
                  fontSize: '0.75rem',
                  minWidth: 'auto',
                  px: { xs: 1.5, sm: 2 },
                  py: 0.5,
                  height: '32px'
                }}
              >
                {isMobile ? 'Add Year' : 'Add Year Configuration'}
              </Button>
            </Box>

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Year</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Semesters</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    // Get unique year configurations across all departments
                    const yearConfigs = academicDetails.reduce((acc, detail) => {
                      if (!detail) return acc;
                      const year = detail.year;
                      if (!acc[year]) {
                        acc[year] = new Set();
                      }
                      acc[year].add(detail.semester);
                      return acc;
                    }, {});

                    const yearEntries = Object.entries(yearConfigs);

                    return yearEntries.length > 0 ? (
                      yearEntries.map(([year, semesters]) => (
                        <TableRow key={year}>
                          <TableCell sx={{ fontSize: { xs: '0.7rem', md: '0.875rem' }, py: 0.5 }}>
                            Year {year}
                          </TableCell>
                          <TableCell sx={{ py: 0.5 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.25 }}>
                              {Array.from(semesters).sort((a, b) => a - b).map((sem) => (
                                <Box key={sem} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                  <Chip
                                    label={isMobile ? `S${sem}` : `Semester ${sem}`}
                                    size="small"
                                    color="secondary"
                                    variant="outlined"
                                    sx={{
                                      fontSize: '0.7rem',
                                      height: '20px',
                                      '& .MuiChip-label': { px: 0.5 }
                                    }}
                                  />
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDeleteSemester(Number(year), sem)}
                                    sx={{
                                      p: 0.125,
                                      '&:hover': {
                                        backgroundColor: 'error.light',
                                        color: 'error.contrastText'
                                      }
                                    }}
                                    title={`Remove Semester ${sem} from Year ${year}`}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setYearSemFormData({
                                    year: Number(year),
                                    semesters: Array.from(semesters)
                                  });
                                  setEditingYearSem(true);
                                  setOpenYearSemDialog(true);
                                }}
                                title="Edit year configuration"
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleDeleteYearConfig('', Number(year))}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No year configurations found. Click "Add Year Configuration" to create one.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Departments */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box
              display="flex"
              flexDirection={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'stretch', sm: 'center' }}
              mb={2}
              gap={{ xs: 1, sm: 0 }}
            >
              <Typography
                variant="h6"
                sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}
              >
                Departments
              </Typography>
              <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 0.5, sm: 1 },
                width: { xs: '100%', sm: 'auto' }
              }}>
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => setOpenUploadDialog(true)}
                  size="small"
                  sx={{
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                    px: { xs: 1, sm: 1.5 },
                    py: 0.5,
                    height: '32px'
                  }}
                >
                  {isMobile ? 'Upload' : 'Upload Excel'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedDept(null);
                    setDeptFormData({ name: '', code: '', description: '' });
                    setOpenDeptDialog(true);
                  }}
                  size="small"
                  sx={{
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                    px: { xs: 1, sm: 1.5 },
                    py: 0.5,
                    height: '32px'
                  }}
                >
                  {isMobile ? 'Add' : 'Add Department'}
                </Button>
              </Box>
            </Box>

            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Name</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Code</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    console.log('Rendering departments table. Departments state:', departments);
                    console.log('Departments length:', departments.length);
                    console.log('Departments array:', JSON.stringify(departments, null, 2));

                    return departments.length > 0 ? (
                      departments.map((dept) => {
                        console.log('Rendering department:', dept);
                        return (
                          <TableRow key={dept._id}>
                            <TableCell>{dept.name}</TableCell>
                            <TableCell>{dept.code}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSelectedDept(dept);
                                    setDeptFormData({
                                      name: dept.name,
                                      code: dept.code,
                                      description: dept.description || ''
                                    });
                                    setOpenDeptDialog(true);
                                  }}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeleteDepartment(dept._id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No departments found. Click "Add Department" to create one.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Academic Details */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Academic Details</Typography>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  onClick={() => {
                    setUploadMode(true);
                    setOpenSectionDialog(true);
                  }}
                >
                  Upload Excel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedSection(null);
                    setSectionFormData({
                      names: [],
                      department: '',
                      year: 1,
                      semester: 1
                    });
                    setSubjectFormData({
                      code: '',
                      name: '',
                      department: '',
                      year: '',
                      semester: '',
                      credits: ''
                    });
                    setUploadMode(false);
                    setOpenSectionDialog(true);
                  }}
                >
                  Add Academic Details
                </Button>
              </Box>
            </Box>

            {/* Filters */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1, sm: 2 }}
              mb={2}
              sx={{ flexWrap: 'wrap' }}
            >
              <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }}>
                <InputLabel sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                  Filter by Department
                </InputLabel>
                <Select
                  value={filterDepartment || ''}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  label="Filter by Department"
                  size={isMobile ? "small" : "medium"}
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  <MenuItem value="">All Departments</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept._id} value={dept.name}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: { xs: '100%', sm: 120 } }}>
                <InputLabel sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                  Filter by Year
                </InputLabel>
                <Select
                  value={filterYear || ''}
                  onChange={(e) => setFilterYear(e.target.value)}
                  label="Filter by Year"
                  size={isMobile ? "small" : "medium"}
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  <MenuItem value="">All Years</MenuItem>
                  {Array.from(new Set(academicDetails.map(detail => detail.year))).sort((a, b) => a - b).map((year) => (
                    <MenuItem key={year} value={year}>
                      Year {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: { xs: '100%', sm: 120 } }}>
                <InputLabel sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}>
                  Filter by Semester
                </InputLabel>
                <Select
                  value={filterSemester || ''}
                  onChange={(e) => setFilterSemester(e.target.value)}
                  label="Filter by Semester"
                  size={isMobile ? "small" : "medium"}
                  sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                >
                  <MenuItem value="">All Semesters</MenuItem>
                  {Array.from(new Set(academicDetails.map(detail => detail.semester))).sort((a, b) => a - b).map((semester) => (
                    <MenuItem key={semester} value={semester}>
                      Semester {semester}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Academic Details Table */}
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Dept</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Yr</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Sem</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Subjects</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Sections</strong>
                    </TableCell>
                    <TableCell sx={{ fontSize: { xs: '0.75rem', md: '0.875rem' }, py: 1 }}>
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {academicDetails.length > 0 ? (
                    academicDetails
                      .filter(detail => {
                        if (!detail) return false;
                        if (filterDepartment && detail.department !== filterDepartment) return false;
                        if (filterYear && detail.year !== Number(filterYear)) return false;
                        if (filterSemester && detail.semester !== Number(filterSemester)) return false;
                        return true;
                      })
                      .map((detail) => (
                        <TableRow key={detail._id}>
                          <TableCell>{detail.department}</TableCell>
                          <TableCell>Year {detail.year}</TableCell>
                          <TableCell>Semester {detail.semester}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {detail.subjects?.split(',')
                                .filter(subject => subject.trim())
                                .map((subject, idx) => {
                                  const match = subject.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
                                  if (!match) return null;
                                  
                                  return (
                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Chip
                                        label={`${match[1].trim()} (${match[2]})`}
                                        size="small"
                                        variant="outlined"
                                        onDelete={() => handleDeleteSubject(detail, idx)}
                                      />
                                      <IconButton
                                        size="small"
                                        onClick={() => {
                                          setSelectedSection(detail);
                                          setSectionFormData({
                                            names: detail.sections ? detail.sections.split(',').map(s => s.trim()) : [],
                                            department: detail.department,
                                            year: detail.year,
                                            semester: detail.semester
                                          });
                                          setSubjectFormData({
                                            name: match[1].trim(),
                                            code: match[2],
                                            department: detail.department,
                                            year: detail.year,
                                            semester: detail.semester,
                                            credits: detail.credits || 3
                                          });
                                          setSelectedSubject(subject.trim());
                                          setOpenSectionDialog(true);
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Box>
                                  );
                                })}
                              <Box sx={{ mt: 1 }}>
                                <Chip
                                  icon={<AddIcon />}
                                  label="Add Subject"
                                  color="primary"
                                  variant="outlined"
                                  onClick={() => {
                                    const sectionNames = detail.sections ? detail.sections.split(',').map(s => s.trim()) : [];
                                    setSelectedSection(detail);
                                    setSectionFormData({
                                      names: sectionNames,
                                      department: detail.department,
                                      year: detail.year,
                                      semester: detail.semester
                                    });
                                    setSectionInput(sectionNames.join(', '));
                                    setSubjectFormData({
                                      name: '',
                                      code: '',
                                      department: detail.department,
                                      year: detail.year,
                                      semester: detail.semester,
                                      credits: detail.credits || 3
                                    });
                                    setSelectedSubject(null);
                                    setOpenSectionDialog(true);
                                  }}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {detail.sections?.split(',').map((section, idx) => (
                                  section.trim() && (
                                    <Chip
                                      key={idx}
                                      label={section.trim()}
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                      onDelete={() => handleDeleteSection(detail, idx)}
                                    />
                                  )
                                ))}
                              </Box>
                              <Box sx={{ mt: 1 }}>
                                <Chip
                                  icon={<AddIcon />}
                                  label="Add Section"
                                  color="primary"
                                  variant="outlined"
                                  onClick={() => {
                                    const sectionNames = detail.sections ? detail.sections.split(',').map(s => s.trim()) : [];
                                    setSelectedSection(detail);
                                    setSectionFormData({
                                      names: sectionNames,
                                      department: detail.department,
                                      year: detail.year,
                                      semester: detail.semester
                                    });
                                    setSectionInput(sectionNames.join(', '));
                                    setUploadMode(false);
                                    setOpenSectionDialog(true);
                                  }}
                                />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  const sectionNames = detail.sections ? detail.sections.split(',').map(s => s.trim()) : [];
                                  setSelectedSection(detail);
                                  setSectionFormData({
                                    names: sectionNames,
                                    department: detail.department,
                                    year: detail.year,
                                    semester: detail.semester
                                  });
                                  setSectionInput(sectionNames.join(', '));
                                  setUploadMode(false);
                                  setOpenSectionDialog(true);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => handleDeleteAcademicDetail(detail._id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        No academic details found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Year/Semester Configuration Dialog */}
        <Dialog
          open={openYearSemDialog}
          onClose={() => {
            setOpenYearSemDialog(false);
            setEditingYearSem(false);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingYearSem ? 'Edit Year Configuration' : 'Add Year Configuration'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth margin="normal">
                <TextField
                  fullWidth
                  type="number"
                  label="Year"
                  value={yearSemFormData.year}
                  onChange={(e) => setYearSemFormData({
                    ...yearSemFormData,
                    year: parseInt(e.target.value) || ''
                  })}
                  inputProps={{ min: 1 }}
                  required
                />
              </FormControl>

              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Semesters
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <Chip
                    key={sem}
                    label={`Semester ${sem}`}
                    color={yearSemFormData.semesters.includes(sem) ? "primary" : "default"}
                    onClick={() => {
                      const newSemesters = yearSemFormData.semesters.includes(sem)
                        ? yearSemFormData.semesters.filter(s => s !== sem)
                        : [...yearSemFormData.semesters, sem].sort();
                      setYearSemFormData({
                        ...yearSemFormData,
                        semesters: newSemesters
                      });
                    }}
                    onDelete={yearSemFormData.semesters.includes(sem) ? () => {
                      const newSemesters = yearSemFormData.semesters.filter(s => s !== sem);
                      setYearSemFormData({
                        ...yearSemFormData,
                        semesters: newSemesters
                      });
                    } : undefined}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>

              {/* Show selected semesters summary */}
              {yearSemFormData.semesters.length > 0 && (
                <Box sx={{ mt: 2, p: 1, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="body2" color="primary.contrastText">
                    Selected: {yearSemFormData.semesters.sort((a, b) => a - b).map(s => `Semester ${s}`).join(', ')}
                  </Typography>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenYearSemDialog(false);
              setEditingYearSem(false);
            }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleYearSemSubmit}
              disabled={!yearSemFormData.year || yearSemFormData.semesters.length === 0}
            >
              {editingYearSem ? 'Update Configuration' : 'Add Configuration'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Department Upload Dialog */}
        <Dialog
          open={openUploadDialog}
          onClose={() => setOpenUploadDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Upload Departments</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Upload an Excel file with the following columns:
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 2 }}>
                <ul>
                  <li>Department Name (required)</li>
                  <li>Department Code (required)</li>
                  <li>Description (optional)</li>
                </ul>
              </Typography>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                fullWidth
              >
                Choose Excel File
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={(e) => setDeptExcelFile(e.target.files[0])}
                />
              </Button>
              {deptExcelFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {deptExcelFile.name}
                </Typography>
              )}
              {uploadDeptError && (
                <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                  {uploadDeptError}
                </Typography>
              )}
              {uploadDeptSuccess && (
                <Typography color="success.main" variant="body2" sx={{ mt: 1 }}>
                  {uploadDeptSuccess}
                </Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenUploadDialog(false);
              setDeptExcelFile(null);
              setUploadDeptError('');
              setUploadDeptSuccess('');
            }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleDeptExcelUpload}
              disabled={!deptExcelFile}
            >
              Upload
            </Button>
          </DialogActions>
        </Dialog>

        {/* Department Form Dialog */}
        <Dialog
          open={openDeptDialog}
          onClose={() => setOpenDeptDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {selectedDept ? 'Edit Department' : 'Add Department'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Department Name"
                value={deptFormData.name}
                onChange={(e) => setDeptFormData({
                  ...deptFormData,
                  name: e.target.value
                })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Department Code"
                value={deptFormData.code}
                onChange={(e) => setDeptFormData({
                  ...deptFormData,
                  code: e.target.value
                })}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                label="Description"
                value={deptFormData.description}
                onChange={(e) => setDeptFormData({
                  ...deptFormData,
                  description: e.target.value
                })}
                margin="normal"
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeptDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleDeptSubmit}
              disabled={!deptFormData.name || !deptFormData.code}
            >
              {selectedDept ? 'Update' : 'Add'} Department
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add/Edit Academic Details Dialog */}
        <Dialog 
          open={openSectionDialog} 
          onClose={() => {
            setOpenSectionDialog(false);
            setUploadMode(false);
            setExcelFile(null);
            setUploadError('');
            setUploadSuccess('');
            setSectionFormData({
              names: [],
              department: '',
              year: 1,
              semester: 1
            });
            setSubjectFormData({
              code: '',
              name: '',
              department: '',
              year: '',
              semester: '',
              credits: '',
              description: ''
            });
            setSelectedSection(null);
            setSelectedSubject(null);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {uploadMode ? 'Upload Academic Details' : selectedSection ? 'Edit Academic Details' : 'Add Academic Details'}
          </DialogTitle>
          <DialogContent>
            {uploadError && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {uploadError}
              </Alert>
            )}
            {uploadSuccess && (
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                {uploadSuccess}
              </Alert>
            )}

            {uploadMode ? (
              // Upload mode content
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Upload Excel File with Academic Details
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Department</strong></TableCell>
                        <TableCell><strong>Year</strong></TableCell>
                        <TableCell><strong>Semester</strong></TableCell>
                        <TableCell><strong>Sections</strong></TableCell>
                        <TableCell><strong>Subjects</strong></TableCell>
                        <TableCell><strong>Credits</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>Computer Science</TableCell>
                        <TableCell>1</TableCell>
                        <TableCell>1</TableCell>
                        <TableCell>A,B,C</TableCell>
                        <TableCell>Programming Fundamentals(CS101),Digital Logic(CS102)</TableCell>
                        <TableCell>4</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
                  <strong>Note:</strong> For subjects, use the format: subject_name(subject_code),next_subject_name(next_subject_code)
                  <br />
                  Example: Programming Fundamentals(CS101),Digital Logic(CS102)
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={downloadTemplate}
                  >
                    Download Template
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload">
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={<UploadIcon />}
                    >
                      Choose File
                    </Button>
                  </label>
                </Box>
                {excelFile && (
                  <Typography variant="body2" color="text.secondary">
                    Selected file: {excelFile.name}
                  </Typography>
                )}
              </Box>
            ) : (
              // Add/Edit mode content
              <Box sx={{ mt: 2 }}>
                {/* Department Selection */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={sectionFormData.department}
                    onChange={(e) => {
                      console.log('Department changed to:', e.target.value);
                      console.log('Available departments:', departments);
                      setSectionFormData({
                        ...sectionFormData,
                        department: e.target.value,
                        year: '',
                        semester: '',
                        names: []
                      });
                      setSubjectFormData({
                        ...subjectFormData,
                        department: e.target.value,
                        year: '',
                        semester: ''
                      });
                    }}
                    label="Department"
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept.name} value={dept.name}>
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Year Selection */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Year</InputLabel>
                  <Select
                    value={sectionFormData.year}
                    onChange={(e) => {
                      console.log('Year changed to:', e.target.value);
                      console.log('Current department:', sectionFormData.department);
                      setSectionFormData({
                        ...sectionFormData,
                        year: Number(e.target.value),
                        semester: '',
                        names: []
                      });
                      setSubjectFormData({
                        ...subjectFormData,
                        year: Number(e.target.value),
                        semester: ''
                      });
                    }}
                    label="Year"
                    disabled={!sectionFormData.department}
                  >
                    {[1, 2, 3, 4].map((year) => (
                      <MenuItem key={year} value={year}>
                        Year {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Semester Selection */}
                <FormControl fullWidth margin="normal">
                  <InputLabel>Semester</InputLabel>
                  <Select
                    value={sectionFormData.semester || ''}
                    onChange={(e) => {
                      setSectionFormData({ 
                        ...sectionFormData, 
                        semester: Number(e.target.value) 
                      });
                      setSubjectFormData({
                        ...subjectFormData,
                        semester: Number(e.target.value)
                      });
                    }}
                    label="Semester"
                    disabled={!sectionFormData.department || !sectionFormData.year}
                  >
                    {availableSemesters.map((semester) => (
                      <MenuItem key={semester} value={semester}>
                        Semester {semester}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Section Input */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Sections
                  </Typography>
                  <TextField
                    fullWidth
                    label="Enter Sections (comma-separated)"
                    value={sectionInput}
                    onChange={(e) => {
                      const input = e.target.value;
                      setSectionInput(input);

                      // Convert input to array of sections
                      let sections = [];

                      if (input.trim()) {
                        // Split by comma, semicolon, or space and process each part
                        const rawSections = input
                          .split(/[,;\s]+/)
                          .map(s => s.trim().toUpperCase())
                          .filter(s => s.length > 0);

                        // Filter to keep only valid single letter sections
                        sections = rawSections
                          .filter(s => s.length === 1 && /^[A-Z]$/.test(s))
                          .filter((section, index, arr) => arr.indexOf(section) === index); // Remove duplicates
                      }

                      console.log('🔍 Section input processing:', {
                        originalInput: input,
                        trimmedInput: input.trim(),
                        rawSplit: input.split(/[,;\s]+/),
                        afterTrimAndUpper: input.split(/[,;\s]+/).map(s => s.trim().toUpperCase()),
                        validSections: sections,
                        sectionCount: sections.length
                      });

                      setSectionFormData({
                        ...sectionFormData,
                        names: sections
                      });
                    }}
                    helperText="Enter sections as single letters separated by commas, spaces, or semicolons (e.g., A,B,C or A B C or A; B; C)"
                    disabled={!sectionFormData.department || !sectionFormData.year || !sectionFormData.semester}
                  />
                  {sectionFormData.names.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {sectionFormData.names.map((section, index) => (
                        <Chip
                          key={index}
                          label={section}
                          onDelete={() => {
                            const updatedNames = sectionFormData.names.filter((_, i) => i !== index);
                            setSectionFormData({
                              ...sectionFormData,
                              names: updatedNames
                            });
                            setSectionInput(updatedNames.join(', '));
                          }}
                        />
                      ))}
                    </Box>
                  )}

                  {/* Display Already Added Sections for Current Department/Year/Semester */}
                  {(() => {
                    const currentDetail = academicDetails.find(detail =>
                      detail.department === sectionFormData.department &&
                      detail.year === sectionFormData.year &&
                      detail.semester === sectionFormData.semester
                    );

                    const existingSections = currentDetail?.sections ?
                      currentDetail.sections.split(',').map(s => s.trim()).filter(Boolean) : [];

                    return existingSections.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">
                          Already Added Sections for {sectionFormData.department} - Year {sectionFormData.year} - Semester {sectionFormData.semester}:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {existingSections.map((section, index) => (
                            <Chip
                              key={index}
                              label={section}
                              size="small"
                              sx={{
                                backgroundColor: '#1976d2',
                                color: '#ffffff',
                                fontWeight: 'bold',
                                border: '1px solid #1976d2',
                                '&:hover': {
                                  backgroundColor: '#1565c0'
                                },
                                '& .MuiChip-label': {
                                  color: '#ffffff'
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    );
                  })()}
                </Box>

                {/* Subject Input */}
                {sectionFormData.department && sectionFormData.year && sectionFormData.semester && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Subject Details
                    </Typography>
                    <MuiGrid container spacing={2}>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Subject Name"
                          value={subjectFormData.name}
                          onChange={(e) => setSubjectFormData({
                            ...subjectFormData,
                            name: e.target.value
                          })}
                          required
                          error={!subjectFormData.name}
                          helperText={!subjectFormData.name ? 'Subject name is required' : ''}
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Subject Code"
                          value={subjectFormData.code}
                          onChange={(e) => {
                            const code = e.target.value.toUpperCase();
                            if (/^[A-Z]{0,2}\d{0,3}$/.test(code)) {
                              setSubjectFormData({
                                ...subjectFormData,
                                code: code
                              });
                            }
                          }}
                          required
                          error={!subjectFormData.code}
                          helperText={!subjectFormData.code ? 'Subject code is required (Format: XX999)' : 'Format: XX999 (e.g., CS101)'}
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Credits"
                          type="number"
                          value={subjectFormData.credits}
                          onChange={(e) => setSubjectFormData({
                            ...subjectFormData,
                            credits: e.target.value
                          })}
                          inputProps={{ min: 1, max: 6 }}
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Department"
                          value={subjectFormData.department}
                          disabled
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Year"
                          value={`Year ${subjectFormData.year}`}
                          disabled
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Semester"
                          value={`Semester ${subjectFormData.semester}`}
                          disabled
                        />
                      </MuiGrid>
                      <MuiGrid item xs={12}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSubjectSubmit}
                          disabled={!subjectFormData.name || !subjectFormData.code}
                        >
                          {selectedSubject ? 'Update Subject' : 'Add Subject'}
                        </Button>
                      </MuiGrid>
                    </MuiGrid>

                    {/* Display Already Added Subjects */}
                    {(() => {
                      const currentDetail = academicDetails.find(detail =>
                        detail.department === sectionFormData.department &&
                        detail.year === sectionFormData.year &&
                        detail.semester === sectionFormData.semester
                      );

                      const currentSubjects = currentDetail?.subjects ?
                        currentDetail.subjects.split(',').filter(s => s.trim()) : [];

                      return currentSubjects.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Already Added Subjects
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {currentSubjects.map((subject, index) => {
                              const match = subject.trim().match(/^(.+)\(([A-Z]{2}\d{3})\)$/);
                              const subjectName = match ? match[1] : subject.trim();
                              const subjectCode = match ? match[2] : '';

                              return (
                                <Chip
                                  key={index}
                                  label={`${subjectName} (${subjectCode})`}
                                  variant="outlined"
                                  color="primary"
                                  onDelete={() => {
                                    showConfirmation(
                                      `Are you sure you want to delete subject "${subjectName}"?`,
                                      () => handleDeleteSubject(currentDetail, index)
                                    );
                                  }}
                                  onClick={() => {
                                    if (match) {
                                      setSubjectFormData({
                                        name: match[1].trim(),
                                        code: match[2],
                                        department: sectionFormData.department,
                                        year: sectionFormData.year,
                                        semester: sectionFormData.semester,
                                        credits: currentDetail.credits || 3
                                      });
                                      setSelectedSubject(subject.trim());
                                    }
                                  }}
                                  sx={{ cursor: 'pointer' }}
                                />
                              );
                            })}
                          </Box>
                        </Box>
                      );
                    })()}
                  </Box>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenSectionDialog(false);
              setUploadMode(false);
              setExcelFile(null);
              setUploadError('');
              setUploadSuccess('');
              setSectionFormData({
                names: [],
                department: '',
                year: 1,
                semester: 1
              });
              setSubjectFormData({
                code: '',
                name: '',
                department: '',
                year: '',
                semester: '',
                credits: '',
                description: ''
              });
              setSelectedSection(null);
              setSelectedSubject(null);
            }}>
              Cancel
            </Button>
            {uploadMode ? (
              <Button
                variant="contained"
                onClick={handleExcelUpload}
                disabled={!excelFile}
              >
                Upload
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSectionSubmit}
                disabled={!sectionFormData.department || !sectionFormData.year || !sectionFormData.semester || sectionFormData.names.length === 0}
              >
                {selectedSection ? 'Update' : 'Add'} Academic Details
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Subject Dialog */}
        <Dialog
          open={openSubjectDialog}
          onClose={() => {
            setOpenSubjectDialog(false);
            setSubjectFormData({
              code: '',
              name: '',
              department: '',
              year: '',
              semester: '',
              credits: '',
              description: ''
            });
            setSelectedSubject(null);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>{selectedSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Subject Name"
                value={subjectFormData.name}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
                margin="dense"
                required
              />
              <TextField
                fullWidth
                label="Subject Code"
                value={subjectFormData.code}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, code: e.target.value })}
                margin="dense"
                required
                helperText="Format: XX111 (Dept code + Year + Semester + Sequence)"
              />
              <TextField
                fullWidth
                label="Credits"
                type="number"
                value={subjectFormData.credits}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, credits: e.target.value })}
                margin="dense"
                required
                inputProps={{ min: 1 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpenSubjectDialog(false);
              setSubjectFormData({
                code: '',
                name: '',
                department: '',
                year: '',
                semester: '',
                credits: '',
                description: ''
              });
              setSelectedSubject(null);
            }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  if (selectedSubject) {
                    await api.put(`/api/subject/${selectedSubject._id}`, subjectFormData);
                  } else {
                    await api.post('/api/subject', subjectFormData);
                  }
                  await fetchAcademicDetails();
                  setOpenSubjectDialog(false);
                  setSubjectFormData({
                    code: '',
                    name: '',
                    department: '',
                    year: '',
                    semester: '',
                    credits: '',
                    description: ''
                  });
                  setSelectedSubject(null);
                } catch (error) {
                  setErrorDialog({
                    open: true,
                    message: error.response?.data?.message || 'Failed to save subject'
                  });
                }
              }}
              disabled={!subjectFormData.name || !subjectFormData.code || !subjectFormData.credits}
            >
              {selectedSubject ? 'Update' : 'Save'} Subject
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error Dialog */}
        <Dialog
          open={errorDialog.open}
          onClose={() => setErrorDialog({ ...errorDialog, open: false })}
        >
          <DialogTitle>Error</DialogTitle>
          <DialogContent>
            <Typography>{errorDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setErrorDialog({ ...errorDialog, open: false })} color="primary">
              OK
            </Button>
          </DialogActions>
        </Dialog>

        {/* Success Dialog */}
        <Dialog
          open={successDialog.open}
          onClose={() => setSuccessDialog({ ...successDialog, open: false })}
        >
          <DialogTitle sx={{ color: 'success.main' }}>Success</DialogTitle>
          <DialogContent>
            <Typography>{successDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuccessDialog({ ...successDialog, open: false })} color="primary">
              OK
            </Button>
          </DialogActions>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        >
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogContent>
            <Typography>{confirmDialog.message}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} color="primary">
              Cancel
            </Button>
            <Button
              onClick={() => {
                confirmDialog.onConfirm?.();
                setConfirmDialog({ ...confirmDialog, open: false });
              }}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
        </Grid>
      )}

      {tabValue === 1 && (
        <CollegeInformation />
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                mb={3}
                gap={{ xs: 1, sm: 0 }}
              >
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}
                >
                  Quiz Security Settings
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => setOpenQuizSettingsDialog(true)}
                  size="small"
                  sx={{
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                    px: { xs: 1.5, sm: 2 },
                    py: 0.5,
                    height: '32px'
                  }}
                >
                  {isMobile ? 'Edit' : 'Edit Settings'}
                </Button>
              </Box>

              <Grid container spacing={3}>
                {/* Admin Override Settings */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader
                      title="🔧 Admin Override"
                      subheader="Administrative emergency access system"
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Status: {quizSettings.adminOverride?.enabled ?
                          <Chip label="Enabled" color="warning" size="small" /> :
                          <Chip label="Disabled" color="default" size="small" />
                        }
                      </Typography>
                      {quizSettings.adminOverride?.enabled && (
                        <>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Trigger Keys:</strong> {quizSettings.adminOverride.triggerButtons?.button1} + {quizSettings.adminOverride.triggerButtons?.button2}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Session Timeout:</strong> {quizSettings.adminOverride?.sessionTimeout} seconds
                          </Typography>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Emergency Access Settings */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader
                      title="🚨 Emergency Quiz Access"
                      subheader="Emergency password for quiz access without credentials"
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Status: {quizSettings.emergencyAccess?.enabled ?
                          <Chip label="Enabled" color="success" size="small" /> :
                          <Chip label="Disabled" color="default" size="small" />
                        }
                      </Typography>
                      {quizSettings.emergencyAccess?.enabled && (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                            <Typography variant="body2">
                              <strong>Password:</strong> {
                                quizSettings.emergencyAccess?.password ?
                                  (showEmergencyPassword ? quizSettings.emergencyAccess.password : '••••••••') :
                                  'Not set'
                              }
                            </Typography>
                            {quizSettings.emergencyAccess?.password && (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => setShowEmergencyPassword(!showEmergencyPassword)}
                                sx={{
                                  minWidth: 'auto',
                                  p: 0.5,
                                  fontSize: '0.7rem',
                                  textTransform: 'none'
                                }}
                              >
                                {showEmergencyPassword ? 'Hide' : 'Show'}
                              </Button>
                            )}
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1, fontSize: '0.8rem', fontStyle: 'italic' }}>
                            {quizSettings.emergencyAccess?.description}
                          </Typography>
                          {showEmergencyPassword && quizSettings.emergencyAccess?.password && (
                            <Alert severity="info" sx={{ mt: 1, fontSize: '0.75rem' }}>
                              <Typography variant="caption">
                                <strong>Note:</strong> Students can use this password to access quizzes when they don't have individual credentials.
                              </Typography>
                            </Alert>
                          )}
                          <Box sx={{ mt: 1 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                console.log('🔍 Current Emergency Access Settings:', quizSettings.emergencyAccess);
                                console.log('🔍 Full Quiz Settings:', quizSettings);
                              }}
                              sx={{ fontSize: '0.7rem', px: 1, py: 0.25 }}
                            >
                              Debug Settings
                            </Button>
                          </Box>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Violation Settings */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader
                      title="⚠️ Violation Management"
                      subheader="Configure violation limits and responses"
                    />
                    <CardContent>
                      <Typography variant="body2">
                        <strong>Max Violations:</strong> {quizSettings.violationSettings?.maxViolations}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Warning Threshold:</strong> {quizSettings.violationSettings?.warningThreshold}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Auto Terminate:</strong> {quizSettings.violationSettings?.autoTerminate ? '✅ Yes' : '❌ No'}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Logging Settings */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardHeader
                      title="📊 Logging Settings"
                      subheader="Configure security event logging"
                    />
                    <CardContent>
                      <Typography variant="body2">
                        <strong>Log Violations:</strong> {quizSettings.loggingSettings?.logViolations ? '✅ Yes' : '❌ No'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Log Admin Overrides:</strong> {quizSettings.loggingSettings?.logAdminOverrides ? '✅ Yes' : '❌ No'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Retention Period:</strong> {quizSettings.loggingSettings?.retentionDays} days
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Quiz Settings Edit Dialog */}
      <Dialog
        open={openQuizSettingsDialog}
        onClose={() => setOpenQuizSettingsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Quiz Security Settings</DialogTitle>
        <DialogContent>
          {/* Debug: Log current quiz settings */}
          {console.log('🔍 Current quiz settings in dialog:', quizSettings)}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Admin Override Settings */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>🔧 Admin Override Settings</Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={quizSettings.adminOverride?.enabled || false}
                      onChange={(e) => handleDirectQuizSettingsChange('adminOverride', 'enabled', e.target.checked)}
                    />
                  }
                  label="Enable Admin Override System"
                />
              </FormGroup>

              {quizSettings.adminOverride?.enabled && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Admin Override Password"
                      type="password"
                      value={quizSettings.adminOverride?.password || ''}
                      onChange={(e) => handleDirectQuizSettingsChange('adminOverride', 'password', e.target.value)}
                      helperText="Password for administrative emergency access"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Session Timeout (seconds)"
                      type="number"
                      value={quizSettings.adminOverride?.sessionTimeout || 300}
                      onChange={(e) => handleDirectQuizSettingsChange('adminOverride', 'sessionTimeout', parseInt(e.target.value))}
                      helperText="How long override lasts"
                      inputProps={{ min: 60, max: 1800 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>First Trigger Key</InputLabel>
                      <Select
                        value={quizSettings.adminOverride?.triggerButtons?.button1 || 'Ctrl'}
                        onChange={(e) => handleNestedQuizSettingsChange('adminOverride', 'triggerButtons', 'button1', e.target.value)}
                        label="First Trigger Key"
                      >
                        {['Ctrl', 'Alt', 'Shift', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(key => (
                          <MenuItem key={key} value={key}>{key}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Second Trigger Key</InputLabel>
                      <Select
                        value={quizSettings.adminOverride?.triggerButtons?.button2 || '6'}
                        onChange={(e) => handleNestedQuizSettingsChange('adminOverride', 'triggerButtons', 'button2', e.target.value)}
                        label="Second Trigger Key"
                      >
                        {['Ctrl', 'Alt', 'Shift', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(key => (
                          <MenuItem key={key} value={key}>{key}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Emergency Access Settings */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>🚨 Emergency Quiz Access</Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={quizSettings.emergencyAccess?.enabled || false}
                      onChange={(e) => handleDirectQuizSettingsChange('emergencyAccess', 'enabled', e.target.checked)}
                    />
                  }
                  label="Enable Emergency Access System"
                />
              </FormGroup>

              {quizSettings.emergencyAccess?.enabled && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Emergency Password"
                      type="password"
                      value={quizSettings.emergencyAccess?.password || ''}
                      onChange={(e) => handleDirectQuizSettingsChange('emergencyAccess', 'password', e.target.value)}
                      helperText="Password for emergency quiz access without credentials"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      inputProps={{
                        'data-lpignore': 'true',
                        'data-form-type': 'other'
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      multiline
                      rows={2}
                      value={quizSettings.emergencyAccess?.description || ''}
                      onChange={(e) => handleDirectQuizSettingsChange('emergencyAccess', 'description', e.target.value)}
                      helperText="Description of what this emergency access allows"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="true"
                      inputProps={{
                        'data-lpignore': 'true'
                      }}
                    />
                  </Grid>
                </Grid>
              )}
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Violation Settings */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>⚠️ Violation Management</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Maximum Violations"
                    type="number"
                    value={quizSettings.violationSettings?.maxViolations || 5}
                    onChange={(e) => handleDirectQuizSettingsChange('violationSettings', 'maxViolations', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 20 }}
                    helperText="Quiz terminates after this many violations"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Warning Threshold"
                    type="number"
                    value={quizSettings.violationSettings?.warningThreshold || 3}
                    onChange={(e) => handleDirectQuizSettingsChange('violationSettings', 'warningThreshold', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 10 }}
                    helperText="Show final warning after this many violations"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={quizSettings.violationSettings?.autoTerminate || false}
                        onChange={(e) => handleDirectQuizSettingsChange('violationSettings', 'autoTerminate', e.target.checked)}
                      />
                    }
                    label="Auto-terminate Quiz"
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuizSettingsDialog(false)}>Cancel</Button>
          <Button onClick={handleQuizSettingsSubmit} variant="contained">Save Settings</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CollegeSettings; 