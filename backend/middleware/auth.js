const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EventQuizAccount = require('../models/EventQuizAccount');

const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware - Request path:', req.path);
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Auth middleware - Token check:', {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : null
    });
    
    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      console.log('Auth middleware - Verifying token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('Auth middleware - Token verified:', {
        userId: decoded.userId,
        exp: new Date(decoded.exp * 1000).toISOString(),
        role: decoded.role
      });

      let user;
      let isEventAccount = false;

      // If role is 'event', check EventQuizAccount first
      if (decoded.role === 'event') {
        user = await EventQuizAccount.findById(decoded.userId);
        if (user) {
          isEventAccount = true;
        }
      }

      // If not found or not event role, check User model
      if (!user) {
        user = await User.findById(decoded.userId);
      }

      console.log('Auth middleware - User lookup:', {
        found: !!user,
        userId: decoded.userId,
        isEventAccount,
        role: isEventAccount ? 'event' : (user?.role || 'unknown')
      });

      if (!user) {
        console.log('Auth middleware - User not found for token');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check token exp
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < currentTimestamp) {
        console.log('Auth middleware - Token expired:', {
          expiry: new Date(decoded.exp * 1000).toISOString(),
          current: new Date().toISOString()
        });
        return res.status(401).json({ message: 'Token has expired' });
      }

      // Set user data and flags
      req.user = user;
      req.userId = user._id;
      req.token = token;
      req.isEventAccount = isEventAccount;
      req.userRole = isEventAccount ? 'event' : user.role; // Add explicit role field

      console.log('Auth middleware - Authentication successful:', {
        userId: user._id,
        role: req.userRole,
        email: user.email,
        isEventAccount,
        tokenExp: new Date(decoded.exp * 1000).toISOString()
      });

      next();
    } catch (jwtError) {
      console.error('Auth middleware - JWT verification failed:', {
        error: jwtError.message,
        name: jwtError.name,
        tokenPreview: token ? `${token.substring(0, 10)}...` : null
      });
      
      return res.status(401).json({ 
        message: 'Invalid credentials',
        error: jwtError.name
      });
    }
  } catch (error) {
    console.error('Auth middleware - Unexpected error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorize middleware:', {
      userRole: req.userRole,
      requiredRoles: roles,
      path: req.path
    });

    if (!roles.includes(req.userRole)) {
      console.error('Authorization failed:', {
        userRole: req.userRole,
        requiredRoles: roles,
        path: req.path
      });
      return res.status(403).json({ 
        message: 'You do not have permission to perform this action',
        userRole: req.userRole,
        requiredRoles: roles
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