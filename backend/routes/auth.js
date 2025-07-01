const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EventQuizAccount = require('../models/EventQuizAccount');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

// Register user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department, year, admissionNumber, isLateral, section } = req.body;

    // Basic validation for all users
    if (!name || !email || !password || !role || !department) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Additional validation for students
    if (role === 'student') {
      if (!year || !admissionNumber || !section) {
        return res.status(400).json({ message: 'Students must provide year, section, and admission number' });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email },
        ...(admissionNumber ? [{ admissionNumber }] : [])
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      originalPassword: password,
      role,
      department,
      ...(role === 'student' && { 
        year,
        admissionNumber,
        isLateral: isLateral || false,
        section
      })
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        ...(user.role === 'student' && {
          year: user.year,
          admissionNumber: user.admissionNumber,
          isLateral: user.isLateral,
          section: user.section
        })
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for email:', email);

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // First try to find user in EventQuizAccount model
    let user = await EventQuizAccount.findOne({ email });
    let isEventAccount = false;

    // If not found in EventQuizAccount model, check User model
    if (!user) {
      user = await User.findOne({ email });
    } else {
      isEventAccount = true;
    }

    if (!user) {
      console.log('Login failed: User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Login failed: Invalid password for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token with explicit role information
    const tokenPayload = {
      userId: user._id,
      role: isEventAccount ? 'event' : user.role,
      email: user.email,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Verify token immediately to ensure it's valid
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    console.log('Login successful:', {
      userId: user._id,
      email: user.email,
      role: isEventAccount ? 'event' : user.role,
      tokenExp: new Date(decoded.exp * 1000).toISOString(),
      tokenPreview: `${token.substring(0, 10)}...`
    });

    // Prepare response based on account type
    const userResponse = isEventAccount ? {
      id: user._id,
      name: user.name,
      email: user.email,
      role: 'event',
      eventType: user.eventType,
      department: user.department
    } : {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      ...(user.role === 'student' && {
        year: user.year,
        admissionNumber: user.admissionNumber,
        isLateral: user.isLateral,
        section: user.section
      }),
      ...(user.role === 'faculty' && {
        departments: user.departments || [],
        years: user.years || [],
        semesters: user.semesters || [],
        sections: user.sections || [],
        assignments: user.assignments || [],
        isEventQuizAccount: user.isEventQuizAccount || false
      })
    };

    res.json({
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    console.log('GET /me - Fetching user details:', {
      userId: req.user._id,
      isEventAccount: req.isEventAccount,
      timestamp: new Date().toISOString()
    });

    let user;
    if (req.isEventAccount) {
      user = await EventQuizAccount.findById(req.user._id)
        .select('-password -originalPassword')
        .lean();
    } else {
      user = await User.findById(req.user._id)
        .select('-password')
        .lean();
    }
    
    if (!user) {
      console.log('GET /me - User not found in database');
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify token expiration
    const token = req.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const currentTimestamp = Math.floor(Date.now() / 1000);

    console.log('GET /me - Token verification:', {
      userId: decoded.userId,
      expiration: new Date(decoded.exp * 1000).toISOString(),
      currentTime: new Date().toISOString(),
      isExpired: decoded.exp < currentTimestamp
    });

    if (decoded.exp < currentTimestamp) {
      console.log('GET /me - Token has expired');
      return res.status(401).json({ message: 'Token has expired' });
    }

    console.log('GET /me - Sending user data:', {
      userId: user._id,
      role: req.isEventAccount ? 'event' : user.role,
      timestamp: new Date().toISOString()
    });

    // Prepare response based on account type
    const userResponse = req.isEventAccount ? {
      id: user._id,
      name: user.name,
      email: user.email,
      role: 'event',
      eventType: user.eventType,
      department: user.department
    } : {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      ...(user.role === 'student' && {
        year: user.year,
        admissionNumber: user.admissionNumber,
        isLateral: user.isLateral,
        section: user.section
      }),
      ...(user.role === 'faculty' && {
        departments: user.departments || [],
        years: user.years || [],
        semesters: user.semesters || [],
        sections: user.sections || [],
        assignments: user.assignments || [],
        isEventQuizAccount: user.isEventQuizAccount || false
      })
    };

    res.json({ user: userResponse });
  } catch (error) {
    console.error('GET /me - Error:', {
      error: error.message,
      type: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { name, email, department, year, section } = req.body;
    const userId = req.user._id;

    // Basic validation
    if (!name || !email || !department) {
      return res.status(400).json({ message: 'Name, email, and department are required' });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic fields
    user.name = name;
    user.email = email;
    user.department = department;

    // Update student-specific fields
    if (user.role === 'student') {
      if (!year || !section) {
        return res.status(400).json({ message: 'Year and section are required for students' });
      }
      user.year = year;
      user.section = section;
    }

    await user.save();

    // Return updated user data
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        ...(user.role === 'student' && {
          year: user.year,
          admissionNumber: user.admissionNumber,
          isLateral: user.isLateral,
          section: user.section
        })
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Enhanced profile update with role-based permissions
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, department, departments } = req.body;
    const userId = req.user._id;

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Role-based validation and updates
    if (user.role === 'admin') {
      // Admin can update all fields
      if (name) user.name = name;
      if (email) {
        // Validate email format
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: 'Invalid email format' });
        }

        // Check if email is already taken by another user
        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
          return res.status(400).json({ message: 'Email is already in use' });
        }
        user.email = email;
      }
      if (department) user.department = department;
      if (departments) user.departments = departments;
    }
    else if (user.role === 'faculty') {
      // Faculty can update name, email, and departments
      if (name) user.name = name;
      if (email) {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: 'Invalid email format' });
        }

        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
          return res.status(400).json({ message: 'Email is already in use' });
        }
        user.email = email;
      }
      if (departments && Array.isArray(departments)) {
        user.departments = departments;
      }
    }
    else {
      // Students and event users cannot update profile info (only password)
      return res.status(403).json({
        message: 'Students and event users can only update their password'
      });
    }

    await user.save();

    // Return updated user data
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      departments: user.departments
    };

    // Add role-specific fields
    if (user.role === 'student') {
      userData.year = user.year;
      userData.semester = user.semester;
      userData.section = user.section;
      userData.admissionNumber = user.admissionNumber;
      userData.isLateral = user.isLateral;
    }

    res.json({ user: userData });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password endpoint
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    // Get current user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword; // This will be hashed by the pre-save hook
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create admin user if not exists
// const createAdminIfNotExists = async () => {
//   try {
//     let adminUser = await User.findOne({ role: 'admin' });
//     const password = 'Admin@123';
//     const hashedPassword = '$2a$10$RuemUlvHDoX4XwqHqcrZ8.QksHB8K1Abh5NgsP.0ZTUHgbpMMwEbK';

//     if (!adminUser) {
//       // Create new admin
//       adminUser = new User({
//         name: 'System Administrator',
//         email: 'admin@quizapp.com',
//         password: hashedPassword,
//         originalPassword: password,
//         role: 'admin',
//         department: 'Computer Science'
//       });
      
//       await adminUser.save();
//       console.log('Admin user created successfully');
//     } else {
//       // Update admin's password to the correct hash
//       adminUser.password = hashedPassword;
//       adminUser.originalPassword = password;
//       await adminUser.save();
//       console.log('Admin user password updated successfully');
//     }
//   } catch (error) {
//     console.error('Error managing admin account:', error);
//   }
// };

// // Call this function when server starts
// createAdminIfNotExists();



// Check if admin exists
router.get('/check-admin', async (req, res) => {
  try {
    const adminExists = await User.exists({ role: 'admin' });
    res.json({ adminExists: !!adminExists });
  } catch (error) {
    console.error('Error checking admin existence:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 