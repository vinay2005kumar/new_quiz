import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
  Tooltip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Snackbar
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  FilterList as FilterListIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  CloudUpload as CloudUploadIcon,
  Add as AddIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import api from '../../config/axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CountDisplayPaper from '../common/CountDisplayPaper';
import AcademicFilter from '../common/AcademicFilter';
import useAcademicFilters from '../../hooks/useAcademicFilters';

const YEARS = ['1', '2', '3', '4'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];

const StudentAccounts = () => {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openPromotionDialog, setOpenPromotionDialog] = useState(false);
  const [openPromotionConfirmDialog, setOpenPromotionConfirmDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [promotionData, setPromotionData] = useState({
    fromYear: '',
    fromSemester: '',
    toYear: '',
    toSemester: '',
    department: ''
  });
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const {
    filters,
    handleFilterChange,
    clearFilters,
    getFilterParams
  } = useAcademicFilters({
    department: '',
    year: '',
    semester: '',
    section: '',
    admissionNumber: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    year: '',
    semester: '',
    section: '',
    admissionNumber: '',
    isLateral: false,
    password: ''
  });
  const [dialogError, setDialogError] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [academicDetails, setAcademicDetails] = useState([]);
  const [years, setYears] = useState([]);
  const [availableSemesters, setAvailableSemesters] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('Fetching students...');
      
      // Get student accounts specifically
      const response = await api.get('/api/admin/accounts?role=student');
      console.log('Students response:', response);

      // Check if response exists and has the expected structure
      if (!response || !response.accounts || !Array.isArray(response.accounts)) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }

      setStudents(response.accounts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      let errorMessage = 'Failed to fetch students. ';
      if (error.response?.status === 401) {
        errorMessage += 'Please check your authentication.';
      } else if (error.response?.status === 403) {
        errorMessage += 'You do not have permission to view students.';
      } else if (error.response?.status === 404) {
        errorMessage += 'The student list is not available at this time.';
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (!navigator.onLine) {
        errorMessage += 'Please check your internet connection.';
      } else {
        errorMessage += 'Please try again later.';
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  const fetchAcademicDetails = async () => {
    try {
      const response = await api.get('/api/academic-details');
      console.log('Academic details response:', response);
      
      if (response && Array.isArray(response)) {
        setAcademicDetails(response);
        
        // Extract unique departments
        const uniqueDepartments = [...new Set(response.map(detail => detail.department))];
        setDepartments(uniqueDepartments);
      } else {
        console.error('Invalid academic details data:', response);
        setAcademicDetails([]);
        setDepartments([]);
      }
    } catch (error) {
      console.error('Error fetching academic details:', error);
      setError('Failed to fetch academic details');
      setAcademicDetails([]);
      setDepartments([]);
    }
  };

  // Update available years when department changes
  useEffect(() => {
    if (filters.department) {
      const departmentYears = [...new Set(
        academicDetails
          .filter(detail => detail.department === filters.department)
          .map(detail => detail.year)
      )].sort((a, b) => a - b);
      
      console.log('Available years for department:', departmentYears);
      setYears(departmentYears);
    } else {
      setYears([]);
    }
  }, [filters.department, academicDetails]);

  // Update available semesters when year changes
  useEffect(() => {
    if (filters.department && filters.year) {
      const availableSems = [...new Set(
        academicDetails
          .filter(detail => 
            detail.department === filters.department && 
            detail.year === parseInt(filters.year)
          )
          .map(detail => detail.semester)
      )].sort((a, b) => a - b);
      
      console.log('Available semesters:', availableSems);
      setAvailableSemesters(availableSems);
    } else {
      setAvailableSemesters([]);
    }
  }, [filters.department, filters.year, academicDetails]);

  // Update available sections when semester changes
  useEffect(() => {
    if (filters.department && filters.year && filters.semester) {
      const detail = academicDetails.find(d => 
        d.department === filters.department && 
        d.year === parseInt(filters.year) && 
        d.semester === parseInt(filters.semester)
      );

      const sections = detail?.sections ? detail.sections.split(',').map(s => s.trim()) : [];
      console.log('Available sections:', sections);
      setAvailableSections(sections);
    } else {
      setAvailableSections([]);
    }
  }, [filters.department, filters.year, filters.semester, academicDetails]);

  useEffect(() => {
    fetchAcademicDetails();
    fetchStudents();
  }, []);

  // Add a retry button component
  const RetryButton = () => (
    <Button 
      variant="contained" 
      onClick={fetchStudents}
      sx={{ mt: 2 }}
    >
      Retry Loading
    </Button>
  );

  const handleOpenDialog = (student = null) => {
    if (student) {
      setSelectedStudent(student);
      setFormData({
        name: student.name || '',
        email: student.email || '',
        department: student.department || '',
        year: student.year ? student.year.toString() : '',
        semester: student.semester ? student.semester.toString() : '',
        section: student.section || '',
        admissionNumber: student.admissionNumber || '',
        isLateral: student.isLateral || false,
        password: ''
      });
    } else {
      setSelectedStudent(null);
      setFormData({
        name: '',
        email: '',
        department: '',
        year: '',
        semester: '',
        section: '',
        admissionNumber: '',
        isLateral: false,
        password: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedStudent(null);
    setDialogError('');
    setFormData({
      name: '',
      email: '',
      department: '',
      year: '',
      semester: '',
      section: '',
      admissionNumber: '',
      isLateral: false,
      password: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setDialogError('');
      setError('');

      // Basic validation
      if (!formData.email || !formData.name || !formData.department || 
          !formData.year || !formData.semester || !formData.section || 
          !formData.admissionNumber || (!selectedStudent && !formData.password)) {
        setDialogError('Please fill in all required fields');
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setDialogError('Please enter a valid email address');
        return;
      }

      // Admission number format validation
      const admissionRegex = formData.isLateral ? 
        /^[lL]\d{2}[a-zA-Z]{2,3}\d{3}$/ : 
        /^[yY]\d{2}[a-zA-Z]{2,3}\d{3}$/;
      
      if (!admissionRegex.test(formData.admissionNumber)) {
        setDialogError(
          `Invalid admission number format. ${
            formData.isLateral ? 
            'Lateral entry format: l22cs001' : 
            'Regular entry format: y22cs001'
          }`
        );
        return;
      }

      // Convert year and semester to numbers before sending
      const dataToSend = {
        ...formData,
        year: formData.year.toString(),
        semester: formData.semester.toString(),
        role: 'student'
      };

      // Only include password if it's provided during edit
      if (!selectedStudent || (selectedStudent && formData.password)) {
        dataToSend.password = formData.password;
      }

      console.log('Sending data to server:', dataToSend);

      if (selectedStudent) {
        try {
          const response = await api.put(`/api/admin/accounts/${selectedStudent._id}`, dataToSend);
          console.log('Update response:', response);
          handleCloseDialog();
          fetchStudents();
        } catch (error) {
          console.error('Update error:', error.response || error);
          setDialogError(error.response?.data?.message || 'Failed to update student account');
        }
      } else {
        try {
          const response = await api.post('/api/admin/accounts', dataToSend);
          console.log('Create response:', response);
          handleCloseDialog();
          fetchStudents();
        } catch (error) {
          console.error('Creation error:', error);
          if (error.response?.data?.message) {
            setDialogError(error.response.data.message);
          } else {
            setDialogError('Failed to create student account');
          }
        }
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setDialogError('An unexpected error occurred. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      
      // Reset dependent fields
      if (name === 'department') {
        newData.year = '';
        newData.semester = '';
        newData.section = '';
      } else if (name === 'year') {
        newData.semester = '';
        newData.section = '';
      } else if (name === 'semester') {
        newData.section = '';
      }
      
      return newData;
    });

    // Also update filters to keep them in sync
    setFilters(prev => {
      const newFilters = { ...prev, [name]: value };
      
      if (name === 'department') {
        newFilters.year = '';
        newFilters.semester = '';
        newFilters.section = '';
      } else if (name === 'year') {
        newFilters.semester = '';
        newFilters.section = '';
      } else if (name === 'semester') {
        newFilters.section = '';
      }
      
      return newFilters;
    });
  };

  const handleDelete = async (studentId) => {
    try {
      await api.delete(`/api/admin/accounts/${studentId}`);
      fetchStudents();
      setOpenDeleteDialog(false);
      setStudentToDelete(null);
    } catch (error) {
      setError('Failed to delete student account');
    }
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
    setOpenDeleteDialog(true);
  };

  // Toast helper functions
  const showToast = (message, severity = 'success') => {
    setToast({
      open: true,
      message,
      severity
    });
  };

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast(prev => ({ ...prev, open: false }));
  };

  // Academic Promotion Functions
  const handleOpenPromotionDialog = () => {
    // Auto-fill promotion data based on current filters
    setPromotionData({
      fromYear: filters.year || '',
      fromSemester: filters.semester || '',
      toYear: '',
      toSemester: '',
      department: filters.department || ''
    });
    setSelectedStudents([]);
    setOpenPromotionDialog(true);
  };

  const handleClosePromotionDialog = () => {
    setOpenPromotionDialog(false);
    setSelectedStudents([]);
    setPromotionData({
      fromYear: '',
      fromSemester: '',
      toYear: '',
      toSemester: '',
      department: ''
    });
  };

  const handlePromotionDataChange = (field, value) => {
    setPromotionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStudentSelection = (studentId, checked) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleSelectAllStudents = (checked) => {
    if (checked) {
      const eligibleStudents = getEligibleStudentsForPromotion();
      setSelectedStudents(eligibleStudents.map(s => s._id));
    } else {
      setSelectedStudents([]);
    }
  };

  const getEligibleStudentsForPromotion = () => {
    return getFilteredStudents().filter(student => {
      if (!promotionData.department || !promotionData.fromYear || !promotionData.fromSemester) {
        return false;
      }
      return (
        student.department === promotionData.department &&
        student.year.toString() === promotionData.fromYear.toString() &&
        student.semester.toString() === promotionData.fromSemester.toString()
      );
    });
  };

  const handleBulkPromotionClick = () => {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student for promotion');
      return;
    }

    if (!promotionData.toYear || !promotionData.toSemester) {
      setError('Please specify target year and semester');
      return;
    }

    // Open confirmation dialog
    setOpenPromotionConfirmDialog(true);
  };

  const handleBulkPromotion = async () => {
    setOpenPromotionConfirmDialog(false);

    try {
      setLoading(true);
      const response = await api.post('/api/admin/students/bulk-promotion', {
        studentIds: selectedStudents,
        toYear: parseInt(promotionData.toYear),
        toSemester: parseInt(promotionData.toSemester)
      });

      // Handle different response formats (same as other components)
      const responseData = response.data || response || {};

      console.log('📥 PROMOTION RESPONSE:', {
        fullResponse: response,
        responseData: responseData,
        success: responseData.success,
        updatedCount: responseData.updatedCount
      });

      if (responseData.success) {
        setError('');
        showToast(`Successfully promoted ${responseData.updatedCount} students`, 'success');
        fetchStudents(); // Refresh the student list
        handleClosePromotionDialog();
      } else {
        setError(responseData.message || 'Failed to promote students');
      }
    } catch (error) {
      console.error('Bulk promotion error:', error);
      setError(error.response?.data?.message || 'Failed to promote students');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadStatus('reading');
      setUploadProgress(20);
      setUploadError('');
      setUploadedFile(file);

      const formData = new FormData();
      formData.append('file', file);

      // First get a preview of the data
      setUploadStatus('validating');
      setUploadProgress(40);
      const previewResponse = await api.post('/api/admin/accounts/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (previewResponse.error) {
        setUploadError(previewResponse.error);
        setUploadStatus('error');
        return;
      }

      setUploadPreview(previewResponse.preview);
      setUploadProgress(60);
      setUploadStatus('ready');

      // If preview looks good, proceed with upload
      setUploadStatus('uploading');
      setUploadProgress(80);
      await api.post('/api/admin/accounts/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setUploadProgress(100);
      setUploadStatus('success');
      setOpenUploadDialog(false);
      fetchStudents();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.response?.data?.message || 'Failed to upload students');
      setUploadStatus('error');
    }
  };

  const getFilteredStudents = () => {
    return students.filter(student => {
      const departmentMatch = !filters.department || student.department === filters.department;
      const yearMatch = !filters.year || student.year === filters.year;
      const semesterMatch = !filters.semester || student.semester === filters.semester;
      const sectionMatch = !filters.section || student.section === filters.section;
      const admissionMatch = !filters.admissionNumber || 
        student.admissionNumber.toLowerCase().includes(filters.admissionNumber.toLowerCase());
      return departmentMatch && yearMatch && semesterMatch && sectionMatch && admissionMatch;
    });
  };

  const getAvailableSemesters = () => availableSemesters;
  const getAvailableSections = () => availableSections;

  // Modify the togglePasswordVisibility function
  const toggleAllPasswords = async () => {
    try {
      if (!showAllPasswords) {
        // Fetch all passwords at once
        const response = await api.get('/api/admin/accounts/passwords');
        setVisiblePasswords(response.passwords);
      } else {
        // Clear all visible passwords
        setVisiblePasswords({});
      }
      setShowAllPasswords(!showAllPasswords);
    } catch (error) {
      console.error('Error fetching passwords:', error);
    }
  };

  const downloadTemplate = () => {
    // Create a sample Excel file
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Email', 'Password', 'Department', 'Year', 'Semester', 'Section', 'AdmissionNumber', 'EntryType'],
      ['John Doe', 'john.doe@example.com', 'password123', 'Computer Science', '1', '1', 'A', 'y22cs001', 'Regular'],
      ['Jane Smith', 'jane.smith@example.com', 'password456', 'Electronics', '2', '3', 'B', 'l22ec002', 'Lateral']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'student_upload_template.xlsx');
  };

  const handleDownloadPDF = async () => {
    try {
      // First fetch all passwords
      const response = await api.get('/api/admin/accounts/passwords?role=student');
      const passwords = response.passwords || {};

      const doc = new jsPDF();
      
      // Add title and subtitle
      doc.setFontSize(18);
      doc.text('Student Accounts', 14, 15);
      
      // Add timestamp
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);
      
      // Add summary box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(14, 30, 180, 25, 3, 3, 'FD');
      
      // Add counts with bold headers
      doc.setFont(undefined, 'bold');
      doc.text('Summary:', 20, 38);
      doc.setFont(undefined, 'normal');
      doc.text(`• Total Students: ${students.length}`, 20, 44);
      doc.text(`• Filtered Students: ${getFilteredStudents().length}`, 90, 44);
      
      // Add filter information if any filters are active
      const activeFilters = [];
      if (filters.department) activeFilters.push(`Department: ${filters.department}`);
      if (filters.year) activeFilters.push(`Year: ${filters.year}`);
      if (filters.semester) activeFilters.push(`Semester: ${filters.semester}`);
      if (filters.section) activeFilters.push(`Section: ${filters.section}`);
      if (filters.admissionNumber) activeFilters.push(`Admission No: ${filters.admissionNumber}`);
      
      if (activeFilters.length > 0) {
        // Create a larger box for filters
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 245, 245);
        const filterBoxHeight = Math.min(40, 15 + (activeFilters.length * 6));
        doc.roundedRect(14, 60, 180, filterBoxHeight, 3, 3, 'FD');
        
        // Add filter header
        doc.setFont(undefined, 'bold');
        doc.text('Active Filters:', 20, 68);
        doc.setFont(undefined, 'normal');
        
        // Add each filter on a new line
        activeFilters.forEach((filter, index) => {
          doc.text(`• ${filter}`, 20, 74 + (index * 6));
        });
      }
      
      // Prepare table data with original passwords
      const tableData = getFilteredStudents().map(student => [
        student.name || '',
        student.email || '',
        student.department || '',
        student.year ? `Year ${student.year}` : '',
        student.semester ? `Semester ${student.semester}` : '',
        student.section ? `Section ${student.section}` : '',
        student.admissionNumber || '',
        passwords[student._id] || '********'  // Use fetched password
      ]);
      
      // Add table using autoTable
      autoTable(doc, {
        startY: activeFilters.length > 0 ? Math.max(85, 65 + (activeFilters.length * 6)) : 60,
        head: [['Name', 'Email', 'Department', 'Year', 'Semester', 'Section', 'Admission No.', 'Password']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [71, 71, 71] },
        columnStyles: {
          0: { cellWidth: 30 }, // Name
          1: { cellWidth: 40 }, // Email
          2: { cellWidth: 25 }, // Department
          3: { cellWidth: 15 }, // Year
          4: { cellWidth: 20 }, // Semester
          5: { cellWidth: 15 }, // Section
          6: { cellWidth: 25 }, // Admission No.
          7: { cellWidth: 20 }  // Password
        }
      });
      
      // Save PDF
      doc.save('student-accounts.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading students...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          action={<RetryButton />}
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">Student Accounts</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon className="download-icon" />}
              onClick={handleDownloadPDF}
              sx={{
                color: 'purple.main',
                borderColor: 'purple.main',
                '&:hover': {
                  borderColor: 'purple.dark',
                  backgroundColor: 'purple.50'
                }
              }}
            >
              Download PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudUploadIcon className="upload-icon" />}
              onClick={() => setOpenUploadDialog(true)}
              sx={{
                color: 'orange.main',
                borderColor: 'orange.main',
                '&:hover': {
                  borderColor: 'orange.dark',
                  backgroundColor: 'orange.50'
                }
              }}
            >
              Upload Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={<SchoolIcon />}
              onClick={handleOpenPromotionDialog}
              sx={{
                color: 'primary.main',
                borderColor: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'primary.50'
                }
              }}
            >
              Academic Promotion
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon className="add-icon" />}
              onClick={() => handleOpenDialog()}
              sx={{
                backgroundColor: 'success.main',
                '&:hover': { backgroundColor: 'success.dark' }
              }}
            >
              Add Student
            </Button>
          </Box>
        </Box>

        {students.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            No students found. Add students using the button above.
          </Alert>
        ) : (
          <>
            <AcademicFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
              showFilters={['department', 'year', 'semester', 'section']}
              title="Student Filters"
              showRefreshButton={true}
              onRefresh={fetchStudents}
              customFilters={[
                <TextField
                  key="admissionNumber"
                  fullWidth
                  size="small"
                  label="Admission Number"
                  value={filters.admissionNumber || ''}
                  onChange={(e) => handleFilterChange('admissionNumber', e.target.value)}
                  placeholder="Search by admission number..."
                />
              ]}
            />

            {/* Count Display */}
            <CountDisplayPaper sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Showing {getFilteredStudents().length} out of {students.length} students
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    {filters.department && `Department: ${filters.department}`}
                    {filters.year && ` • Year: ${filters.year}`}
                    {filters.semester && ` • Semester: ${filters.semester}`}
                    {filters.section && ` • Section: ${filters.section}`}
                  </Typography>
                </Grid>
              </Grid>
            </CountDisplayPaper>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        Password
                        <Tooltip title={showAllPasswords ? "Hide All Passwords" : "Show All Passwords"}>
                          <IconButton
                            size="small"
                            onClick={toggleAllPasswords}
                            className="view-icon"
                          >
                            {showAllPasswords ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Year</TableCell>
                    <TableCell>Semester</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Admission Number</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredStudents().map((student) => (
                    <TableRow key={student._id}>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontFamily: 'monospace' }}>
                          {visiblePasswords[student._id] || '********'}
                        </Typography>
                      </TableCell>
                      <TableCell>{student.department}</TableCell>
                      <TableCell>{student.year}</TableCell>
                      <TableCell>{student.semester}</TableCell>
                      <TableCell>{student.section}</TableCell>
                      <TableCell>{student.admissionNumber}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleOpenDialog(student)}
                          className="edit-icon"
                          title="Edit Student"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDeleteClick(student)}
                          className="delete-icon"
                          title="Delete Student"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

      {/* Add/Edit Student Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedStudent ? 'Edit Student' : 'Add New Student'}
        </DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mt: 2, mb: 1 }}>
              {dialogError}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required={!selectedStudent}
              margin="normal"
              helperText={selectedStudent ? "Leave blank to keep current password" : ""}
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Department</InputLabel>
              <Select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                label="Department"
              >
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Year</InputLabel>
              <Select
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                label="Year"
              >
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Semester</InputLabel>
              <Select
                name="semester"
                value={formData.semester}
                onChange={handleInputChange}
                label="Semester"
                disabled={!formData.year}
              >
                {getAvailableSemesters().map((sem) => (
                  <MenuItem key={sem} value={sem}>
                    Semester {sem}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Section</InputLabel>
              <Select
                name="section"
                value={formData.section}
                onChange={handleInputChange}
                label="Section"
                disabled={!formData.department || !formData.year || !formData.semester}
              >
                {getAvailableSections().map((section) => (
                  <MenuItem key={section} value={section}>
                    {section}
                  </MenuItem>
                ))}
              </Select>
              {(!formData.department || !formData.year || !formData.semester) && (
                <Typography variant="caption" color="textSecondary">
                  Please select department, year, and semester first
                </Typography>
              )}
            </FormControl>
            <TextField
              fullWidth
              label="Admission Number"
              name="admissionNumber"
              value={formData.admissionNumber}
              onChange={handleInputChange}
              required
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Entry Type</InputLabel>
              <Select
                value={formData.isLateral}
                onChange={(e) => setFormData({ ...formData, isLateral: e.target.value })}
                label="Entry Type"
              >
                <MenuItem value={false}>Regular</MenuItem>
                <MenuItem value={true}>Lateral</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedStudent ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog 
        open={openUploadDialog} 
        onClose={() => {
          if (uploadStatus !== 'uploading') {
            setOpenUploadDialog(false);
            setUploadedFile(null);
            setUploadPreview([]);
            setUploadProgress(0);
            setUploadStatus('');
            setUploadError('');
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Upload Student Data</DialogTitle>
        <DialogContent>
          {/* Instructions Section */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Upload Instructions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" gutterBottom>
                Upload an Excel file containing student information. The file should follow this structure:
              </Typography>
              
              <Box sx={{
                my: 2,
                p: 2,
                bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`
              }}>
                <Typography variant="subtitle2" gutterBottom>Required Excel Columns:</Typography>
                <Typography variant="body2" component="div">
                  <ul>
                    <li><strong>Name</strong>: Full name of the student</li>
                    <li><strong>Email</strong>: Valid email address</li>
                    <li><strong>Password</strong>: Initial password (optional)</li>
                    <li><strong>Department</strong>: Must match an existing department name exactly</li>
                    <li><strong>Year</strong>: Study year (1-4)</li>
                    <li><strong>Semester</strong>: Semester number (1-8)</li>
                    <li><strong>Section</strong>: Class section (e.g., A, B, C)</li>
                    <li><strong>AdmissionNumber</strong>: Unique admission/roll number
                      <ul>
                        <li>Regular format: y22cs001</li>
                        <li>Lateral format: l22cs001</li>
                      </ul>
                    </li>
                    <li><strong>EntryType</strong>: "Regular" or "Lateral"</li>
                  </ul>
                </Typography>
              </Box>

              <Box sx={{ my: 2, p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>Example Row:</Typography>
                <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
                  Name: John Doe<br />
                  Email: john.doe@example.com<br />
                  Password: password123<br />
                  Department: Computer Science and Engineering<br />
                  Year: 1<br />
                  Semester: 1<br />
                  Section: A<br />
                  AdmissionNumber: y22cs001<br />
                  EntryType: Regular
                </Typography>
              </Box>

              <Box sx={{ mt: 3, mb: 2 }}>
                <Button
                  startIcon={<DownloadIcon />}
                  onClick={downloadTemplate}
                  variant="outlined"
                  size="small"
                >
                  Download Template
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
                  Download and use this template for correct formatting
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Upload Section */}
          <Box sx={{ mt: 3, mb: 2 }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <label htmlFor="excel-upload">
                <Button 
                  variant="contained" 
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploadStatus === 'uploading'}
                >
                  Choose File
                </Button>
              </label>
              {uploadedFile && (
                <Typography variant="body2" color="textSecondary">
                  Selected: {uploadedFile.name}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Progress and Status */}
          {uploadStatus && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress} 
                sx={{ mb: 1 }}
              />
              <Typography variant="body2" color="textSecondary">
                {uploadStatus === 'reading' && 'Reading file...'}
                {uploadStatus === 'validating' && 'Validating data...'}
                {uploadStatus === 'ready' && 'Ready to upload'}
                {uploadStatus === 'uploading' && 'Uploading student data...'}
                {uploadStatus === 'success' && 'Upload successful!'}
                {uploadStatus === 'error' && 'Upload failed'}
              </Typography>
            </Box>
          )}

          {/* Preview Section */}
          {uploadPreview && uploadPreview.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Year</TableCell>
                      <TableCell>Semester</TableCell>
                      <TableCell>Section</TableCell>
                      <TableCell>Admission No.</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadPreview.slice(0, 5).map((student, index) => (
                      <TableRow key={index}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.department}</TableCell>
                        <TableCell>{student.year}</TableCell>
                        <TableCell>{student.semester}</TableCell>
                        <TableCell>{student.section}</TableCell>
                        <TableCell>{student.admissionNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {uploadPreview.length > 5 && (
                  <Box sx={{ p: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">
                      {`And ${uploadPreview.length - 5} more students...`}
                    </Typography>
                  </Box>
                )}
              </TableContainer>
            </Box>
          )}

          {/* Error Display */}
          {uploadError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Upload Error:</Typography>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {uploadError}
              </pre>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenUploadDialog(false);
              setUploadedFile(null);
              setUploadPreview([]);
              setUploadProgress(0);
              setUploadStatus('');
              setUploadError('');
            }}
            disabled={uploadStatus === 'uploading'}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Academic Promotion Dialog */}
      <Dialog
        open={openPromotionDialog}
        onClose={handleClosePromotionDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Academic Promotion</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Promotion Settings */}
            <Typography variant="h6" gutterBottom>
              Promotion Settings
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Department</InputLabel>
                  <Select
                    value={promotionData.department}
                    onChange={(e) => handlePromotionDataChange('department', e.target.value)}
                    label="Department"
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>From Year</InputLabel>
                  <Select
                    value={promotionData.fromYear}
                    onChange={(e) => handlePromotionDataChange('fromYear', e.target.value)}
                    label="From Year"
                  >
                    {YEARS.map((year) => (
                      <MenuItem key={year} value={year}>Year {year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>From Semester</InputLabel>
                  <Select
                    value={promotionData.fromSemester}
                    onChange={(e) => handlePromotionDataChange('fromSemester', e.target.value)}
                    label="From Semester"
                  >
                    {SEMESTERS.map((sem) => (
                      <MenuItem key={sem} value={sem}>Semester {sem}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>To Year</InputLabel>
                  <Select
                    value={promotionData.toYear}
                    onChange={(e) => handlePromotionDataChange('toYear', e.target.value)}
                    label="To Year"
                  >
                    {YEARS.map((year) => (
                      <MenuItem key={year} value={year}>Year {year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>To Semester</InputLabel>
                  <Select
                    value={promotionData.toSemester}
                    onChange={(e) => handlePromotionDataChange('toSemester', e.target.value)}
                    label="To Semester"
                  >
                    {SEMESTERS.map((sem) => (
                      <MenuItem key={sem} value={sem}>Semester {sem}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {/* Eligible Students */}
            {promotionData.department && promotionData.fromYear && promotionData.fromSemester && (
              <>
                <Typography variant="h6" gutterBottom>
                  Eligible Students ({getEligibleStudentsForPromotion().length} found)
                </Typography>

                {getEligibleStudentsForPromotion().length > 0 ? (
                  <>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedStudents.length === getEligibleStudentsForPromotion().length}
                          indeterminate={selectedStudents.length > 0 && selectedStudents.length < getEligibleStudentsForPromotion().length}
                          onChange={(e) => handleSelectAllStudents(e.target.checked)}
                        />
                      }
                      label="Select All Students"
                      sx={{ mb: 2 }}
                    />

                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">Select</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Admission No.</TableCell>
                            <TableCell>Current</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getEligibleStudentsForPromotion().map((student) => (
                            <TableRow key={student._id}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedStudents.includes(student._id)}
                                  onChange={(e) => handleStudentSelection(student._id, e.target.checked)}
                                />
                              </TableCell>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>{student.admissionNumber}</TableCell>
                              <TableCell>Year {student.year} Sem {student.semester}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                ) : (
                  <Alert severity="info">
                    No students found matching the specified criteria.
                  </Alert>
                )}
              </>
            )}

            {/* Promotion Preview */}
            {selectedStudents.length > 0 && promotionData.toYear && promotionData.toSemester && (
              <Box sx={{
                mt: 3,
                p: 2,
                bgcolor: (theme) => theme.palette.mode === 'dark'
                  ? 'rgba(25, 118, 210, 0.1)'
                  : 'rgba(25, 118, 210, 0.05)',
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.primary.main}20`
              }}>
                <Typography variant="subtitle1" gutterBottom>
                  Promotion Preview
                </Typography>
                <Typography variant="body2">
                  <strong>{selectedStudents.length}</strong> students will be promoted from{' '}
                  <strong>Year {promotionData.fromYear} Semester {promotionData.fromSemester}</strong> to{' '}
                  <strong>Year {promotionData.toYear} Semester {promotionData.toSemester}</strong>
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePromotionDialog}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkPromotionClick}
            variant="contained"
            disabled={selectedStudents.length === 0 || !promotionData.toYear || !promotionData.toSemester}
          >
            Promote Students ({selectedStudents.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Promotion Confirmation Dialog */}
      <Dialog
        open={openPromotionConfirmDialog}
        onClose={() => setOpenPromotionConfirmDialog(false)}
      >
        <DialogTitle>Confirm Academic Promotion</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to promote the following students?
          </Typography>
          <Box sx={{
            mt: 2,
            p: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
            borderRadius: 1,
            border: (theme) => `1px solid ${theme.palette.divider}`
          }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Number of students:</strong> {selectedStudents.length}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>From:</strong> Year {promotionData.fromYear} Semester {promotionData.fromSemester}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>To:</strong> Year {promotionData.toYear} Semester {promotionData.toSemester}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Department:</strong> {promotionData.department}
            </Typography>
          </Box>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2, fontWeight: 'bold' }}>
            This action will update the academic year and semester for all selected students.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPromotionConfirmDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleBulkPromotion}
            variant="contained"
            color="primary"
          >
            Confirm Promotion
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => {
          setOpenDeleteDialog(false);
          setStudentToDelete(null);
        }}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this student account?
          </Typography>
          {studentToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Student Details:
              </Typography>
              <Typography variant="body2">
                Name: {studentToDelete.name}
              </Typography>
              <Typography variant="body2">
                Email: {studentToDelete.email}
              </Typography>
              <Typography variant="body2">
                Department: {studentToDelete.department}
              </Typography>
              <Typography variant="body2">
                Admission Number: {studentToDelete.admissionNumber}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenDeleteDialog(false);
            setStudentToDelete(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleDelete(studentToDelete._id)} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentAccounts; 