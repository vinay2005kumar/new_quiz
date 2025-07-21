import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
  Paper,
  TextField
} from '@mui/material';
import api from '../../config/axios';

const QuizSecurity = ({
  children,
  securitySettings = {},
  onSecurityViolation,
  onAutoSubmit,
  quizTitle = "Quiz",
  onOverrideStateChange,
  adminOverrideActive = false,
  onAdminOverrideChange
}) => {
  // Remove the console logs that cause re-renders
  // console.log('🔧 QuizSecurity component mounted/rendered');
  // console.log('🔧 securitySettings prop received:', securitySettings);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const violationCountRef = useRef(0); // Persistent count across re-mounts
  const [violations, setViolations] = useState([]);
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const [currentViolation, setCurrentViolation] = useState('');
  const lastViolationRef = useRef({ message: '', timestamp: 0 });
  const fullscreenCooldownRef = useRef(0);
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [showAutoSubmitDialog, setShowAutoSubmitDialog] = useState(false);
  const [autoSubmitReason, setAutoSubmitReason] = useState('');


  // 🚨 STRICT ONE-STRIKE SYSTEM
  const [violated, setViolated] = useState(false);
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const containerRef = useRef(null);

  // Admin override state - full functionality
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  // Use props for admin override instead of internal state
  const adminOverrideActiveRef = useRef(adminOverrideActive);

  // Sync ref with prop
  useEffect(() => {
    adminOverrideActiveRef.current = adminOverrideActive;
    console.log('🔧 Admin override prop changed:', adminOverrideActive);
  }, [adminOverrideActive]);
  const [showAdminSuccessDialog, setShowAdminSuccessDialog] = useState(false);
  const [showSecurityReenabledDialog, setShowSecurityReenabledDialog] = useState(false);

  const adminTimeoutRef = useRef(null);
  const legitimateExitRef = useRef(false);
  const consoleOpenRef = useRef(false);

  // Quiz settings state - same as CollegeSettings
  const [quizSettings, setQuizSettings] = useState(null);

  // Admin override settings - direct state for easy access
  const [adminOverrideSettings, setAdminOverrideSettings] = useState({
    enabled: false,
    triggerButtons: { button1: 'Alt', button2: '3' },
    password: 'admin'
  });

  // Quiz Settings Functions - same as CollegeSettings
  const fetchQuizSettings = async () => {
    try {
      console.log('=== FETCHING QUIZ SETTINGS (QuizSecurity) ===');
      const response = await api.get('/api/admin/quiz-settings');
      console.log('Quiz settings response (QuizSecurity):', response);

      if (response) {
        // Clean up any legacy defaultSecuritySettings that might still exist in database
        const cleanedSettings = { ...response };
        delete cleanedSettings.defaultSecuritySettings;

        // Validate and ensure only allowed settings remain
        const existingAdminOverride = cleanedSettings.adminOverride || {};
        const existingButton1 = existingAdminOverride.triggerButtons?.button1;
        const existingButton2 = existingAdminOverride.triggerButtons?.button2;

        // Validate button1 (must be Ctrl, Alt, or Shift)
        const validButton1 = ['Ctrl', 'Alt', 'Shift'].includes(existingButton1) ? existingButton1 : 'Ctrl';

        // Validate button2 (must be 0-9)
        const validButton2 = /^[0-9]$/.test(existingButton2) ? existingButton2 : '6';

        const allowedSettings = {
          adminOverride: {
            enabled: existingAdminOverride.enabled || false,
            password: existingAdminOverride.password || 'admin123',
            triggerButtons: { button1: validButton1, button2: validButton2 }
          },
          emergencyAccess: cleanedSettings.emergencyAccess || {
            enabled: true,
            password: 'Quiz@123',
            description: 'Emergency password allows admin access to any quiz even without registered credentials'
          },
          violationSettings: cleanedSettings.violationSettings || {
            maxViolations: 5,
            autoTerminate: true
          }
        };

        console.log('Cleaned quiz settings (QuizSecurity):', allowedSettings);
        setQuizSettings(allowedSettings);

        // Set admin override settings directly in state
        setAdminOverrideSettings(allowedSettings.adminOverride);
        console.log('🔧 Admin override settings loaded:', allowedSettings.adminOverride);
      }
    } catch (error) {
      console.error('Error fetching quiz settings (QuizSecurity):', error);
    }
  };

  // Memoized settings to prevent infinite loops
  const settings = useMemo(() => {
    console.log('🔧 useMemo settings calculation - quizSettings:', quizSettings);

    // Provide sensible defaults when quizSettings is not loaded yet
    const defaultViolationSettings = {
      maxViolations: 5,
      autoTerminate: true,
      strictMode: false
    };

    const result = {
      violationSettings: {
        maxViolations: securitySettings?.violationSettings?.maxViolations || quizSettings?.violationSettings?.maxViolations || defaultViolationSettings.maxViolations,
        autoTerminate: securitySettings?.violationSettings?.autoTerminate !== undefined ? securitySettings.violationSettings.autoTerminate : (quizSettings?.violationSettings?.autoTerminate !== undefined ? quizSettings.violationSettings.autoTerminate : defaultViolationSettings.autoTerminate),
        strictMode: securitySettings?.violationSettings?.strictMode || quizSettings?.violationSettings?.strictMode || defaultViolationSettings.strictMode
      },
      adminOverride: securitySettings?.adminOverride || quizSettings?.adminOverride || {
        enabled: false,
        triggerButtons: { button1: 'Alt', button2: '3' },
        password: 'admin123'
      }
    };

    console.log('🔧 useMemo settings result:', result);
    return result;
  }, [securitySettings, quizSettings]);

  // Settings function - now just returns memoized settings
  const getSettings = () => {
    return settings;
  };

  // Load quiz settings on mount - same as CollegeSettings
  useEffect(() => {
    console.log('🔧 QuizSecurity component mounted - ID:', Math.random().toString(36).substr(2, 9));

    // Check if admin override settings are already provided via props (for event quizzes)
    const hasAdminOverrideInProps = securitySettings?.adminOverride?.enabled !== undefined;

    if (hasAdminOverrideInProps) {
      console.log('🔧 Admin override settings provided via props, skipping internal fetch');
      // Set the admin override settings from props
      setAdminOverrideSettings(securitySettings.adminOverride);
    } else {
      console.log('🔧 No admin override in props, fetching from API');
      fetchQuizSettings();
    }
  }, []);

  // Debug: Log when adminOverrideSettings changes
  useEffect(() => {
    console.log('🔧 adminOverrideSettings state changed:', adminOverrideSettings);
  }, [adminOverrideSettings]);

  // Debug: Log when adminOverrideActive changes
  useEffect(() => {
    console.log('🔧 adminOverrideActive state changed:', adminOverrideActive);
  }, [adminOverrideActive]);

  // Admin override detection - separate useEffect to avoid closure issues
  useEffect(() => {
    const handleAdminOverrideDetection = (e) => {
      console.log('🔧 NEW handleAdminOverrideDetection called with key:', e.key);
      console.log('🔧 NEW Current adminOverrideSettings state:', adminOverrideSettings);

      // Check admin override using current state
      if (adminOverrideSettings.enabled && !adminOverrideActive) {
        const { button1, button2 } = adminOverrideSettings.triggerButtons || {};

        // Check for admin override key combinations
        if ((button1 === 'Ctrl' && e.ctrlKey && e.key === button2) ||
            (button1 === 'Alt' && e.altKey && e.key === button2) ||
            (button1 === 'Shift' && e.shiftKey && e.key === button2)) {
          console.log('🔧 NEW Admin override detected:', button1 + '+' + button2);
          e.preventDefault();
          e.stopPropagation();
          setShowAdminDialog(true);
          return; // Don't block admin override keys
        }
      }
    };

    // Add event listener with current state
    console.log('🔧 Adding NEW admin override event listener with current state:', adminOverrideSettings);
    document.addEventListener('keydown', handleAdminOverrideDetection, { capture: true, passive: false });

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleAdminOverrideDetection, { capture: true, passive: false });
    };
  }, [adminOverrideSettings, adminOverrideActive]); // Re-run when settings or override state changes

  useEffect(() => {
    // Only run if securitySettings is properly loaded
    if (!securitySettings) {
      console.log('🔒 QuizSecurity: No security settings provided, skipping security setup');
      return;
    }

    console.log('🔧 Setting up security with adminOverrideActive:', adminOverrideActive);

    // Console detection to prevent infinite fullscreen loops
    const detectConsole = () => {
      const threshold = 160; // Threshold for detecting console
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      const consoleOpen = widthThreshold || heightThreshold;

      if (consoleOpen !== consoleOpenRef.current) {
        consoleOpenRef.current = consoleOpen;
        console.log('🔧 Console detection:', consoleOpen ? 'OPEN' : 'CLOSED');
      }

      return consoleOpen;
    };

    // Check if any security features are actually enabled
    const hasAnySecurityEnabled = securitySettings.enableFullscreen ||
                                  securitySettings.disableRightClick ||
                                  securitySettings.disableCopyPaste ||
                                  securitySettings.disableTabSwitch ||
                                  securitySettings.enableProctoringMode;

    // Check if admin override or violation settings are provided (for event quizzes)
    const hasAdminOverrideSettings = securitySettings.adminOverride?.enabled !== undefined;
    const hasViolationSettings = securitySettings.violationSettings?.maxViolations !== undefined;

    if (!hasAnySecurityEnabled && !hasAdminOverrideSettings && !hasViolationSettings) {
      console.log('🔒 QuizSecurity: No security features or admin settings enabled, skipping security setup');
      return;
    }

    console.log('🔒 QuizSecurity: Setting up security - Basic features:', hasAnySecurityEnabled, 'Admin/Violation settings:', hasAdminOverrideSettings || hasViolationSettings);

    console.log('🔒 QuizSecurity mounted with settings:', securitySettings);
    console.log('🔒 Security settings breakdown:', {
      enableFullscreen: securitySettings.enableFullscreen,
      disableRightClick: securitySettings.disableRightClick,
      disableCopyPaste: securitySettings.disableCopyPaste,
      disableTabSwitch: securitySettings.disableTabSwitch,
      enableProctoringMode: securitySettings.enableProctoringMode
    });

    console.log('🔒 Security check:', {
      hasAnySecurityEnabled,
      fullscreen: securitySettings.enableFullscreen,
      proctoring: securitySettings.enableProctoringMode,
      adminOverride: adminOverrideActive
    });

    // Show fullscreen prompt if fullscreen is required AND admin override is not active
    if ((securitySettings.enableFullscreen || securitySettings.enableProctoringMode) && !adminOverrideActive) {
      console.log('🖥️ Fullscreen mode required, showing prompt...');
      // Show fullscreen prompt instead of directly entering fullscreen
      // This ensures user interaction which is required by modern browsers
      setShowFullscreenPrompt(true);
    } else if (adminOverrideActive) {
      console.log('🔓 Admin override active - skipping fullscreen requirement');
      setShowFullscreenPrompt(false);
    }

    // Set up security event listeners
    const securityListeners = [];



    // Monitor window focus to detect tab switching attempts
    if (securitySettings.enableFullscreen || securitySettings.enableProctoringMode) {
      const handleWindowBlur = () => {
        // Skip if admin override is active
        if (adminOverrideActiveRef.current) {
          console.log('🔓 Admin override active - skipping window blur violation');
          return;
        }

        handleViolation('⚠️ Window Focus Lost!\n\nThe quiz window lost focus. This may indicate an attempt to switch to another tab or application.\n\nPlease keep the quiz window focused at all times.');

        // Try to regain focus
        setTimeout(() => {
          window.focus();
        }, 100);
      };

      const handleWindowFocus = () => {
        // Window regained focus
      };

      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
      securityListeners.push(() => {
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
      });
    }

    // Selective right-click blocking - Only when explicitly enabled
    if (securitySettings.disableRightClick === true) {
      const handleContextMenu = (e) => {
        // Skip blocking if admin override is active
        if (adminOverrideActive) {
          console.log('🔓 Admin override active - allowing right-click');
          return true;
        }

        // Allow right-click on form inputs and text areas for better UX
        const allowedElements = ['INPUT', 'TEXTAREA', 'SELECT'];
        if (allowedElements.includes(e.target.tagName)) {
          return true; // Allow right-click on form elements
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleViolation('⚠️ Right-Click Blocked!\n\nRight-click is disabled during the quiz to prevent access to browser context menu and potential security bypasses.');
        return false;
      };
      document.addEventListener('contextmenu', handleContextMenu, true);
      securityListeners.push(() => document.removeEventListener('contextmenu', handleContextMenu, true));
    }

    // Comprehensive new tab and link blocking (always enabled in fullscreen for security)
    if (securitySettings.enableFullscreen || securitySettings.enableProctoringMode) {
      // Block all link clicks that could open new tabs/windows
      const handleLinkClick = (e) => {
        const target = e.target.closest('a');
        if (target) {
          // Block all external links and new tab attempts
          if (target.target === '_blank' ||
              target.href.startsWith('http') ||
              e.ctrlKey || e.metaKey || e.shiftKey ||
              e.button === 1) { // Middle click
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            handleViolation('⚠️ External Link Blocked!\n\nOpening external links or new tabs is not allowed during the quiz for security reasons.');
            return false;
          }
        }
      };

      // Block middle mouse button (opens links in new tab)
      const handleMouseDown = (e) => {
        if (e.button === 1) { // Middle mouse button
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleViolation('⚠️ Middle Click Blocked!\n\nMiddle mouse button clicks are disabled during the quiz to prevent opening new tabs.');
          return false;
        }
      };

      // Override window.open to prevent new windows/tabs
      const originalWindowOpen = window.open;
      window.open = function(...args) {
        handleViolation('⚠️ New Window Blocked!\n\nAttempt to open a new window or tab was blocked for security reasons.');
        return null;
      };

      // Block navigation attempts (address bar, bookmarks, etc.)
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = '⚠️ Quiz in Progress!\n\nLeaving this page will terminate your quiz session. Are you sure you want to continue?';
        handleViolation('⚠️ Navigation Attempt Blocked!\n\nYou attempted to navigate away from the quiz page. This action is not allowed during the quiz.');
        return e.returnValue;
      };

      // Block all form submissions that could navigate away
      const handleFormSubmit = (e) => {
        const form = e.target;
        if (form.tagName === 'FORM' && form.target === '_blank') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('⚠️ Form Submission Blocked!\n\nForm submissions to new tabs/windows are not allowed during the quiz.');
          return false;
        }
      };

      // Block drag and drop that could open files/links
      const handleDragStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleViolation('⚠️ Drag & Drop Blocked!\n\nDrag and drop operations are disabled during the quiz for security reasons.');
        return false;
      };
      document.addEventListener('click', handleLinkClick, true);
      document.addEventListener('mousedown', handleMouseDown, true);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('submit', handleFormSubmit, true);
      document.addEventListener('dragstart', handleDragStart, true);


      // Additional escape key blocker at document level (highest priority)
      const handleEscapeBlock = (e) => {
        if (e.key === 'Escape') {
          console.log('🚫 Escape key intercepted at document level');
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          // Force fullscreen immediately
          setTimeout(() => {
            enterFullscreen();
          }, 1);

          return false;
        }
      };

      document.addEventListener('keydown', handleEscapeBlock, true);

      securityListeners.push(() => {
        document.removeEventListener('click', handleLinkClick, true);
        document.removeEventListener('mousedown', handleMouseDown, true);
        document.removeEventListener('keydown', handleEscapeBlock, true);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('submit', handleFormSubmit, true);
        document.removeEventListener('dragstart', handleDragStart, true);

        window.open = originalWindowOpen; // Restore original function
      });
    }

    // Disable copy/paste (only if explicitly enabled)
    if (securitySettings.disableCopyPaste === true || securitySettings.enableProctoringMode === true) {
      const handleKeyDown = (e) => {
        // Skip blocking if admin override is active
        if (adminOverrideActive) {
          console.log('🔓 Admin override active - allowing copy/paste operations');
          return;
        }

        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
          e.preventDefault();
          handleViolation('Copy/Paste operations are disabled during the quiz');
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      securityListeners.push(() => document.removeEventListener('keydown', handleKeyDown));
    }

    // Enhanced tab switching monitoring (always enabled in fullscreen/proctoring mode)
    if (securitySettings.disableTabSwitch === true || securitySettings.enableProctoringMode === true || securitySettings.enableFullscreen === true) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          console.log('🚨 Page became hidden - possible tab switch or new tab opened!');
          handleViolation('⚠️ Tab Switch Detected!\n\nThe quiz page became hidden. This typically happens when:\n• You opened a new tab\n• You switched to another tab\n• You minimized the browser\n\nPlease return to the quiz immediately.');

          // Try to regain focus after a short delay
          setTimeout(() => {
            window.focus();
            if (document.hidden) {
              handleViolation('⚠️ Page Still Hidden!\n\nThe quiz page is still not visible. Please close any other tabs and return to the quiz.');
            }
          }, 1000);
        }
      };

      const handleBlur = () => {
        handleViolation('⚠️ Window Focus Lost!\n\nThe quiz window lost focus. Please stay focused on the quiz at all times.');

        // Try to regain focus
        setTimeout(() => {
          window.focus();
        }, 100);
      };

      const handleFocus = () => {
        // Window regained focus
      };

      // Monitor page visibility more aggressively
      const handlePageShow = () => {
        console.log('✅ Page shown (back from background)');
      };

      const handlePageHide = () => {
        console.log('🚨 Page hidden (moved to background)');
        handleViolation('⚠️ Page Hidden!\n\nThe quiz page was moved to the background. This may indicate tab switching or opening new windows.');
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('pageshow', handlePageShow);
      window.addEventListener('pagehide', handlePageHide);

      securityListeners.push(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('pageshow', handlePageShow);
        window.removeEventListener('pagehide', handlePageHide);
      });
    }

    // Monitor fullscreen exit
    if (securitySettings.enableFullscreen || securitySettings.enableProctoringMode) {
      const handleFullscreenChange = () => {
        const isCurrentlyFullscreen = !!(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );

        console.log('🖥️ Fullscreen state changed:', isCurrentlyFullscreen);
        console.log('🔧 DEBUG: adminOverrideActive in fullscreen handler:', adminOverrideActiveRef.current);
        setIsFullscreen(isCurrentlyFullscreen);

        if (!isCurrentlyFullscreen && (securitySettings.enableFullscreen || securitySettings.enableProctoringMode) && !adminOverrideActiveRef.current) {
          // Check if console is open to prevent infinite loops
          const consoleOpen = detectConsole();

          if (consoleOpen) {
            console.log('🔧 Console detected open - skipping fullscreen violation to prevent infinite loop');
            return;
          }

          console.log('🖥️ Fullscreen exited unexpectedly, showing violation');
          handleViolation('🚨 CRITICAL SECURITY VIOLATION!\n\n⚠️ FULLSCREEN MODE EXITED!\n\nYou have exited fullscreen mode. This is a serious security violation that compromises quiz integrity.\n\n🔄 Please click "OK" and then click the fullscreen button to continue.\n\n⚠️ Repeated violations may result in immediate quiz termination and academic consequences.\n\n🚫 Do NOT attempt to exit fullscreen again!');

          // Show fullscreen prompt again to require user gesture instead of automatic re-entry
          setShowFullscreenPrompt(true);
        }
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);

      securityListeners.push(() => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      });
    }

    // 🚨 COLLEGE SETTINGS-BASED VIOLATION MONITORING
    if (securitySettings.enableFullscreen || securitySettings.enableProctoringMode) {

      // Get violation settings from college settings
      const violationSettings = getSettings().violationSettings;
      const maxViolations = violationSettings.maxViolations;
      const autoTerminate = violationSettings.autoTerminate;
      const strictMode = violationSettings.strictMode;

      console.log('🔒 Violation Settings:', { maxViolations, autoTerminate, strictMode });

      if (strictMode) {
        // STRICT MODE: Track and auto-submit on first fullscreen violation
        const handleStrictFullscreenChange = () => {
          if (!document.fullscreenElement && !violated && !adminOverrideActiveRef.current) {
            console.log('🚨 STRICT FULLSCREEN VIOLATION DETECTED');
            strictAutoSubmit('You exited full-screen mode. Quiz will be submitted.');
          }
        };

        // Add strict fullscreen monitoring
        document.addEventListener('fullscreenchange', handleStrictFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleStrictFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleStrictFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleStrictFullscreenChange);

        securityListeners.push(() => {
          document.removeEventListener('fullscreenchange', handleStrictFullscreenChange);
          document.removeEventListener('webkitfullscreenchange', handleStrictFullscreenChange);
          document.removeEventListener('mozfullscreenchange', handleStrictFullscreenChange);
          document.removeEventListener('MSFullscreenChange', handleStrictFullscreenChange);
        });
      }
    }

    // COLLEGE SETTINGS-BASED TAB SWITCH MONITORING
    if (securitySettings.disableTabSwitch || securitySettings.enableProctoringMode || securitySettings.enableFullscreen) {

      // Get violation settings from college settings
      const violationSettings = getSettings().violationSettings;
      const maxViolations = violationSettings.maxViolations;
      const strictMode = violationSettings.strictMode;

      if (strictMode) {
        // STRICT MODE: Track and auto-submit on first tab switch violation
        const handleStrictVisibilityChange = () => {
          if (document.visibilityState === 'hidden' && !violated && !adminOverrideActiveRef.current) {
            console.log('🚨 STRICT TAB SWITCH VIOLATION DETECTED');
            strictAutoSubmit('You switched tabs. Quiz submitted.');
          }
        };

        document.addEventListener('visibilitychange', handleStrictVisibilityChange);

        securityListeners.push(() => {
          document.removeEventListener('visibilitychange', handleStrictVisibilityChange);
        });
      }
    }

    // � ADMIN OVERRIDE KEY DETECTION - Always active
    const handleAdminOverrideDetection = (e) => {
      console.log('🔧 handleAdminOverrideDetection called with key:', e.key);
      console.log('🔧 Current adminOverrideSettings state:', adminOverrideSettings);

      // Use direct admin override settings state
      console.log('🔧 Admin override check:', {
        enabled: adminOverrideSettings.enabled,
        adminOverrideActive: adminOverrideActive,
        triggerButtons: adminOverrideSettings.triggerButtons,
        currentKey: e.key,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey
      });

      // Check admin override using direct state
      if (adminOverrideSettings.enabled && !adminOverrideActive) {
        const { button1, button2 } = adminOverrideSettings.triggerButtons || {};

        // Check for admin override key combinations
        if ((button1 === 'Ctrl' && e.ctrlKey && e.key === button2) ||
            (button1 === 'Alt' && e.altKey && e.key === button2) ||
            (button1 === 'Shift' && e.shiftKey && e.key === button2)) {
          console.log('🔧 Admin override detected:', button1 + '+' + button2);
          e.preventDefault();
          e.stopPropagation();
          setShowAdminDialog(true);
          return; // Don't block admin override keys
        }
      }
    };

    // Add admin override detection - always active
    console.log('🔧 Adding admin override event listener...');
    document.addEventListener('keydown', handleAdminOverrideDetection, { capture: true, passive: false });
    securityListeners.push(() => {
      document.removeEventListener('keydown', handleAdminOverrideDetection, { capture: true, passive: false });
    });

    // 🔒 SIMPLE & EFFECTIVE KEY DETECTION SYSTEM
    if (securitySettings.enableFullscreen || securitySettings.enableProctoringMode) {

      // Simple key detection with specific alerts
      const handleKeyDetection = (e) => {
        // Skip all other blocking if admin override is active
        if (adminOverrideActiveRef.current) {
          console.log('🔓 Admin override active - allowing key:', e.key);
          return;
        }

        console.log(`🔍 Key pressed: ${e.key}`);

        // ESCAPE KEY DETECTION
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          alert("🚨 ESCAPE KEY DETECTED!\n\nEscape key pressed! You may be trying to exit full-screen.\n\nThis action is not allowed during the quiz.");

          // Check if strict mode is enabled
          const violationSettings = getSettings().violationSettings;
          if (violationSettings.strictMode) {
            strictAutoSubmit('You pressed the Escape key to exit fullscreen.');
          } else {
            handleViolation('Escape key usage detected');
          }
          return false;
        }

        // DEVELOPER TOOLS DETECTION
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
          e.preventDefault();
          e.stopPropagation();
          alert("🚨 DEVELOPER TOOLS BLOCKED!\n\nDev tools access is not allowed!\n\nThis action has been logged as a security violation.");
          handleViolation('Developer tools access attempt detected');
          return false;
        }

        // CONSOLE ACCESS DETECTION
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
          e.preventDefault();
          e.stopPropagation();
          alert("🚨 CONSOLE ACCESS BLOCKED!\n\nBrowser console access is not allowed!\n\nThis action has been logged as a security violation.");
          handleViolation('Console access attempt detected');
          return false;
        }

        // VIEW SOURCE DETECTION
        if (e.ctrlKey && e.key === 'u') {
          e.preventDefault();
          e.stopPropagation();
          alert("🚨 VIEW SOURCE BLOCKED!\n\nViewing page source is not allowed!\n\nThis action has been logged as a security violation.");
          handleViolation('View source attempt detected');
          return false;
        }

        // TAB SWITCHING DETECTION
        if ((e.altKey && e.key === 'Tab') || (e.ctrlKey && e.key === 'Tab')) {
          e.preventDefault();
          e.stopPropagation();
          alert("🚨 TAB SWITCHING BLOCKED!\n\nSwitching tabs is not allowed!\n\nThis action has been logged as a security violation.");

          // Check if strict mode is enabled
          const violationSettings = getSettings().violationSettings;
          if (violationSettings.strictMode) {
            strictAutoSubmit('You attempted to switch tabs.');
          } else {
            handleViolation('Tab switching attempt detected');
          }
          return false;
        }

        // NEW WINDOW/TAB DETECTION
        if (e.ctrlKey && e.key === 'n') {
          e.preventDefault();
          e.stopPropagation();
          alert("🚨 NEW WINDOW BLOCKED!\n\nOpening new windows is not allowed!\n\nThis action has been logged as a security violation.");
          handleViolation('New window attempt detected');
          return false;
        }

        if (e.ctrlKey && e.key === 't') {
          e.preventDefault();
          e.stopPropagation();
          alert("🚨 NEW TAB BLOCKED!\n\nOpening new tabs is not allowed!\n\nThis action has been logged as a security violation.");
          handleViolation('New tab attempt detected');
          return false;
        }

        // INCOGNITO WINDOW DETECTION
        if (e.ctrlKey && e.shiftKey && e.key === 'N') {
          e.preventDefault();
          e.stopPropagation();
          alert("🚨 INCOGNITO WINDOW BLOCKED!\n\nOpening incognito windows is not allowed!\n\nThis action has been logged as a security violation.");
          handleViolation('Incognito window attempt detected');
          return false;
        }

        // REFRESH DETECTION
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
          e.preventDefault();
          e.stopPropagation();
          alert("🚨 PAGE REFRESH BLOCKED!\n\nRefreshing the page is not allowed during the quiz!\n\nThis may cause loss of progress.");
          handleViolation('Page refresh attempt detected');
          return false;
        }
      };



      // 🔒 FULLSCREEN CHANGE MONITOR - Removed duplicate (using the one above)

      // 🌐 NEW WINDOW/TAB BLOCKER - Advanced Detection
      const blockNewWindows = (e) => {
        // Block Ctrl+N (New Window)
        if (e.ctrlKey && e.key === 'n') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('🚨 NEW WINDOW BLOCKED!\n\n⚠️ Attempt to open new window detected!\n\nCtrl+N is disabled during the quiz.\n\n🔒 This violation has been logged.');
          return false;
        }

        // Block Ctrl+T (New Tab)
        if (e.ctrlKey && e.key === 't') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('🚨 NEW TAB BLOCKED!\n\n⚠️ Attempt to open new tab detected!\n\nCtrl+T is disabled during the quiz.\n\n🔒 This violation has been logged.');
          return false;
        }

        // Block Ctrl+Shift+N (Incognito Window)
        if (e.ctrlKey && e.shiftKey && e.key === 'N') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('🚨 INCOGNITO WINDOW BLOCKED!\n\n⚠️ Attempt to open incognito window detected!\n\nCtrl+Shift+N is disabled during the quiz.\n\n🔒 This violation has been logged.');
          return false;
        }

        // Block Alt+Tab (Window Switching)
        if (e.altKey && e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('🚨 WINDOW SWITCHING BLOCKED!\n\n⚠️ Attempt to switch windows detected!\n\nAlt+Tab is disabled during the quiz.\n\n🔒 This violation has been logged.');
          return false;
        }
      };

      // 🔧 DEVELOPER TOOLS BLOCKER - Enhanced Detection
      const blockDevTools = (e) => {
        // F12 - Developer Tools
        if (e.key === 'F12') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('🚨 DEVELOPER TOOLS BLOCKED!\n\n⚠️ Attempt to open developer tools detected!\n\nF12 is disabled during the quiz.\n\n🔒 This violation has been logged.');
          return false;
        }

        // Ctrl+Shift+I - Developer Tools
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('🚨 DEVELOPER TOOLS BLOCKED!\n\n⚠️ Attempt to open developer tools detected!\n\nCtrl+Shift+I is disabled during the quiz.\n\n🔒 This violation has been logged.');
          return false;
        }

        // Ctrl+Shift+J - Console
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('🚨 CONSOLE ACCESS BLOCKED!\n\n⚠️ Attempt to open browser console detected!\n\nCtrl+Shift+J is disabled during the quiz.\n\n🔒 This violation has been logged.');
          return false;
        }

        // Ctrl+U - View Source
        if (e.ctrlKey && e.key === 'u') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('🚨 VIEW SOURCE BLOCKED!\n\n⚠️ Attempt to view page source detected!\n\nCtrl+U is disabled during the quiz.\n\n🔒 This violation has been logged.');
          return false;
        }
      };

      // 📱 MOBILE SECURITY - Touch and Gesture Blocking
      const blockMobileGestures = (e) => {
        // Block long press (context menu on mobile)
        if (e.type === 'touchstart' && e.touches.length === 1) {
          const touch = e.touches[0];
          setTimeout(() => {
            // If touch is still active after 500ms, it's a long press
            if (e.touches.length > 0) {
              e.preventDefault();
              handleViolation('🚨 LONG PRESS BLOCKED!\n\n⚠️ Long press detected on mobile device!\n\nLong press gestures are disabled during the quiz.\n\n🔒 This violation has been logged.');
            }
          }, 500);
        }
      };

      const handleKeyDown = (e) => {


        // Monitor F1 and F2 (can trigger browser help)
        if (e.key === 'F1' || e.key === 'F2') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('⚠️ Function Key Blocked!\n\nFunction keys are disabled during the quiz for security reasons.');
          return false;
        }

        // Monitor F11 (common fullscreen toggle)
        if (e.key === 'F11') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('⚠️ F11 Fullscreen Toggle Blocked!\n\nYou attempted to use F11 to exit fullscreen mode. This action is not allowed during the quiz for security reasons.');
          return false;
        }

        // Monitor Escape key (can exit fullscreen) - COMPLETELY BLOCK IT
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          // Check if we're in fullscreen and show prompt if not
          setTimeout(() => {
            const isCurrentlyFullscreen = !!(
              document.fullscreenElement ||
              document.webkitFullscreenElement ||
              document.mozFullScreenElement ||
              document.msFullscreenElement
            );

            if (!isCurrentlyFullscreen && !adminOverrideActiveRef.current) {
              console.log('🖥️ Escape detected - showing fullscreen prompt');
              handleViolation('🚨 ESCAPE KEY DETECTED!\n\n⚠️ You pressed the Escape key which can exit fullscreen mode.\n\n🔒 Please click "OK" and then click the fullscreen button to continue.\n\n⚠️ This action has been logged.');
              setShowFullscreenPrompt(true);
            }
          }, 10);

          handleViolation('⚠️ Escape Key Blocked!\n\nYou attempted to use the Escape key to exit fullscreen mode. This action is not allowed during the quiz for security reasons.\n\nThe system will automatically return to fullscreen mode.');
          return false;
        }

        // Block Ctrl+T (new tab)
        if (e.ctrlKey && e.key === 't') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleViolation('⚠️ New Tab Blocked!\n\nYou attempted to open a new tab. This action is not allowed during the quiz for security reasons.');
          return false;
        }

        // Block Ctrl+N (new window)
        if (e.ctrlKey && e.key === 'n') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleViolation('⚠️ New Window Blocked!\n\nYou attempted to open a new window. This action is not allowed during the quiz for security reasons.');
          return false;
        }

        // Block Ctrl+Shift+T (reopen closed tab)
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleViolation('⚠️ Reopen Tab Blocked!\n\nYou attempted to reopen a closed tab. This action is not allowed during the quiz for security reasons.');
          return false;
        }

        // Block Alt+Tab (task switching) - Note: This may not work in all browsers
        if (e.altKey && e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleViolation('⚠️ Task Switching Blocked!\n\nYou attempted to switch to another application. This action is not allowed during the quiz for security reasons.');
          return false;
        }

        // Monitor Alt+F4 (Windows close shortcut)
        if (e.altKey && e.key === 'F4') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('⚠️ Alt+F4 Blocked!\n\nYou attempted to close the browser window. This action is not allowed during the quiz.');
          return false;
        }

        // Monitor Ctrl+W (Close tab)
        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('⚠️ Close Tab Blocked!\n\nYou attempted to close the browser tab. This action is not allowed during the quiz.');
          return false;
        }

        // Monitor Ctrl+T (New tab)
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('⚠️ New Tab Blocked!\n\nYou attempted to open a new tab. This action is not allowed during the quiz.');
          return false;
        }

        // Disable F12 (Developer tools)
        if (e.key === 'F12') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('⚠️ Developer Tools Blocked!\n\nYou attempted to open developer tools. This action is not allowed during the quiz.');
          return false;
        }

        // Disable Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (Developer tools)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'J')) {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('⚠️ Developer Tools Blocked!\n\nYou attempted to open developer tools. This action is not allowed during the quiz.');
          return false;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
          e.preventDefault();
          e.stopPropagation();
          handleViolation('⚠️ View Source Blocked!\n\nYou attempted to view page source. This action is not allowed during the quiz.');
          return false;
        }

        // Monitor Alt+Tab and Cmd+Tab (though these can't be fully prevented)
        if ((e.altKey && e.key === 'Tab') || (e.metaKey && e.key === 'Tab')) {
          handleViolation('⚠️ Application Switching Detected!\n\nYou switched to another application. Please stay focused on the quiz.');
        }
      };

      // Key up handling is now done by global listeners

      // 🎯 SIMPLE & EFFECTIVE EVENT LISTENER SETUP

      // Add simple key detection with highest priority
      document.addEventListener('keydown', handleKeyDetection, { capture: true, passive: false });
      window.addEventListener('keydown', handleKeyDetection, { capture: true, passive: false });

      // FULLSCREEN CHANGE MONITORS - FORCE RE-ENTRY (Already added above, removing duplicate)

      // Other security event listeners
      document.addEventListener('keydown', blockNewWindows, { capture: true, passive: false });
      document.addEventListener('keydown', blockDevTools, { capture: true, passive: false });
      document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });

      // Mobile security listeners
      document.addEventListener('touchstart', blockMobileGestures, { passive: false });
      document.addEventListener('touchend', blockMobileGestures, { passive: false });

      // Window event listeners for enhanced security
      const handleBeforeUnload = (e) => {
        if (!adminOverrideActiveRef.current) {
          e.preventDefault();
          e.returnValue = '🚨 QUIZ IN PROGRESS!\n\nAre you sure you want to leave? This will be recorded as a security violation.';
          handleViolation('🚨 PAGE UNLOAD ATTEMPT!\n\n⚠️ Attempt to leave quiz page detected!\n\nThis action has been blocked and logged as a security violation.');
          return e.returnValue;
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);

      // 🔒 NUCLEAR OPTION - OVERRIDE BROWSER ESCAPE BEHAVIOR
      const originalExitFullscreen = document.exitFullscreen;
      const originalWebkitExitFullscreen = document.webkitExitFullscreen;
      const originalMozCancelFullScreen = document.mozCancelFullScreen;
      const originalMsExitFullscreen = document.msExitFullscreen;

      // Override all fullscreen exit methods
      document.exitFullscreen = function() {
        console.log('🔧 exitFullscreen called - adminOverrideActive:', adminOverrideActive);

        // Allow fullscreen exit if admin override is active OR legitimate exit
        if (adminOverrideActive || legitimateExitRef.current) {
          console.log('🔧 Admin override active or legitimate exit - allowing fullscreen exit');
          legitimateExitRef.current = false; // Reset flag
          return originalExitFullscreen.call(document);
        }

        console.log('🚫 BLOCKED: document.exitFullscreen() call intercepted');
        handleViolation('🚨 FULLSCREEN EXIT BLOCKED!\n\n⚠️ Programmatic fullscreen exit attempt detected!\n\nThis action is not allowed during the quiz.');
        return Promise.reject(new Error('Fullscreen exit blocked during quiz'));
      };

      if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen = function() {
          // Allow fullscreen exit if admin override is active
          if (adminOverrideActive) {
            console.log('🔧 Admin override active - allowing webkit fullscreen exit');
            return originalWebkitExitFullscreen.call(document);
          }

          console.log('🚫 BLOCKED: document.webkitExitFullscreen() call intercepted');
          handleViolation('🚨 FULLSCREEN EXIT BLOCKED!\n\n⚠️ Programmatic fullscreen exit attempt detected!\n\nThis action is not allowed during the quiz.');
          return;
        };
      }

      if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen = function() {
          // Allow fullscreen exit if admin override is active
          if (adminOverrideActive) {
            console.log('🔧 Admin override active - allowing moz fullscreen exit');
            return originalMozCancelFullScreen.call(document);
          }

          console.log('🚫 BLOCKED: document.mozCancelFullScreen() call intercepted');
          handleViolation('🚨 FULLSCREEN EXIT BLOCKED!\n\n⚠️ Programmatic fullscreen exit attempt detected!\n\nThis action is not allowed during the quiz.');
          return;
        };
      }

      if (document.msExitFullscreen) {
        document.msExitFullscreen = function() {
          // Allow fullscreen exit if admin override is active
          if (adminOverrideActive) {
            console.log('🔧 Admin override active - allowing ms fullscreen exit');
            return originalMsExitFullscreen.call(document);
          }

          console.log('🚫 BLOCKED: document.msExitFullscreen() call intercepted');
          handleViolation('🚨 FULLSCREEN EXIT BLOCKED!\n\n⚠️ Programmatic fullscreen exit attempt detected!\n\nThis action is not allowed during the quiz.');
          return;
        };
      }

      // Enhanced popup blocker
      const originalOpen = window.open;
      window.open = function(...args) {
        if (!adminOverrideActiveRef.current) {
          handleViolation('🚨 POPUP BLOCKED!\n\n⚠️ Attempt to open popup window detected!\n\nPopup windows are disabled during the quiz.\n\n🔒 This violation has been logged.');
          return null;
        }
        return originalOpen.apply(this, args);
      };

      // SIMPLE CLEANUP FUNCTIONS
      securityListeners.push(() => {
        // Remove simple key detection listeners
        document.removeEventListener('keydown', handleKeyDetection, { capture: true });
        window.removeEventListener('keydown', handleKeyDetection, { capture: true });

        // Remove fullscreen change monitors (Already removed above, removing duplicate)

        // Remove other security listeners
        document.removeEventListener('keydown', blockNewWindows, { capture: true });
        document.removeEventListener('keydown', blockDevTools, { capture: true });
        document.removeEventListener('keydown', handleKeyDown, { capture: true });
        document.removeEventListener('touchstart', blockMobileGestures);
        document.removeEventListener('touchend', blockMobileGestures);
        window.removeEventListener('beforeunload', handleBeforeUnload);

        // Restore original browser functions
        window.open = originalOpen;
        document.exitFullscreen = originalExitFullscreen;
        if (originalWebkitExitFullscreen) document.webkitExitFullscreen = originalWebkitExitFullscreen;
        if (originalMozCancelFullScreen) document.mozCancelFullScreen = originalMozCancelFullScreen;
        if (originalMsExitFullscreen) document.msExitFullscreen = originalMsExitFullscreen;
      });


    }

    // Cleanup function
    return () => {
      securityListeners.forEach(cleanup => cleanup());

      // Add a small delay to allow navigation to complete before attempting fullscreen exit
      setTimeout(() => {
        // Only exit fullscreen if document is still active and we're actually in fullscreen
        if (document.fullscreenElement || document.webkitFullscreenElement ||
            document.mozFullScreenElement || document.msFullscreenElement) {
          exitFullscreen().catch(error => {
            console.log('🖥️ Fullscreen exit during cleanup failed (expected during navigation):', error.message);
          });
        }
      }, 100);
    };
  }, [
    securitySettings?.enableFullscreen,
    securitySettings?.disableRightClick,
    securitySettings?.disableCopyPaste,
    securitySettings?.disableTabSwitch,
    securitySettings?.enableProctoringMode,
    adminOverrideActive
  ]); // Re-run only when specific security settings change (removed violated to prevent resets)

  const enterFullscreen = async () => {
    // Always use document.documentElement to make the entire browser fullscreen
    const element = document.documentElement;

    console.log('🖥️ Entering fullscreen mode for entire browser...');

    try {
      // Check if fullscreen is supported
      const isFullscreenSupported = !!(
        element.requestFullscreen ||
        element.webkitRequestFullscreen ||
        element.mozRequestFullScreen ||
        element.msRequestFullscreen
      );

      if (!isFullscreenSupported) {
        handleViolation('⚠️ Fullscreen Not Supported!\n\nYour browser does not support fullscreen mode. Please use a modern browser (Chrome, Firefox, Edge) to take this quiz.');
        return;
      }

      // Check if fullscreen is allowed
      if (document.fullscreenEnabled === false) {
        handleViolation('⚠️ Fullscreen Disabled!\n\nFullscreen mode is disabled in your browser. Please enable it in browser settings to continue.');
        return;
      }

      // Try different fullscreen methods
      let fullscreenPromise;
      if (element.requestFullscreen) {
        console.log('🖥️ Using requestFullscreen');
        fullscreenPromise = element.requestFullscreen({ navigationUI: "hide" });
      } else if (element.webkitRequestFullscreen) {
        console.log('🖥️ Using webkitRequestFullscreen');
        fullscreenPromise = element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        console.log('🖥️ Using mozRequestFullScreen');
        fullscreenPromise = element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        console.log('🖥️ Using msRequestFullscreen');
        fullscreenPromise = element.msRequestFullscreen();
      }

      if (fullscreenPromise) {
        await fullscreenPromise;
        console.log('🖥️ Fullscreen request completed successfully');

        // Verify we actually entered fullscreen
        setTimeout(() => {
          const isActuallyFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
          );

          if (!isActuallyFullscreen) {
            console.warn('🖥️ Fullscreen request succeeded but not actually in fullscreen');
            handleViolation('⚠️ Fullscreen Failed!\n\nUnable to enter fullscreen mode. This may be due to browser security restrictions. Please try again or contact support.');
          }
        }, 500);
      }
    } catch (error) {
      console.error('🖥️ Fullscreen request failed:', error);

      // Handle specific error types more gracefully
      if (error.name === 'NotAllowedError') {
        console.log('🖥️ Fullscreen permission denied - this is often due to browser security policies or lack of user gesture');
        // Don't treat permission errors as violations in development/testing
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('🖥️ Development environment detected - not treating as violation');
          alert('⚠️ Fullscreen Permission Denied!\n\nThis is normal in development. The fullscreen API requires user interaction (click/touch).');
        } else {
          // In production, show the fullscreen prompt instead of treating as violation
          console.log('🖥️ Showing fullscreen prompt due to permission error');
          setShowFullscreenPrompt(true);
        }
      } else if (error.name === 'TypeError' && error.message.includes('Permissions')) {
        console.log('🖥️ Fullscreen permissions check failed - this is often normal in development');
        // Don't treat permissions check failures as violations
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('🖥️ Development environment detected - permissions check failure is normal');
          alert('⚠️ Fullscreen Permissions Check Failed!\n\nThis is normal in development. The quiz will continue without fullscreen.');
        } else {
          console.log('🖥️ Production environment - treating permissions failure as informational');
          // In production, log but don't create violation for permissions issues
          console.log('🖥️ Note: Fullscreen permissions check failed, continuing without fullscreen');
        }
      } else if (error.name === 'AbortError') {
        console.log('🖥️ Fullscreen request was aborted by user');
        handleViolation('⚠️ Fullscreen Cancelled!\n\nFullscreen request was cancelled. Please try again to continue the quiz.');
      } else {
        console.log('🖥️ Unknown fullscreen error:', error);
        // For unknown errors, also show the prompt instead of treating as violation
        console.log('🖥️ Showing fullscreen prompt due to unknown error');
        setShowFullscreenPrompt(true);
      }
    }
  };

  const exitFullscreen = async () => {
    console.log('🖥️ Exiting fullscreen mode...');

    // Check if we're actually in fullscreen mode
    const isInFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );

    if (!isInFullscreen) {
      console.log('🖥️ Not in fullscreen mode, skipping exit');
      return;
    }

    try {
      // Set legitimate exit flag to bypass blocking
      legitimateExitRef.current = true;

      if (document.exitFullscreen) {
        console.log('🖥️ Using exitFullscreen');
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        console.log('🖥️ Using webkitExitFullscreen');
        await document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        console.log('🖥️ Using mozCancelFullScreen');
        await document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        console.log('🖥️ Using msExitFullscreen');
        await document.msExitFullscreen();
      }
      console.log('🖥️ Fullscreen exit completed');
    } catch (error) {
      // More specific error handling
      if (error.message.includes('not active') || error.message.includes('Document not active')) {
        console.log('🖥️ Fullscreen exit failed: Document not active (expected during navigation)');
      } else {
        console.error('🖥️ Fullscreen exit failed:', error);
      }
    }
  };

  const handleViolation = (violation) => {
    // Skip violations if admin override is active
    console.log('🔧 handleViolation called - adminOverrideActiveRef.current:', adminOverrideActiveRef.current);
    if (adminOverrideActiveRef.current) {
      console.log('🔓 Admin override active - skipping violation:', violation);
      return;
    }

    // Skip violations if quiz is already violated (auto-submitted)
    if (violated) {
      console.log('🔓 Quiz already violated - skipping additional violations:', violation);
      return;
    }

    // Simple violation counting - increment by 1 using ref for persistence
    violationCountRef.current = violationCountRef.current + 1;
    const newCount = violationCountRef.current;
    setViolationCount(newCount);

    console.log('� SIMPLE Violation count update:', {
      previousCount: violationCountRef.current - 1,
      newCount: newCount,
      violation: violation.split('\n')[0]
    });

    const timestamp = new Date().toLocaleTimeString();
    const violationRecord = {
      type: violation,
      timestamp,
      id: Date.now(),
      severity: violation.includes('CRITICAL') ? 'critical' :
               violation.includes('ESCAPE') ? 'high' :
               violation.includes('NEW') ? 'high' :
               violation.includes('DEVELOPER') ? 'high' : 'medium'
    };

    const newViolations = [...violations, violationRecord];
    setViolations(newViolations);
    setCurrentViolation(violation);
    setShowViolationDialog(true);

    // Get max violations from security settings (includes college-level settings)
    const maxViolations = securitySettings?.violationSettings?.maxViolations || 1;
    const autoTerminate = securitySettings?.violationSettings?.autoTerminate !== false;

    console.log('🔧 Settings check:', {
      maxViolations,
      autoTerminate,
      currentCount: newCount
    });

    // Auto-submit when limit reached
    if (newCount >= maxViolations && autoTerminate) {
      console.log('🚨 AUTO-SUBMIT TRIGGERED - Count:', newCount, 'Max:', maxViolations);
      setViolated(true);

      const reason = `You have exceeded the maximum number of security violations (${maxViolations}).`;
      setAutoSubmitReason(reason);
      setShowAutoSubmitDialog(true);

      console.log('🚨 QUIZ AUTO-SUBMITTED - Final Report:', {
        totalViolations: newCount,
        maxAllowed: maxViolations,
        timestamp: new Date().toISOString()
      });
    }

    // Simple logging
    console.log('🚨 Security Violation Details:', {
      violation: violation.split('\n')[0],
      count: newCount,
      maxAllowed: maxViolations,
      remaining: maxViolations - newCount,
      timestamp: violationRecord.timestamp
    });

    if (onSecurityViolation) {
      onSecurityViolation({
        ...violationRecord,
        totalViolations: newCount
      });
    }
  };

  const handleViolationDialogClose = () => {
    setShowViolationDialog(false);
    setCurrentViolation('');
  };

  // Strict auto-submit function for immediate violations
  const strictAutoSubmit = (reason) => {
    // Skip auto-submit if admin override is active
    if (adminOverrideActiveRef.current) {
      console.log('🔓 Admin override active - skipping strict auto-submit:', reason);
      return;
    }

    console.log('🚨 STRICT AUTO-SUBMIT TRIGGERED:', reason);
    setViolated(true);

    // Set auto-submit reason and show dialog
    setAutoSubmitReason(reason);
    setShowAutoSubmitDialog(true);

    // Log the strict violation
    console.log('🚨 STRICT VIOLATION - IMMEDIATE SUBMISSION:', {
      reason,
      timestamp: new Date().toISOString(),
      strictMode: true
    });
  };



  const generateDailyPassword = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Your secret algorithm (only you know this)
    const secretKey = 7; // Your personal multiplier
    const dateSum = year + month + day;
    const passwordNumber = (dateSum * secretKey) % 10000;

    return `admin${passwordNumber}`;
  };





  // Admin Override Functions

  const handleAdminSubmit = async () => {
    try {
      const response = await api.post('/api/admin/quiz-settings/validate-admin', {
        password: adminPassword
      });

      if (response.valid) {
        console.log('🔧 Admin override activated!');
        onAdminOverrideChange(true);
        adminOverrideActiveRef.current = true;
        setShowAdminDialog(false);
        setAdminPassword('');

        // No automatic timeout - security stays disabled until manually re-enabled
        console.log('🔧 Admin override activated - no automatic timeout, manual re-enable required');

        // Wait a moment for state to update, then exit fullscreen
        setTimeout(async () => {
          try {
            console.log('🔧 Checking fullscreen status:', !!document.fullscreenElement);
            if (document.fullscreenElement) {
              console.log('🔧 Attempting to exit fullscreen...');
              await document.exitFullscreen();
              console.log('🔧 Fullscreen exit completed');
            } else {
              console.log('🔧 Not in fullscreen, no need to exit');
            }
          } catch (error) {
            console.warn('🔧 Error exiting fullscreen:', error);
          }
        }, 100);

        // Show success dialog instead of alert
        console.log('🔧 Admin access granted. Security disabled until manually re-enabled.');
        setShowAdminSuccessDialog(true);
      }
    } catch (error) {
      console.error('Admin override failed:', error);
      alert('Invalid admin override password');
    }
  };

  const handleAdminCancel = () => {
    setShowAdminDialog(false);
    setAdminPassword('');
  };

  const handleReEnableSecurity = () => {
    // Clear any existing timeout
    if (adminTimeoutRef.current) {
      clearTimeout(adminTimeoutRef.current);
      adminTimeoutRef.current = null;
    }

    onAdminOverrideChange(false);
    adminOverrideActiveRef.current = false;
    console.log('🔧 Security manually re-enabled by admin');

    // Show dialog instead of alert and don't force fullscreen immediately
    setShowSecurityReenabledDialog(true);
  };

  const handleAutoSubmitConfirm = () => {
    setShowAutoSubmitDialog(false);

    // Call the auto-submit function if provided, otherwise redirect
    if (onAutoSubmit && typeof onAutoSubmit === 'function') {
      console.log('🚨 Calling onAutoSubmit function...');
      onAutoSubmit();
    } else {
      console.log('🚨 No onAutoSubmit function provided, redirecting...');
      window.location.href = '/student/dashboard';
    }
  };





  const getSecurityStatus = () => {
    const activeFeatures = [];
    if (securitySettings.enableFullscreen) activeFeatures.push('Fullscreen');
    if (securitySettings.disableRightClick) activeFeatures.push('Right-click disabled');
    if (securitySettings.disableCopyPaste) activeFeatures.push('Copy/Paste disabled');
    if (securitySettings.disableTabSwitch) activeFeatures.push('Tab switching monitored');
    if (securitySettings.enableProctoringMode) activeFeatures.push('Proctoring mode');

    return activeFeatures;
  };

  return (
    <div
      ref={containerRef}
      style={{
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
        cursor: 'default' // Ensure cursor is always visible
      }}
    >
      {/* Security Status Bar */}
      {(securitySettings.enableFullscreen || securitySettings.enableProctoringMode ||
        Object.values(securitySettings).some(Boolean)) && (
        <Box sx={{ 
          bgcolor: 'error.main', 
          color: 'error.contrastText', 
          p: 1, 
          textAlign: 'center',
          fontSize: '0.875rem'
        }}>
          🔒 Security Mode Active: {getSecurityStatus().join(', ')} | 
          Violations: {violations.length}
        </Box>
      )}

      {/* Admin Override Status Indicator */}
      {adminOverrideActive && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 9999,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            px: 2,
            py: 1,
            borderRadius: 1,
            boxShadow: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            🔧 ADMIN OVERRIDE ACTIVE
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleReEnableSecurity}
            sx={{
              bgcolor: 'error.main',
              color: 'error.contrastText',
              '&:hover': {
                bgcolor: 'error.dark'
              }
            }}
          >
            Re-enable Security
          </Button>
        </Box>
      )}

      {/* Main Content */}
      {children}







      {/* Security Violation Dialog */}
      <Dialog
        open={showViolationDialog}
        onClose={handleViolationDialogClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            border: '3px solid',
            borderColor: 'error.main',
            boxShadow: '0 0 20px rgba(255, 0, 0, 0.3)'
          }
        }}
      >
        <DialogTitle sx={{
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          bgcolor: 'error.light',
          color: 'error.contrastText'
        }}>
          🚨 SECURITY VIOLATION DETECTED 🚨
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="error" sx={{ mb: 2, fontSize: '1.1rem' }}>
            <Typography variant="h6" component="div" sx={{ mb: 1 }}>
              UNAUTHORIZED ACTION BLOCKED
            </Typography>
            <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-line' }}>
              {currentViolation}
            </Typography>
          </Alert>

          <Box sx={{ bgcolor: 'warning.light', p: 2, borderRadius: 1, mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
              ⚠️ IMPORTANT SECURITY NOTICE:
            </Typography>
            <Typography variant="body2">
              • This action has been logged with timestamp and details
              • Your quiz session is being monitored for security compliance
              • Repeated violations may result in automatic quiz termination
              • All security events are recorded for review by faculty
            </Typography>
          </Box>

          {violations.length > 1 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                MULTIPLE VIOLATIONS DETECTED: {violations.length} total violations
              </Typography>
              <Typography variant="body2">
                You are approaching the violation limit. Please follow quiz security guidelines.
              </Typography>
            </Alert>
          )}

          {violations.length >= 3 && (
            <Alert severity="error">
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                FINAL WARNING: {violations.length} violations recorded
              </Typography>
              <Typography variant="body2">
                One more violation may result in automatic quiz termination.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={handleViolationDialogClose}
            color="error"
            variant="contained"
            size="large"
            sx={{ minWidth: 200, fontSize: '1.1rem' }}
          >
            I UNDERSTAND - CONTINUE QUIZ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fullscreen Prompt Dialog */}
      <Dialog
        open={showFullscreenPrompt}
        onClose={() => {}} // Prevent closing without action
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ color: 'primary.main', textAlign: 'center' }}>
          🖥️ Fullscreen Mode Required
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This quiz requires fullscreen mode for security purposes.
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Fullscreen mode will:</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, pl: 2 }}>
            • Make the browser occupy your entire screen
            • Hide the browser address bar, bookmarks, and tabs
            • Prevent access to other applications via mouse
            • Monitor attempts to exit fullscreen mode
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            To ensure exam integrity, this quiz must be taken in fullscreen mode.
            Click "Enter Fullscreen" to continue.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Important:</strong>
            • Attempting to exit fullscreen will be logged as a security violation
            • Use Alt+Tab (Windows) or Cmd+Tab (Mac) if you need to access other applications
            • Press F11 or Esc to exit fullscreen (not recommended during quiz)
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={async () => {
              setShowFullscreenPrompt(false);
              await enterFullscreen();
            }}
            color="primary"
            variant="contained"
            size="large"
            sx={{ minWidth: 200 }}
          >
            Enter Fullscreen & Start Quiz
          </Button>
        </DialogActions>
      </Dialog>



      {/* Admin Override Dialog */}
      <Dialog
        open={showAdminDialog}
        onClose={handleAdminCancel}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            border: '3px solid',
            borderColor: 'warning.main',
            boxShadow: '0 0 20px rgba(255, 152, 0, 0.3)'
          }
        }}
      >
        <DialogTitle sx={{
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          bgcolor: 'warning.light',
          color: 'warning.contrastText'
        }}>
          🔧 ADMIN OVERRIDE
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="h6" component="div" sx={{ mb: 1 }}>
              ADMINISTRATIVE OVERRIDE DETECTED
            </Typography>
            <Typography variant="body2">
              You have pressed the admin override key combination: <strong>{adminOverrideSettings.triggerButtons.button1} + {adminOverrideSettings.triggerButtons.button2}</strong>
            </Typography>
          </Alert>

          <Typography variant="body1" sx={{ mb: 2 }}>
            Enter the admin override password to temporarily disable all quiz security features:
          </Typography>

          <TextField
            fullWidth
            type="password"
            label="Admin Override Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAdminSubmit();
              }
            }}
            autoFocus
            sx={{ mb: 2 }}
          />

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>⚠️ NOTICE:</strong>
              • This action will be logged and reported to administrators
              • Security features will be disabled until manually re-enabled
              • Use this feature only for legitimate administrative purposes
              • All override usage is tracked for audit purposes
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={handleAdminCancel}
            color="inherit"
            variant="outlined"
            sx={{ mr: 2 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdminSubmit}
            color="warning"
            variant="contained"
            size="large"
            disabled={!adminPassword.trim()}
          >
            ACTIVATE ADMIN OVERRIDE
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auto-Submit Dialog */}
      <Dialog
        open={showAutoSubmitDialog}
        onClose={() => {}} // Prevent closing without action
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ color: 'error.main', textAlign: 'center' }}>
          🚨 Quiz Auto-Submit
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Security Violation Limit Exceeded
            </Typography>
            <Typography variant="body2">
              {autoSubmitReason}
            </Typography>
          </Alert>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Your quiz will be automatically submitted for security reasons.
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>What happens next:</strong>
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, pl: 2 }}>
            • Your current answers will be saved and submitted
            • All violations have been logged and reported
            • You will be redirected to the results page
            • Contact your instructor if you believe this was an error
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={handleAutoSubmitConfirm}
            color="error"
            variant="contained"
            size="large"
            autoFocus
          >
            Submit Quiz Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Admin Override Success Dialog */}
      <Dialog
        open={showAdminSuccessDialog}
        onClose={() => setShowAdminSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            border: '3px solid',
            borderColor: 'success.main',
            borderRadius: 2,
            bgcolor: 'success.light',
            color: 'success.contrastText'
          }
        }}
      >
        <DialogTitle sx={{ color: 'success.main', textAlign: 'center', fontWeight: 'bold' }}>
          🔧 Admin Override Activated
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Quiz Security Successfully Overridden by Admin
            </Typography>
            <Typography variant="body2">
              All security measures have been temporarily disabled.
            </Typography>
          </Alert>

          <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
            You can now:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, pl: 2 }}>
            • Exit fullscreen mode
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, pl: 2 }}>
            • Use right-click context menu
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, pl: 2 }}>
            • Switch tabs and windows
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, pl: 2 }}>
            • Use copy/paste operations
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, pl: 2 }}>
            • Access developer tools
          </Typography>

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ⚠️ <strong>Important:</strong> Security will remain disabled until you manually re-enable it or the session expires.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={() => setShowAdminSuccessDialog(false)}
            color="success"
            variant="contained"
            size="large"
            autoFocus
          >
            Continue with Override Active
          </Button>
        </DialogActions>
      </Dialog>

      {/* Security Re-enabled Dialog */}
      <Dialog
        open={showSecurityReenabledDialog}
        onClose={() => setShowSecurityReenabledDialog(false)}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            border: '3px solid',
            borderColor: 'warning.main',
            borderRadius: 2,
            bgcolor: 'warning.light',
            color: 'warning.contrastText'
          }
        }}
      >
        <DialogTitle sx={{ color: 'warning.main', textAlign: 'center', fontWeight: 'bold' }}>
          🔒 Security Re-enabled
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              All Security Measures Restored
            </Typography>
            <Typography variant="body2">
              Admin override has been deactivated and security is now fully active.
            </Typography>
          </Alert>

          <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
            Security features now active:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, pl: 2 }}>
            • Right-click disabled
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, pl: 2 }}>
            • Tab switching blocked
          </Typography>
          <Typography variant="body2" sx={{ mb: 1, pl: 2 }}>
            • Copy/paste disabled
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, pl: 2 }}>
            • Developer tools blocked
          </Typography>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              ℹ️ <strong>Note:</strong> Fullscreen will be required when you navigate to a new quiz or refresh the page.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={() => setShowSecurityReenabledDialog(false)}
            color="warning"
            variant="contained"
            size="large"
            autoFocus
          >
            Continue with Security Active
          </Button>
        </DialogActions>
      </Dialog>



    </div>
  );
};

export default QuizSecurity;
