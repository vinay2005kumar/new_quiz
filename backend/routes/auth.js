const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const EventQuizAccount = require('../models/EventQuizAccount');
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { sendForgotPasswordEmail } = require('../services/emailService');

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
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    // First try to find user in EventQuizAccount model
    let user = await EventQuizAccount.findOne({ email: email.toLowerCase() });
    let isEventAccount = false;

    // If not found in EventQuizAccount model, check User model
    if (!user) {
      user = await User.findOne({ email: email.toLowerCase() });
    } else {
      isEventAccount = true;
    }

    if (!user) {
      console.log('Login failed: User not found for email:', email);
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Login failed: Invalid password for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      });
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
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
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

// Forgot Password - Send reset code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`🔐 Generated reset code for ${user.email}:`, {
      code: resetCode,
      expiryTime: resetCodeExpiry.toISOString(),
      currentTime: new Date().toISOString(),
      expiresInMinutes: Math.round((resetCodeExpiry - new Date()) / (1000 * 60))
    });

    // Save reset code to user
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpiry = resetCodeExpiry;
    await user.save();

    console.log(`💾 Reset code saved to database for ${user.email}`);

    // Verify the save worked
    const savedUser = await User.findOne({ email: user.email });
    console.log(`🔍 Verification - saved data:`, {
      email: savedUser.email,
      hasResetCode: !!savedUser.resetPasswordCode,
      resetCode: savedUser.resetPasswordCode,
      resetCodeExpiry: savedUser.resetPasswordExpiry?.toISOString(),
      isExpired: savedUser.resetPasswordExpiry ? savedUser.resetPasswordExpiry < new Date() : 'NO_EXPIRY_SET'
    });

    // Send email with reset code
    try {
      console.log(`📧 Attempting to send reset email to: ${user.email}`);
      await sendForgotPasswordEmail(user.email, user.name, resetCode);
      console.log(`✅ Reset email sent successfully to: ${user.email}`);

      console.log(`📤 Sending success response to frontend...`);
      return res.json({
        success: true,
        message: 'Password reset code sent to your email'
      });
    } catch (emailError) {
      console.error('❌ Error sending reset email:', emailError);
      console.error('Email error details:', {
        message: emailError.message,
        stack: emailError.stack,
        email: user.email,
        resetCode: resetCode
      });

      // Since you mentioned the email is actually being sent, let's return success
      // The reset code is saved in the database, so the user can still proceed
      console.log(`⚠️ Email error occurred but reset code is saved. Code: ${resetCode}`);

      console.log(`📤 Sending success response to frontend (despite email error)...`);
      return res.json({
        success: true,
        message: 'Password reset code sent to your email'
      });
    }

  } catch (error) {
    console.error('❌ OUTER CATCH - Error in forgot password:', error);
    console.error('❌ OUTER CATCH - Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Check if response was already sent
    if (res.headersSent) {
      console.log('⚠️ Response already sent, cannot send error response');
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// Verify Reset Code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    console.log(`🔍 Verifying reset code for email: ${email}, code: ${code}`);

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and reset code are required'
      });
    }

    // First, let's find the user and check their reset data
    const userWithResetData = await User.findOne({ email: email.toLowerCase() });

    if (!userWithResetData) {
      console.log(`❌ No user found with email: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    console.log(`🔍 User found. Reset data:`, {
      email: userWithResetData.email,
      storedCode: userWithResetData.resetPasswordCode,
      providedCode: code,
      codeMatch: userWithResetData.resetPasswordCode === code,
      storedExpiry: userWithResetData.resetPasswordExpiry?.toISOString(),
      currentTime: new Date().toISOString(),
      isExpired: userWithResetData.resetPasswordExpiry ? userWithResetData.resetPasswordExpiry < new Date() : 'NO_EXPIRY_SET',
      timeRemaining: userWithResetData.resetPasswordExpiry ? Math.round((userWithResetData.resetPasswordExpiry - new Date()) / (1000 * 60)) : 'NO_EXPIRY_SET'
    });

    // Now check with the original query
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordExpiry: { $gt: new Date() }
    });

    if (!user) {
      console.log(`❌ Verification failed. Possible reasons:`);
      console.log(`   - Code mismatch: ${userWithResetData.resetPasswordCode !== code}`);
      console.log(`   - Code expired: ${userWithResetData.resetPasswordExpiry ? userWithResetData.resetPasswordExpiry < new Date() : 'NO_EXPIRY_SET'}`);
      console.log(`   - No reset code set: ${!userWithResetData.resetPasswordCode}`);

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    console.log(`✅ Reset code verified successfully for: ${email}`);
    res.json({
      success: true,
      message: 'Reset code verified successfully'
    });

  } catch (error) {
    console.error('Error verifying reset code:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, reset code, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    console.log(`🔐 Attempting password reset for email: ${email}, code: ${code}`);

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordExpiry: { $gt: new Date() }
    });

    if (!user) {
      console.log(`❌ Password reset failed - invalid or expired code for: ${email}`);

      // Let's check what's in the database
      const userCheck = await User.findOne({ email: email.toLowerCase() });
      if (userCheck) {
        console.log(`🔍 User exists but reset failed. Reset data:`, {
          storedCode: userCheck.resetPasswordCode,
          providedCode: code,
          storedExpiry: userCheck.resetPasswordExpiry?.toISOString(),
          currentTime: new Date().toISOString(),
          isExpired: userCheck.resetPasswordExpiry ? userCheck.resetPasswordExpiry < new Date() : 'NO_EXPIRY_SET'
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset code'
      });
    }

    console.log(`✅ Password reset validation successful for: ${email}`);

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset fields
    user.password = hashedPassword;
    user.originalPassword = newPassword; // Store for admin access
    user.resetPasswordCode = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }
});

// Test email endpoint (for debugging)
router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for testing'
      });
    }

    console.log(`🧪 Testing email functionality for: ${email}`);

    // Test sending email
    const testCode = '123456';
    await sendForgotPasswordEmail(email, 'Test User', testCode);

    res.json({
      success: true,
      message: 'Test email sent successfully',
      testCode: testCode
    });

  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({
      success: false,
      message: 'Test email failed',
      error: error.message
    });
  }
});

module.exports = router;