const jwt = require('jsonwebtoken');
const User = require('../models/User');
// EventQuizAccount model removed - now using User model with role: 'event'

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

      // All users are now in the User model (including event users with role: 'event')
      const user = await User.findById(decoded.userId);
      const isEventAccount = user?.role === 'event';

      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check token exp
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTimestamp) {
        return res.status(401).json({ message: 'Token has expired' });
      }

      // Set user data and flags
      req.user = user;
      req.userId = user._id;
      req.token = token;
      req.isEventAccount = isEventAccount;
      req.userRole = isEventAccount ? 'event' : user.role; // Add explicit role field

      next();
    } catch (jwtError) {
      return res.status(401).json({
        message: 'Invalid credentials',
        error: jwtError.name
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

const isAdmin = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.userRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin only.' });
      }
      next();
    });
  } catch (error) {
    console.error('Admin authorization error:', error);
    res.status(500).json({ message: 'Server error during authorization' });
  }
};

const isEventAdmin = async (req, res, next) => {
  try {
    if (req.userRole !== 'admin' && !req.isEventAccount) {
      return res.status(403).json({ message: 'Access denied. Event admin only.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error during event admin check' });
  }
};

module.exports = { auth, authorize, isAdmin, isEventAdmin }; 