const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { auth, authorize } = require('../middleware/auth');
const AcademicDetail = require('../models/AcademicDetail');

// Multer configuration for Excel file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + '.xlsx');
    
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// Helper function to validate year-semester relationship
const validateYearSemester = async (year, semester, department) => {
  try {
    // Find academic detail with this combination
    const academicDetail = await AcademicDetail.findOne({
      department,
      year,
      semester
    });

    // If we find a matching academic detail, this combination is valid
    return !!academicDetail;
  } catch (error) {
    console.error('Error validating year-semester:', error);
    return false;
  }
};

// Public GET routes - No authentication required

// Get all academic details
router.get('/', async (req, res) => {
  try {
    const { department, year, semester } = req.query;
    const query = {};

    if (department) query.department = department;
    if (year) query.year = parseInt(year);
    if (semester) query.semester = parseInt(semester);

    const academicDetails = await AcademicDetail.find(query)
      .sort({ department: 1, year: 1, semester: 1 });
    res.json(academicDetails);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching academic details', error: error.message });
  }
});

// Get subjects for a specific department, year, and semester
router.get('/subjects', async (req, res) => {
  try {
    const { department, year, semester } = req.query;
    if (!department || !year || !semester) {
      return res.status(400).json({ message: 'Department, year, and semester are required' });
    }

    const academicDetail = await AcademicDetail.findOne({
      department,
      year: parseInt(year),
      semester: parseInt(semester)
    });

    if (!academicDetail) {
      return res.json([]);
    }

    // Convert subjects string to array of objects - flexible format
    const subjects = academicDetail.subjects.split(',').map(subject => {
      const trimmed = subject.trim();
      if (!trimmed) return null;

      // Try to match format: "Subject Name(CODE)" - flexible code format
      const match = trimmed.match(/^(.+)\(([^)]+)\)$/);
      if (match) {
        return {
          name: match[1].trim(),
          code: match[2].trim()
        };
      } else {
        // If no parentheses format, treat the whole string as both name and code
        return {
          name: trimmed,
          code: trimmed
        };
      }
    }).filter(s => s !== null);

    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects', error: error.message });
  }
});

// Get sections for a specific department, year, and semester
router.get('/sections', async (req, res) => {
  try {
    const { department, year, semester } = req.query;
    if (!department || !year || !semester) {
      return res.status(400).json({ message: 'Department, year, and semester are required' });
    }

    const academicDetail = await AcademicDetail.findOne({
      department,
      year: parseInt(year),
      semester: parseInt(semester)
    });

    if (!academicDetail) {
      return res.json([]);
    }

    // Convert sections string to array
    const sections = academicDetail.sections.split(',').map(s => s.trim());
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sections', error: error.message });
  }
});

// Get academic structure for faculty - No auth required
router.get('/faculty-structure', async (req, res) => {
  try {
    // Get all academic details
    const academicDetails = await AcademicDetail.find()
      .sort({ department: 1, year: 1, semester: 1 });
    
    // Process academic details to get organized structure
    const structure = academicDetails.reduce((acc, detail) => {
      // Skip invalid details
      if (!detail || !detail.department || !detail.year || !detail.semester) {
        return acc;
      }

      // Add department if not exists
      if (!acc[detail.department]) {
        acc[detail.department] = {
          years: {}
        };
      }

      // Add year if not exists
      if (!acc[detail.department].years[detail.year]) {
        acc[detail.department].years[detail.year] = {
          semesters: {}
        };
      }

      // Add semester if not exists
      if (!acc[detail.department].years[detail.year].semesters[detail.semester]) {
        // Handle sections
        const sections = detail.sections ? detail.sections.split(',').map(s => s.trim()) : [];

        // Handle subjects - flexible format
        let subjects = [];
        if (detail.subjects) {
          subjects = detail.subjects.split(',')
            .filter(s => s.trim()) // Filter out empty strings
            .map(s => {
              const trimmed = s.trim();
              if (!trimmed) return null;

              // Try to match format: "Subject Name(CODE)" - flexible code format
              const match = trimmed.match(/^(.+)\(([^)]+)\)$/);
              if (match) {
                return {
                  name: match[1].trim(),
                  code: match[2].trim()
                };
              } else {
                // If no parentheses format, treat the whole string as both name and code
                return {
                  name: trimmed,
                  code: trimmed
                };
              }
            })
            .filter(s => s !== null); // Filter out null subjects
        }

        acc[detail.department].years[detail.year].semesters[detail.semester] = {
          sections,
          subjects
        };
      }

      return acc;
    }, {});

    res.json(structure);
  } catch (error) {
    console.error('Error fetching academic structure:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get simplified academic structure for event quizzes
router.get('/event-structure', async (req, res) => {
  try {
    const academicDetails = await AcademicDetail.find()
      .sort({ department: 1, year: 1, semester: 1 });

    // Extract unique values
    const departments = [...new Set(academicDetails.map(detail => detail.department))];
    const years = [...new Set(academicDetails.map(detail => detail.year))].sort((a, b) => a - b);
    const semesters = [...new Set(academicDetails.map(detail => detail.semester))].sort((a, b) => a - b);

    res.json({
      departments,
      years,
      semesters
    });
  } catch (error) {
    console.error('Error fetching academic structure:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get available semesters for a year-department combination
router.get('/semesters/:departmentId/:year', async (req, res) => {
  try {
    const { departmentId, year } = req.params;
    
    // Find all academic details for this department and year
    const academicDetails = await AcademicDetail.find({
      department: departmentId,
      year: parseInt(year)
    });
    
    // Extract unique semesters
    const semesters = [...new Set(academicDetails.map(detail => detail.semester))].sort();
    
    res.json({ semesters });
  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ message: 'Failed to fetch semesters' });
  }
});

// Protected routes - Require authentication and admin role



// Create or update academic details
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { department, year, semester, sections, subjects } = req.body;



    // Basic validation
    if (!department || !year || !semester || !sections) {
      return res.status(400).json({
        message: 'Department, year, semester, and sections are required'
      });
    }

    // Validate sections format
    const sectionArray = sections.split(',').map(s => s.trim());
    if (!sectionArray.every(s => /^[A-Z]$/.test(s))) {
      return res.status(400).json({
        message: 'Sections must be single uppercase letters (e.g., A,B,C)'
      });
    }



    // Create or update the academic detail
    const academicDetail = await AcademicDetail.findOneAndUpdate(
      { department, year, semester },
      {
        sections,
        subjects: subjects || ''
      },
      { 
        new: true, 
        upsert: true, 
        runValidators: true,
        setDefaultsOnInsert: true 
      }
    );


    res.status(201).json(academicDetail);
  } catch (error) {
    res.status(500).json({
      message: 'Error creating/updating academic details',
      error: error.message
    });
  }
});

// Update academic details by ID
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { department, year, semester, sections, subjects } = req.body;

    // Validate sections format if provided
    if (sections) {
      const sectionArray = sections.split(',').map(s => s.trim());
      if (!sectionArray.every(s => /^[A-Z]$/.test(s))) {
        return res.status(400).json({
          message: 'Sections must be single uppercase letters (e.g., A,B,C)'
        });
      }
    }

    // Find and update the academic detail
    const academicDetail = await AcademicDetail.findById(req.params.id);
    if (!academicDetail) {
      return res.status(404).json({ message: 'Academic details not found' });
    }



    // Update only the provided fields
    if (department) academicDetail.department = department;
    if (year) academicDetail.year = year;
    if (semester) academicDetail.semester = semester;
    if (sections) academicDetail.sections = sections;
    if (subjects) academicDetail.subjects = subjects;


    await academicDetail.save();
    res.json(academicDetail);
  } catch (error) {
    res.status(500).json({ message: 'Error updating academic details', error: error.message });
  }
});

// Upload academic details from Excel
router.post('/upload', auth, authorize('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Get existing departments from college settings
    const Department = require('../models/Department');
    const existingDepartments = await Department.find({});
    const validDepartmentNames = existingDepartments.map(dept => dept.name);

    // Get existing year/semester combinations from academic details
    const existingAcademicDetails = await AcademicDetail.find({});
    const existingYears = [...new Set(existingAcademicDetails.map(detail => detail.year))];
    const existingSemesters = [...new Set(existingAcademicDetails.map(detail => detail.semester))];

    const results = [];
    const errors = [];

    for (const row of data) {
      try {
        // Skip empty rows
        if (!row.Department || !row.Year || !row.Semester || !row.Sections) {
          continue;
        }

        const year = parseInt(row.Year);
        const semester = parseInt(row.Semester);
        const rowNumber = data.indexOf(row) + 2;

        // Validate year and semester
        if (isNaN(year) || isNaN(semester)) {
          errors.push(`Row ${rowNumber}: Invalid year or semester`);
          continue;
        }

        // Validate department exists in college settings
        if (!validDepartmentNames.includes(row.Department)) {
          errors.push(`Row ${rowNumber}: Department "${row.Department}" does not exist in college settings. Please add it first.`);
          continue;
        }

        // Validate year exists in configured academic details
        if (!existingYears.includes(year)) {
          errors.push(`Row ${rowNumber}: Year "${year}" is not configured in academic details. Please configure it first.`);
          continue;
        }

        // Validate semester exists in configured academic details
        if (!existingSemesters.includes(semester)) {
          errors.push(`Row ${rowNumber}: Semester "${semester}" is not configured in academic details. Please configure it first.`);
          continue;
        }

        // Create or update academic detail
        const academicDetail = await AcademicDetail.findOneAndUpdate(
          {
            department: row.Department,
            year: year,
            semester: semester
          },
          {
            sections: row.Sections,
            subjects: row.Subjects || ''
          },
          { new: true, upsert: true, runValidators: true }
        );

        results.push(academicDetail);
      } catch (error) {
        errors.push(`Row ${data.indexOf(row) + 2}: ${error.message}`);
      }
    }

    res.json({
      message: 'Academic details upload completed',
      success: results.length,
      errors: errors,
      details: results
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error uploading academic details',
      error: error.message
    });
  }
});

// Delete academic details
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const academicDetail = await AcademicDetail.findByIdAndDelete(req.params.id);
    if (!academicDetail) {
      return res.status(404).json({ message: 'Academic details not found' });
    }
    res.json({ message: 'Academic details deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting academic details', error: error.message });
  }
});

module.exports = router; 