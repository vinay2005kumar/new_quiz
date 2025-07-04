import React, { useEffect, useRef, useState } from 'react';
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
  quizTitle = "Quiz",
  onOverrideStateChange
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState([]);
  const [showViolationDialog, setShowViolationDialog] = useState(false);
  const [currentViolation, setCurrentViolation] = useState('');
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false);
  const [personalOverrideActive, setPersonalOverrideActive] = useState(false);
  const [showPersonalDialog, setShowPersonalDialog] = useState(false);
  const [personalPassword, setPersonalPassword] = useState('');
  const [personalKeys, setPersonalKeys] = useState(new Set());
  const [adminOverrideActive, setAdminOverrideActive] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminKeys, setAdminKeys] = useState(new Set());
  const [adminConfig, setAdminConfig] = useState(null);
  const [pressedKeys, setPressedKeys] = useState(new Set()); // Track all currently pressed keys
  const containerRef = useRef(null);
  const personalTimeoutRef = useRef(null);
  const adminTimeoutRef = useRef(null);

  // Fetch admin config only once on mount
  useEffect(() => {
    fetchAdminConfig();
  }, []);

  useEffect(() => {
    // Only run if securitySettings is properly loaded
    if (!securitySettings) {
      console.log('🔒 QuizSecurity: No security settings provided, skipping security setup');
      return;
    }

    // Check if any security features are actually enabled
    const hasAnySecurityEnabled = securitySettings.enableFullscreen ||
                                  securitySettings.disableRightClick ||
                                  securitySettings.disableCopyPaste ||
                                  securitySettings.disableTabSwitch ||
                                  securitySettings.enableProctoringMode;

    if (!hasAnySecurityEnabled) {
      console.log('🔒 QuizSecurity: No security features enabled, skipping security setup');
      return;
    }

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
      proctoring: securitySettings.enableProctoringMode
    });

    if (securitySettings.enableFullscreen || securitySettings.enableProctoringMode) {
      console.log('🖥️ Fullscreen mode required, showing prompt...');
      // Show fullscreen prompt instead of directly entering fullscreen
      // This ensures user interaction which is required by modern browsers
      setShowFullscreenPrompt(true);
    }

    // Set up security event listeners
    const securityListeners = [];

    // Global key tracking for reliable override detection
    const handleGlobalKeyDown = (e) => {
      const key = e.key;

      // Only check for overrides if none are active
      if (!adminOverrideActive && !personalOverrideActive) {

        // Check admin override with modifier key support
        if (adminConfig?.enabled) {
          const { button1, button2 } = adminConfig.triggerButtons || {};

          console.log('🔧 Checking admin override:', {
            key: key,
            button1: button1,
            button2: button2,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey
          });

          // Handle different key combination formats
          let isAdminOverride = false;

          // Check for Ctrl+number combination (button1="Ctrl", button2="5")
          if (button1 === 'Ctrl' && /^[0-9]$/.test(button2)) {
            console.log('🔧 Checking Ctrl+number combo:', {
              key: key,
              button2: button2,
              ctrlPressed: e.ctrlKey,
              keyMatches: key === button2,
              shouldTrigger: e.ctrlKey && key === button2
            });

            if (e.ctrlKey && key === button2) {
              isAdminOverride = true;
              console.log('🔧 Ctrl+number override triggered!');
            }
          }
          // Check for Alt+number combination
          else if (button1 === 'Alt' && /^[0-9]$/.test(button2)) {
            if (e.altKey && key === button2) {
              isAdminOverride = true;
              console.log('🔧 Alt+number override triggered!');
            }
          }
          // Check for Shift+number combination
          else if (button1 === 'Shift' && /^[0-9]$/.test(button2)) {
            if (e.shiftKey && key === button2) {
              isAdminOverride = true;
              console.log('🔧 Shift+number override triggered!');
            }
          }
          // Check for number key combinations (button1="1", button2="2")
          else if (/^[0-9]$/.test(button1) && /^[0-9]$/.test(button2)) {
            // Track number keys in a simple way
            setPressedKeys(prev => {
              const newSet = new Set(prev);
              newSet.add(key);

              if (newSet.has(button1) && newSet.has(button2)) {
                isAdminOverride = true;
              }

              return newSet;
            });
          }
          // Check for other modifier combinations
          else if ((button1 === 'Ctrl' || button2 === 'Ctrl') && e.ctrlKey) {
            const nonCtrlButton = button1 === 'Ctrl' ? button2 : button1;
            if (key === nonCtrlButton) {
              isAdminOverride = true;
            }
          }
          else if ((button1 === 'Alt' || button2 === 'Alt') && e.altKey) {
            const nonAltButton = button1 === 'Alt' ? button2 : button1;
            if (key === nonAltButton) {
              isAdminOverride = true;
            }
          }

          if (isAdminOverride) {
            console.log('🔧 Admin override detected!');
            e.preventDefault();
            e.stopPropagation();
            setShowAdminDialog(true);
            return;
          }
        }

        // Check personal override (number key combinations only)
        const personalConfig = getCurrentPersonalConfig();
        const { button1: pButton1, button2: pButton2 } = personalConfig.buttons;

        if (/^[0-9]$/.test(pButton1) && /^[0-9]$/.test(pButton2)) {
          setPressedKeys(prev => {
            const newSet = new Set(prev);
            newSet.add(key);

            if (newSet.has(pButton1) && newSet.has(pButton2)) {
              console.log('🔑 Personal override detected! Keys:', Array.from(newSet));
              e.preventDefault();
              e.stopPropagation();
              setShowPersonalDialog(true);
            }

            return newSet;
          });
        }
      }
    };

    const handleGlobalKeyUp = (e) => {
      const key = e.key;

      // Clear pressed keys for F-key combinations
      setPressedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);

        // Clear all keys if no modifier keys are pressed
        if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
          // If no modifiers are held, clear all tracked keys
          return new Set();
        }

        return newSet;
      });
    };

    // Add global key listeners with highest priority
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    document.addEventListener('keyup', handleGlobalKeyUp, true);
    securityListeners.push(() => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      document.removeEventListener('keyup', handleGlobalKeyUp, true);
    });

    // Monitor window focus to detect tab switching attempts
    if (securitySettings.enableFullscreen || securitySettings.enableProctoringMode) {
      const handleWindowBlur = () => {
        console.log('🖥️ Window lost focus - possible tab switch attempt');
        handleViolation('⚠️ Window Focus Lost!\n\nThe quiz window lost focus. This may indicate an attempt to switch to another tab or application.\n\nPlease keep the quiz window focused at all times.');

        // Try to regain focus
        setTimeout(() => {
          window.focus();
        }, 100);
      };

      const handleWindowFocus = () => {
        console.log('🖥️ Window regained focus');
      };

      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);
      securityListeners.push(() => {
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
      });
    }

    // Disable right-click (always enabled in fullscreen for security)
    if (securitySettings.disableRightClick === true || securitySettings.enableProctoringMode === true || securitySettings.enableFullscreen === true) {
      const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleViolation('⚠️ Right-Click Blocked!\n\nRight-click is disabled during the quiz to prevent access to browser context menu and potential security bypasses.');
        return false;
      };
      document.addEventListener('contextmenu', handleContextMenu, true);
      securityListeners.push(() => document.removeEventListener('contextmenu', handleContextMenu, true));
    }

    // Disable copy/paste (only if explicitly enabled)
    if (securitySettings.disableCopyPaste === true || securitySettings.enableProctoringMode === true) {
      const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
          e.preventDefault();
          handleViolation('Copy/Paste operations are disabled during the quiz');
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      securityListeners.push(() => document.removeEventListener('keydown', handleKeyDown));
    }

    // Monitor tab switching (only if explicitly enabled)
    if (securitySettings.disableTabSwitch === true || securitySettings.enableProctoringMode === true) {
      const handleVisibilityChange = () => {
        if (document.hidden) {
          handleViolation('Tab switching detected! Please stay on the quiz page');
        }
      };

      const handleBlur = () => {
        handleViolation('Window focus lost! Please stay focused on the quiz');
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      
      securityListeners.push(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleBlur);
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
        setIsFullscreen(isCurrentlyFullscreen);

        if (!isCurrentlyFullscreen && (securitySettings.enableFullscreen || securitySettings.enableProctoringMode)) {
          console.log('🖥️ Fullscreen exited unexpectedly, showing violation');
          handleViolation('🚨 CRITICAL SECURITY VIOLATION!\n\n⚠️ FULLSCREEN MODE EXITED!\n\nYou have exited fullscreen mode. This is a serious security violation that compromises quiz integrity.\n\n🔄 The system will automatically attempt to return to fullscreen mode.\n\n⚠️ Repeated violations may result in immediate quiz termination and academic consequences.\n\n🚫 Do NOT attempt to exit fullscreen again!');

          // Try to re-enter fullscreen immediately and repeatedly
          const attemptReEntry = () => {
            console.log('🖥️ Attempting to re-enter fullscreen...');
            enterFullscreen();

            // Check again after a short delay and retry if still not fullscreen
            setTimeout(() => {
              const stillNotFullscreen = !(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
              );

              if (stillNotFullscreen) {
                console.log('🖥️ Still not in fullscreen, retrying...');
                attemptReEntry();
              }
            }, 500);
          };

          // Start re-entry attempts immediately
          attemptReEntry();
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

    // Monitor fullscreen exit attempts and disable developer tools
    if (securitySettings.enableFullscreen || securitySettings.enableProctoringMode) {
      const handleKeyDown = (e) => {
        // Override detection is now handled by global key listeners above
        // This section only handles security violations

        // If any override is active, don't block any keys
        if (personalOverrideActive || adminOverrideActive) {
          return;
        }
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
          handleViolation('⚠️ Escape Key Blocked!\n\nYou attempted to use the Escape key to exit fullscreen mode. This action is not allowed during the quiz for security reasons.');
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

      // Use capture phase to catch events before they bubble
      document.addEventListener('keydown', handleKeyDown, true);
      securityListeners.push(() => {
        document.removeEventListener('keydown', handleKeyDown, true);
      });

      // Prevent context menu on right-click (additional security)
      const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleViolation('⚠️ Right-Click Menu Blocked!\n\nRight-click context menu is disabled during the quiz for security reasons.');
        return false;
      };

      document.addEventListener('contextmenu', handleContextMenu, true);
      securityListeners.push(() => document.removeEventListener('contextmenu', handleContextMenu, true));
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
  }, [securitySettings]);

  const enterFullscreen = async () => {
    // Always use document.documentElement to make the entire browser fullscreen
    const element = document.documentElement;

    console.log('🖥️ Entering fullscreen mode for entire browser...');

    try {
      if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
        if (element.requestFullscreen) {
          console.log('🖥️ Using requestFullscreen');
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          console.log('🖥️ Using webkitRequestFullscreen');
          await element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
          console.log('🖥️ Using mozRequestFullScreen');
          await element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
          console.log('🖥️ Using msRequestFullscreen');
          await element.msRequestFullscreen();
        }
        console.log('🖥️ Fullscreen request completed successfully');
      } else {
        console.warn('🖥️ Fullscreen API not supported or disabled');
        handleViolation('Fullscreen mode is not supported or disabled in this browser');
      }
    } catch (error) {
      console.error('🖥️ Fullscreen request failed:', error);
      handleViolation(`Failed to enter fullscreen: ${error.message}`);
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
    const timestamp = new Date().toLocaleTimeString();
    const violationRecord = {
      type: violation,
      timestamp,
      id: Date.now()
    };

    const newViolations = [...violations, violationRecord];
    setViolations(newViolations);
    setCurrentViolation(violation);
    setShowViolationDialog(true);

    // Check if violation limit is reached
    if (newViolations.length >= 5) {
      // Auto-terminate quiz after 5 violations
      setTimeout(() => {
        alert('🚨 QUIZ TERMINATED 🚨\n\n' +
              'You have exceeded the maximum number of security violations (5).\n\n' +
              'Your quiz session has been terminated for security reasons.\n\n' +
              'Please contact your instructor if you believe this was an error.\n\n' +
              'You will now be redirected.');

        // Redirect to dashboard or quiz list
        window.location.href = '/student/dashboard';
      }, 2000);
    }

    if (onSecurityViolation) {
      onSecurityViolation({
        ...violationRecord,
        totalViolations: newViolations.length,
        isTerminating: newViolations.length >= 5
      });
    }
  };

  const handleViolationDialogClose = () => {
    setShowViolationDialog(false);
    setCurrentViolation('');
  };

  // Personal Override Algorithm Functions
  const generateDailyButtons = () => {
    const today = new Date();
    const dayOfMonth = today.getDate(); // 1-31
    const month = today.getMonth() + 1;  // 1-12

    // Algorithm: Number keys 1-9 (day % 9 + 1) and (month % 9 + 1)
    const button1 = `${(dayOfMonth % 9) + 1}`;
    const button2 = `${(month % 9) + 1}`;

    return { button1, button2 };
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

  const getCurrentPersonalConfig = () => {
    const buttons = generateDailyButtons();
    const password = generateDailyPassword();

    console.log(`🔑 Today's personal override: ${buttons.button1} + ${buttons.button2}, password: ${password}`);

    return { buttons, password };
  };

  const handlePersonalSubmit = () => {
    const personalConfig = getCurrentPersonalConfig();
    const correctPassword = personalConfig.password;

    if (personalPassword === correctPassword) {
      console.log('🔑 Personal override activated!');
      setPersonalOverrideActive(true);
      setShowPersonalDialog(false);
      setPersonalPassword('');
      setPersonalKeys(new Set());

      // Set timeout to deactivate override (10 minutes)
      const timeout = 10 * 60 * 1000; // 10 minutes
      personalTimeoutRef.current = setTimeout(() => {
        setPersonalOverrideActive(false);
        console.log('🔑 Personal override expired');
      }, timeout);

      // Silent activation - no alerts
      console.log('Personal access granted. Session expires in 10 minutes.');

      // Notify parent component
      if (onOverrideStateChange) {
        onOverrideStateChange({
          adminOverrideActive: false,
          personalOverrideActive: true,
          reEnableSecurity
        });
      }
    } else {
      console.log('Invalid personal access code');
      setPersonalPassword('');
    }
  };

  const handlePersonalCancel = () => {
    setShowPersonalDialog(false);
    setPersonalPassword('');
    setPersonalKeys(new Set());
  };

  // Admin Override Functions
  const fetchAdminConfig = async () => {
    try {
      const response = await api.get('/api/admin/quiz-settings/admin-config');
      setAdminConfig(response);
      console.log('🔧 Admin config loaded:', response);
    } catch (error) {
      console.error('Error fetching admin config:', error);
    }
  };

  const handleAdminSubmit = async () => {
    try {
      const response = await api.post('/api/admin/quiz-settings/validate-admin', {
        password: adminPassword
      });

      if (response.valid) {
        console.log('🔧 Admin override activated!');
        setAdminOverrideActive(true);
        setShowAdminDialog(false);
        setAdminPassword('');
        setAdminKeys(new Set());

        // Set timeout to deactivate override
        const timeout = response.sessionTimeout * 1000;
        adminTimeoutRef.current = setTimeout(() => {
          setAdminOverrideActive(false);
          console.log('🔧 Admin override expired');
        }, timeout);

        // Show success message
        console.log(`Admin access granted. Session expires in ${response.sessionTimeout} seconds.`);

        // Notify parent component
        if (onOverrideStateChange) {
          onOverrideStateChange({
            adminOverrideActive: true,
            personalOverrideActive: false,
            reEnableSecurity
          });
        }
      }
    } catch (error) {
      console.error('Admin override failed:', error);
      alert('Invalid admin override password');
    }
  };

  const handleAdminCancel = () => {
    setShowAdminDialog(false);
    setAdminPassword('');
    setAdminKeys(new Set());
  };

  // Function to re-enable security
  const reEnableSecurity = () => {
    // Clear all override states
    setAdminOverrideActive(false);
    setPersonalOverrideActive(false);

    // Clear timeouts
    if (adminTimeoutRef.current) {
      clearTimeout(adminTimeoutRef.current);
      adminTimeoutRef.current = null;
    }
    if (personalTimeoutRef.current) {
      clearTimeout(personalTimeoutRef.current);
      personalTimeoutRef.current = null;
    }

    console.log('🔒 Security re-enabled manually');

    // Notify parent component
    if (onOverrideStateChange) {
      onOverrideStateChange({
        adminOverrideActive: false,
        personalOverrideActive: false,
        reEnableSecurity
      });
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

      {/* Main Content */}
      {children}

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
            animation: 'pulse 2s infinite'
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            🔧 ADMIN OVERRIDE ACTIVE
          </Typography>
        </Box>
      )}

      {/* Personal Override Status Indicator - Ultra Discreet */}
      {personalOverrideActive && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 4,
            left: 4,
            zIndex: 9999,
            width: 4,
            height: 4,
            bgcolor: 'rgba(0, 255, 0, 0.1)',
            borderRadius: '50%',
            opacity: 0.2
          }}
        />
      )}

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

      {/* Personal Override Dialog - Ultra Discreet */}
      <Dialog
        open={showPersonalDialog}
        onClose={handlePersonalCancel}
        maxWidth="xs"
        fullWidth
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            boxShadow: 1
          }
        }}
      >
        <DialogTitle sx={{
          textAlign: 'center',
          fontSize: '1rem',
          py: 2
        }}>
          Access
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <TextField
            fullWidth
            type="password"
            label="Code"
            value={personalPassword}
            onChange={(e) => setPersonalPassword(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePersonalSubmit();
              }
            }}
            autoFocus
            variant="outlined"
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            onClick={handlePersonalCancel}
            color="inherit"
            variant="text"
            size="small"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePersonalSubmit}
            color="primary"
            variant="contained"
            size="small"
            disabled={!personalPassword.trim()}
          >
            OK
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
              You have pressed the admin override key combination: <strong>{adminConfig?.triggerButtons?.button1} + {adminConfig?.triggerButtons?.button2}</strong>
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
              • Security features will be disabled for {adminConfig?.sessionTimeout} seconds
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

    </div>
  );
};

export default QuizSecurity;
