const express = require('express');
const router = express.Router();
const User = require('../models/User');
const College = require('../models/College');
const bcrypt = require('bcryptjs');
const { encrypt } = require('../utils/encryption');

// Check if initial setup is required (public route)
router.get('/status', async (req, res) => {
  try {
    // Check if any admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    // Check if college is set up
    const college = await College.findOne();
    const collegeSetup = college && college.isSetup;
    
    res.json({
      adminExists: !!adminExists,
      collegeSetup: !!collegeSetup,
      requiresSetup: !adminExists || !collegeSetup,
      collegeName: college?.name || 'Your College Name'
    });
  } catch (error) {
    console.error('Error checking setup status:', error);
    res.status(500).json({ message: 'Error checking setup status', error: error.message });
  }
});

// Get college information (public route for displaying college name)
router.get('/college-info', async (req, res) => {
  try {
    let college = await College.findOne();
    
    // If no college info exists, return default with sample data
    if (!college) {
      return res.json({
        name: 'R.V.R & J.C College of Engineering',
        address: 'chowdavaram',
        email: 'rvr@gmail.com',
        phone: '1234567890',
        website: 'rvr.com',
        establishedYear: 1985,
        description: 'A premier engineering institution committed to excellence in education and research.',
        backgroundType: 'gradient',
        backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundImage: '',
        headerStyle: 'transparent',
        headerColor: 'rgba(255, 255, 255, 0.1)',
        headerTextColor: 'white',
        footerStyle: 'solid',
        footerColor: 'rgba(0, 0, 0, 0.8)',
        footerTextColor: 'white',
        isSetup: false
      });
    }
    
    // Return public information for display
    res.json({
      name: college.name,
      address: college.address,
      email: college.email,
      phone: college.phone,
      website: college.website,
      establishedYear: college.establishedYear,
      description: college.description,
      backgroundType: college.backgroundType,
      backgroundValue: college.backgroundValue,
      backgroundImage: college.backgroundImage,
      headerStyle: college.headerStyle,
      headerColor: college.headerColor,
      headerTextColor: college.headerTextColor,
      footerStyle: college.footerStyle,
      footerColor: college.footerColor,
      footerTextColor: college.footerTextColor,
      isSetup: college.isSetup
    });
  } catch (error) {
    console.error('Error fetching college info:', error);
    res.status(500).json({ message: 'Error fetching college information', error: error.message });
  }
});

// Initial admin registration with college setup (public route)
router.post('/initial-setup', async (req, res) => {
  try {
    const { 
      adminName, 
      adminEmail, 
      adminPassword,
      collegeName,
      collegeAddress,
      collegeEmail,
      collegePhone,
      collegeWebsite,
      establishedYear,
      description
    } = req.body;

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists. Setup not required.' });
    }

    // Validate required fields
    if (!adminName || !adminEmail || !adminPassword || !collegeName) {
      return res.status(400).json({ 
        message: 'Admin name, email, password, and college name are required' 
      });
    }

    // Check if user with admin email already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    const encryptedPassword = encrypt(adminPassword);

    const admin = new User({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      originalPassword: encryptedPassword,
      role: 'admin'
    });

    await admin.save();

    // Create or update college information
    let college = await College.findOne();
    const collegeData = {
      name: collegeName,
      address: collegeAddress,
      email: collegeEmail,
      phone: collegePhone,
      website: collegeWebsite,
      establishedYear: establishedYear ? parseInt(establishedYear) : undefined,
      description: description,
      isSetup: true
    };

    if (!college) {
      college = new College(collegeData);
    } else {
      Object.assign(college, collegeData);
    }

    await college.save();

    res.status(201).json({ 
      message: 'Initial setup completed successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      college: {
        name: college.name,
        isSetup: college.isSetup
      }
    });

  } catch (error) {
    console.error('Error in initial setup:', error);
    res.status(500).json({ message: 'Error during initial setup', error: error.message });
  }
});

module.exports = router;
