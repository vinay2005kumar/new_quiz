# 🏗️ COMPLETE BACKEND STRUCTURE DOCUMENTATION

## 📊 DATABASE MODELS & RELATIONSHIPS

### 1. USER MODEL (models/User.js)
```
Collection: users
Purpose: Multi-role user management system

FIELDS:
├── _id: ObjectId (auto-generated, unique, primary key)
├── name: String (required, trim)
├── email: String (required, unique, lowercase)
├── password: String (required, hashed with bcrypt)
├── originalPassword: String (optional, for recovery)
├── role: String (required, enum: ['admin', 'faculty', 'student', 'event'], default: 'student')
├── createdAt: Date (auto-generated)
└── updatedAt: Date (auto-generated)

CONDITIONAL FIELDS (based on role):

STUDENT FIELDS (required when role = 'student'):
├── department: String (required)
├── year: Number (required, min: 1, max: 4)
├── semester: Number (required, min: 1, max: 8)
├── section: String (required)
├── admissionNumber: String (required, unique, sparse)
└── isLateral: Boolean (default: false)

FACULTY/EVENT FIELDS (required when role = 'faculty' or 'event'):
├── departments: [String] (required, min length: 1)
├── years: [String] (required, min length: 1)
├── semesters: [String] (required, min length: 1)
├── sections: [String] (required, min length: 1, validation: /^[A-Z]$/)
└── assignments: [Object] (required, min length: 1)
    ├── department: String (required)
    ├── year: String (required)
    ├── semester: String (required)
    ├── sections: [String] (required, validation: /^[A-Z]$/)
    └── subjects: [String] (default: [])

EVENT SPECIFIC:
├── isEventQuizAccount: Boolean (default: false)

INDEXES:
├── { email: 1 } (unique)
├── { admissionNumber: 1 } (unique, sparse)
└── { role: 1, department: 1 }

RELATIONSHIPS:
├── One-to-Many with Quiz (createdBy field)
├── One-to-Many with QuizSubmission (student field)
├── One-to-Many with EventQuizResult (student field)
└── One-to-Many with EventQuizAccount (createdBy field)
```

### 2. QUIZ MODEL (models/Quiz.js)
```
Collection: quizzes
Purpose: Academic quiz management with advanced features

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── title: String (required, trim)
├── description: String (trim)
├── type: String (required, enum: ['academic', 'event'])
├── createdBy: ObjectId (required, ref: 'User')
├── duration: Number (required, min: 1, in minutes)
├── totalMarks: Number (required, min: 1, auto-calculated)
├── passingMarks: Number (default: 0)
├── startTime: Date (required)
├── endTime: Date (required, validation: must be after startTime)
├── isActive: Boolean (default: true)
├── createdAt: Date (auto-generated)
└── updatedAt: Date (auto-generated)

SUBJECT FIELDS (required when type = 'academic'):
├── subject: Object
    ├── code: String (required for academic)
    └── name: String (required for academic)

EVENT FIELDS (required when type = 'event'):
├── eventDetails: Object
    ├── name: String (required for event)
    ├── description: String (required for event)
    ├── organizer: String (required for event)
    └── venue: String (required for event)

QUESTIONS ARRAY:
├── questions: [Object] (required, min length: 1)
    ├── question: String (required, supports HTML formatting)
    ├── options: [String] (required, exactly 4 options)
    ├── correctAnswer: Number (required, 0-3)
    ├── marks: Number (required, min: 1, default: 1)
    ├── negativeMarks: Number (default: 0, min: 0)
    └── isCodeQuestion: Boolean (default: false)

SECURITY SETTINGS:
├── securitySettings: Object
    ├── enableFullscreen: Boolean (default: false)
    ├── disableRightClick: Boolean (default: false)
    ├── disableCopyPaste: Boolean (default: false)
    ├── disableTabSwitch: Boolean (default: false)
    └── enableProctoringMode: Boolean (default: false)

QUIZ CONFIGURATION:
├── negativeMarkingEnabled: Boolean (default: false)
├── shuffleQuestions: Boolean (default: false)
├── instructions: String (trim)

ALLOWED GROUPS:
├── allowedGroups: [Object]
    ├── department: String
    ├── year: Number
    ├── semester: Number
    └── section: String

SECTION-SPECIFIC SETTINGS:
├── sectionEndTimes: Map
    ├── endTime: Date (required, validation: after startTime)
    └── isActive: Boolean (default: true)

├── sectionSettings: Map
    ├── shuffleQuestions: Boolean (default: false)
    ├── shuffleOptions: Boolean (default: false)
    ├── allowedAttempts: Number (default: 1, min: 1)
    └── instructions: String (trim)

EVENT QUIZ FIELDS:
├── participantType: String (enum: ['college', 'any'], default: 'college')
├── registrationEnabled: Boolean (default: true)
├── spotRegistrationEnabled: Boolean (default: false)
├── maxParticipants: Number (default: 0, 0 = unlimited)
├── participationMode: String (enum: ['individual', 'team'], default: 'individual')
├── teamSize: Number (default: 1, min: 1, max: 10)

ELIGIBILITY:
├── eligibility: Object
    ├── departments: [String] (default: ['all'])
    ├── years: [String] (default: ['all'])
    ├── semesters: [String] (default: ['all'])
    └── sections: [String] (default: ['all'])

REGISTRATIONS (for event quizzes):
├── registrations: [Object]
    ├── student: ObjectId (ref: 'User', optional)
    ├── name: String
    ├── email: String
    ├── college: String
    ├── department: String
    ├── year: String
    ├── section: String
    ├── phoneNumber: String
    ├── rollNumber: String
    ├── admissionNumber: String
    ├── isTeamRegistration: Boolean (default: false)
    ├── teamName: String
    ├── teamLeader: Object (same fields as individual)
    ├── teamMembers: [Object] (array of participant objects)
    ├── registeredAt: Date (default: Date.now)
    └── isSpotRegistration: Boolean (default: false)

SUBMISSIONS:
├── submissions: [Object]
    ├── student: ObjectId (ref: 'User')
    ├── answers: [Object]
        ├── questionIndex: Number
        └── selectedOption: Number
    ├── score: Number
    ├── submittedAt: Date (default: Date.now)
    └── status: String (enum: ['submitted', 'evaluated'], default: 'submitted')

INDEXES:
├── { isActive: 1, 'allowedGroups.department': 1, 'allowedGroups.year': 1, 'allowedGroups.section': 1 }
├── { createdBy: 1, type: 1 }
└── { startTime: 1, endTime: 1 }

RELATIONSHIPS:
├── Many-to-One with User (createdBy)
├── One-to-Many with QuizSubmission (quiz field)
└── Referenced in EventQuizResult (quiz field)
```

### 3. QUIZ SUBMISSION MODEL (models/QuizSubmission.js)
```
Collection: quizsubmissions
Purpose: Track student quiz attempts and results

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── quiz: ObjectId (required, ref: 'Quiz')
├── student: ObjectId (required, ref: 'User')
├── startTime: Date (required, default: Date.now)
├── submitTime: Date (optional)
├── duration: Number (auto-calculated in minutes, min: 0)
├── status: String (enum: ['started', 'submitted', 'evaluated'], default: 'started')
├── totalMarks: Number (default: 0)
├── createdAt: Date (auto-generated)
└── updatedAt: Date (auto-generated)

ANSWERS ARRAY:
├── answers: [Object]
    ├── questionId: ObjectId (required)
    ├── selectedOption: Number (required, 0-3)
    ├── isCorrect: Boolean (required)
    └── marks: Number (required, default: 0)

SOFT DELETE:
├── isDeleted: Boolean (default: false)
├── deletedAt: Date (default: null)
├── deletedBy: ObjectId (ref: 'User')
└── deletionReason: String (enum: ['Submission deleted by faculty', 'Account deactivated', 'Other'])

INDEXES:
├── { quiz: 1, student: 1 } (compound index)
└── { quiz: 1, status: 1 }

RELATIONSHIPS:
├── Many-to-One with Quiz (quiz field)
└── Many-to-One with User (student field)
```

### 4. EVENTQUIZ MODEL (models/EventQuiz.js)
```
Collection: eventquizzes
Purpose: Specialized quiz model for events with registration system

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── title: String (required, trim)
├── description: String (trim)
├── duration: Number (required, min: 1, in minutes)
├── startTime: Date (required)
├── endTime: Date (required, validation: must be after startTime)
├── createdBy: ObjectId (required, ref: 'User')
├── totalMarks: Number (auto-calculated from questions)
├── passingMarks: Number (default: 0)
├── instructions: String (trim)
├── emailInstructions: String (trim, default: "Please find your login credentials below...")
├── questionDisplayMode: String (enum: ['one-by-one', 'all-at-once'], default: 'one-by-one')
├── createdAt: Date (auto-generated)
└── updatedAt: Date (auto-generated)

PARTICIPANT MANAGEMENT:
├── participantType: String (enum: ['college', 'any'], default: 'college')
├── participantTypes: [String] (enum: ['college', 'external'], default: ['college'])
├── registrationEnabled: Boolean (default: true)
├── spotRegistrationEnabled: Boolean (default: false)
├── maxParticipants: Number (default: 0, 0 = unlimited)

TEAM CONFIGURATION:
├── participationMode: String (enum: ['individual', 'team'], default: 'individual')
├── teamSize: Number (default: 1, min: 1, max: 10)

ELIGIBILITY CRITERIA:
├── departments: [String] (default: ['all'])
├── years: [String] (default: ['all'])
├── semesters: [String] (default: ['all'])
└── sections: [String] (default: ['all'])

QUIZ SETTINGS:
├── negativeMarkingEnabled: Boolean (default: false)
├── shuffleQuestions: Boolean (default: false)

SECURITY SETTINGS:
├── securitySettings: Object
    ├── enableFullscreen: Boolean (default: false)
    ├── disableRightClick: Boolean (default: false)
    ├── disableCopyPaste: Boolean (default: false)
    ├── disableTabSwitch: Boolean (default: false)
    └── enableProctoringMode: Boolean (default: false)

QUESTIONS ARRAY:
├── questions: [Object] (required, min length: 1)
    ├── question: String (required)
    ├── options: [String] (required, exactly 4 options)
    ├── correctAnswer: Number (required, 0-3)
    ├── marks: Number (required, min: 1, default: 1)
    ├── negativeMarks: Number (default: 0, min: 0)
    └── isCodeQuestion: Boolean (default: false)

REGISTRATIONS ARRAY:
├── registrations: [Object]
    ├── student: ObjectId (ref: 'User', optional for external participants)
    ├── participantType: String (enum: ['college', 'external'])
    ├── name: String (required)
    ├── email: String (required)
    ├── college: String (required)
    ├── department: String (required)
    ├── year: String (required)
    ├── phoneNumber: String (required)
    ├── admissionNumber: String (optional)
    ├── isTeamRegistration: Boolean (default: false)
    ├── teamName: String (required for team registration)
    ├── teamLeader: Object (same structure as individual participant)
    ├── teamMembers: [Object] (array of participant objects)
    ├── registeredAt: Date (default: Date.now)
    ├── isSpotRegistration: Boolean (default: false)
    ├── isDeleted: Boolean (default: false)
    ├── deletedAt: Date
    └── deletedBy: ObjectId (ref: 'User')

STATUS MANAGEMENT:
├── status: String (enum: ['draft', 'upcoming', 'published', 'completed', 'cancelled'], default: 'draft')

INDEXES:
├── { startTime: 1, endTime: 1, status: 1 }
├── { createdBy: 1 }
└── { 'registrations.student': 1 }

RELATIONSHIPS:
├── Many-to-One with User (createdBy field)
├── One-to-Many with QuizCredentials (quiz field)
└── One-to-Many with EventQuizResult (quiz field)
```

### 5. EVENTQUIZRESULT MODEL (models/EventQuizResult.js)
```
Collection: eventquizresults
Purpose: Store results for event quiz attempts

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── quiz: ObjectId (required, ref: 'EventQuiz')
├── student: ObjectId (optional, ref: 'User', for authenticated participants)
├── score: Number (required, default: 0)
├── totalMarks: Number (required, default: 0)
├── submittedAt: Date (default: Date.now)
├── timeTaken: Number (default: 0, in seconds)
├── status: String (enum: ['completed', 'submitted', 'evaluated'], default: 'completed')
├── createdAt: Date (auto-generated)
└── updatedAt: Date (auto-generated)

PARTICIPANT INFO (for external participants):
├── participantInfo: Object
    ├── name: String (participant name)
    ├── email: String (contact email)
    ├── college: String (institution name)
    ├── department: String (academic department)
    ├── year: String (academic year)
    ├── isTeam: Boolean (default: false)
    ├── teamName: String (team name if applicable)
    └── teamMembers: [Object] (team member details)

ANSWERS ARRAY:
├── answers: [Object]
    ├── questionIndex: Number (required, question position in quiz)
    └── selectedOption: Number (default: null, selected answer 0-3)

INDEXES:
├── { quiz: 1, 'participantInfo.email': 1 } (unique compound for external participants)
├── { quiz: 1, student: 1 } (unique compound for authenticated participants)
├── { quiz: 1, score: -1 } (for leaderboards)
├── { student: 1, submittedAt: -1 }
└── { 'participantInfo.email': 1, submittedAt: -1 }

RELATIONSHIPS:
├── Many-to-One with EventQuiz (quiz field)
└── Many-to-One with User (student field, optional)
```

### 6. EVENTQUIZACCOUNT MODEL (models/EventQuizAccount.js)
```
Collection: eventquizaccounts
Purpose: Manage event manager accounts separate from main User model

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── name: String (required, trim)
├── email: String (required, unique, lowercase, trim)
├── password: String (required, hashed with bcrypt)
├── originalPassword: String (encrypted original password for admin access)
├── eventType: String (enum: ['department', 'organization'], default: 'department')
├── department: String (required for department type)
├── isActive: Boolean (default: true)
├── createdBy: ObjectId (required, ref: 'User')
├── createdAt: Date (default: Date.now)
└── updatedAt: Date (default: Date.now)

METHODS:
├── comparePassword(): Validates login credentials using bcrypt
└── Pre-save hook: Encrypts original password and hashes authentication password

INDEXES:
├── { email: 1 } (unique)
└── { createdBy: 1 }

RELATIONSHIPS:
├── Many-to-One with User (createdBy field)
└── One-to-Many with EventQuiz (as createdBy)
```

### 7. QUIZCREDENTIALS MODEL (models/QuizCredentials.js)
```
Collection: quizcredentials
Purpose: Manage login credentials for event quiz participants

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── quiz: ObjectId (required, ref: 'EventQuiz')
├── registration: ObjectId (required, registration record ID)
├── username: String (required, usually email)
├── password: String (required, hashed with bcrypt)
├── originalPassword: String (required, plain text for email notifications)
├── isActive: Boolean (default: true)
├── createdAt: Date (default: Date.now)
└── updatedAt: Date (default: Date.now)

PARTICIPANT DETAILS:
├── isTeam: Boolean (default: false)
├── teamName: String (for team participation)
├── participantDetails: Object (individual participant information)
├── teamMembers: [Object] (team member details if team participation)
├── memberRole: String (enum: ['Team Leader', 'Team Member'])

ACCOUNT SECURITY:
├── loginAttempts: Number (default: 0)
├── isLocked: Boolean (default: false)
├── lockUntil: Date (lock expiration time)
├── lastLogin: Date (last successful login)
├── sessionToken: String (current session identifier)

QUIZ ATTEMPT TRACKING:
├── hasAttemptedQuiz: Boolean (default: false)
├── quizSubmission: ObjectId (ref: 'EventQuizResult')
├── canReattempt: Boolean (default: false)
├── reattemptGrantedBy: ObjectId (ref: 'User')
└── reattemptGrantedAt: Date

DELETION TRACKING:
├── isDeleted: Boolean (default: false)
├── deletedAt: Date
├── deletedBy: ObjectId (ref: 'User')
└── deletionReason: String (enum: ['Registration cancelled', 'Account compromised', 'Other'])

METHODS:
├── comparePassword(): Validates login credentials
├── isAccountLocked(): Checks if account is currently locked
├── incLoginAttempts(): Increments failed login attempts and locks if needed
└── resetLoginAttempts(): Resets login attempts after successful login

INDEXES:
├── { quiz: 1, username: 1 } (unique compound)
└── { registration: 1 }

RELATIONSHIPS:
├── Many-to-One with EventQuiz (quiz field)
└── One-to-One with EventQuizResult (quizSubmission field)
```

### 8. ACADEMICDETAIL MODEL (models/AcademicDetail.js)
```
Collection: academicdetails
Purpose: Define academic structure (departments, years, semesters, sections, subjects)

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── department: String (required)
├── year: Number (required, min: 1)
├── semester: Number (required, min: 1, max: 8)
├── sections: String (required, comma-separated list, e.g., "A,B,C")
├── subjects: String (default: '', comma-separated list with format "Subject Name(CODE)")
├── credits: Number (required, min: 1)
├── createdAt: Date (auto-generated)
└── updatedAt: Date (auto-generated)

VALIDATION:
├── Sections: Must be single uppercase letters matching pattern /^[A-Z]$/
└── Subjects: Must match pattern /^.+\([A-Z]{2}\d{3}\)$/ (e.g., "Programming Fundamentals(CS101)")

METHODS:
└── getValidSectionsForSemester(): Returns valid sections for a semester

INDEXES:
└── { department: 1, year: 1, semester: 1 } (unique compound)

RELATIONSHIPS:
├── Referenced by User model for student/faculty assignments
└── Used by Quiz model for access control
```

### 9. DEPARTMENT MODEL (models/Department.js)
```
Collection: departments
Purpose: Manage department master data

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── name: String (required, unique)
├── code: String (required, unique)
├── description: String
├── createdAt: Date (auto-generated)
└── updatedAt: Date (auto-generated)

INDEXES:
├── { name: 1 } (unique)
└── { code: 1 } (unique)

RELATIONSHIPS:
├── Referenced by User, AcademicDetail, and other models
└── One-to-Many with AcademicDetail
```

### 10. COLLEGE MODEL (models/College.js)
```
Collection: colleges
Purpose: Store institution information and branding configuration

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── name: String (required)
├── address: String
├── email: String (lowercase)
├── phone: String
├── website: String
├── establishedYear: Number (min: 1800, max: current year)
├── description: String
├── isSetup: Boolean (default: false)
├── createdAt: Date (auto-generated)
└── updatedAt: Date (auto-generated)

BRANDING & APPEARANCE:
├── logo: String (URL or base64 string)
├── backgroundType: String (enum: ['gradient', 'solid', 'image'], default: 'gradient')
├── backgroundValue: String (CSS background value)
├── backgroundImage: String (background image URL or base64)

UI STYLING:
├── headerStyle: String (enum: ['transparent', 'solid', 'gradient'], default: 'transparent')
├── headerColor: String (default: 'rgba(255, 255, 255, 0.1)')
├── headerTextColor: String (default: 'white')
├── footerStyle: String (enum: ['transparent', 'solid', 'gradient'], default: 'solid')
├── footerColor: String (default: 'rgba(0, 0, 0, 0.8)')
└── footerTextColor: String (default: 'white')

INDEXES:
└── Unique constraint ensures only one college record exists

RELATIONSHIPS:
└── Referenced by various models for institutional context
```

### 11. QUIZSETTINGS MODEL (models/QuizSettings.js)
```
Collection: quizsettings
Purpose: Global quiz system configuration and security settings

FIELDS:
├── _id: ObjectId (auto-generated, unique)
├── collegeId: String (required, unique, default: 'default')
├── lastUpdatedBy: ObjectId (ref: 'User')
├── lastUpdatedAt: Date (default: Date.now)
├── createdAt: Date (auto-generated)
└── updatedAt: Date (auto-generated)

ADMIN OVERRIDE SYSTEM:
├── adminOverride: Object
    ├── enabled: Boolean (default: false)
    ├── password: String (default: 'admin123')
    ├── triggerButtons: Object
        ├── button1: String (enum: ['Ctrl', 'Alt', 'Shift'], default: 'Ctrl')
        └── button2: String (enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], default: '6')
    └── sessionTimeout: Number (default: 300, min: 60, max: 1800, in seconds)

EMERGENCY ACCESS:
├── emergencyAccess: Object
    ├── enabled: Boolean (default: true)
    ├── password: String (default: 'Quiz@123')
    └── description: String (feature description)

VIOLATION MANAGEMENT:
├── violationSettings: Object
    ├── maxViolations: Number (default: 5, min: 1, max: 20)
    ├── autoTerminate: Boolean (default: true)
    └── warningThreshold: Number (default: 3, min: 1, max: 10)

LOGGING CONFIGURATION:
├── loggingSettings: Object
    ├── logViolations: Boolean (default: true)
    ├── logAdminOverrides: Boolean (default: true)
    └── retentionDays: Number (default: 30, min: 1, max: 365)

METHODS:
├── getOrCreateDefault(): Static method to retrieve or create default settings
├── validateAdminPassword(): Validates admin override password
├── validateEmergencyPassword(): Validates emergency access password
└── isAdminOverrideAvailable(): Checks if admin override is enabled

INDEXES:
└── { collegeId: 1 } (unique, one settings record per college)

RELATIONSHIPS:
└── Many-to-One with User (lastUpdatedBy field)
```

---

## 🔗 API ENDPOINTS DOCUMENTATION

### **AUTHENTICATION ROUTES** (`/api/auth`)

#### POST `/api/auth/login`
**Purpose**: User authentication and JWT token generation
**Access**: Public
**Body**: `{ email, password }`
**Process**:
1. Validates email format and required fields
2. Finds user by email (case-insensitive)
3. Compares password using bcrypt
4. Generates JWT token with user data
5. Returns user info and token
**Response**: `{ user: {...}, token: "jwt_token" }`

#### POST `/api/auth/register`
**Purpose**: Student self-registration
**Access**: Public
**Body**: `{ name, email, password, department, year, semester, section, admissionNumber, isLateral }`
**Process**:
1. Validates all required student fields
2. Checks email and admission number uniqueness
3. Validates academic structure exists
4. Hashes password with bcrypt
5. Creates new student user
**Response**: `{ message: "Registration successful", user: {...} }`

#### GET `/api/auth/me`
**Purpose**: Get current authenticated user profile
**Access**: Protected (JWT required)
**Process**:
1. Extracts user from JWT token
2. Fetches complete user profile from database
3. Returns user data without sensitive fields
**Response**: `{ user: {...} }`

#### PUT `/api/auth/profile`
**Purpose**: Update user profile information
**Access**: Protected (JWT required)
**Body**: `{ name, email, department, year, semester, section }`
**Process**:
1. Validates user permissions for profile updates
2. Checks email uniqueness if changed
3. Updates allowed fields based on user role
4. Returns updated profile
**Response**: `{ message: "Profile updated", user: {...} }`

#### POST `/api/auth/change-password`
**Purpose**: Change user password
**Access**: Protected (JWT required)
**Body**: `{ currentPassword, newPassword }`
**Process**:
1. Validates current password
2. Hashes new password
3. Updates password in database
4. Optionally invalidates existing sessions
**Response**: `{ message: "Password changed successfully" }`

#### POST `/api/auth/forgot-password`
**Purpose**: Send password reset code to user's email
**Access**: Public
**Body**: `{ email }`
**Process**:
1. Validates email format and existence
2. Generates 6-digit reset code with 10-minute expiry
3. Saves reset code to user record
4. Sends professional email with reset code
5. Returns success/failure status
**Response**: `{ success: true, message: "Password reset code sent to your email" }`

#### POST `/api/auth/verify-reset-code`
**Purpose**: Verify the reset code before allowing password change
**Access**: Public
**Body**: `{ email, code }`
**Process**:
1. Validates email and code format
2. Checks if code exists and hasn't expired
3. Returns verification status
**Response**: `{ success: true, message: "Reset code verified successfully" }`

#### POST `/api/auth/reset-password`
**Purpose**: Reset password using verified code
**Access**: Public
**Body**: `{ email, code, newPassword }`
**Process**:
1. Validates all required fields
2. Verifies reset code is still valid
3. Hashes new password
4. Updates user password and clears reset fields
5. Stores original password for admin access
**Response**: `{ success: true, message: "Password reset successfully" }`

### **QUIZ ROUTES** (`/api/quiz`)

#### GET `/api/quiz`
**Purpose**: Get quizzes accessible to current user
**Access**: Protected (Students, Faculty)
**Query**: `{ page, limit, department, year, semester, section, subject }`
**Process**:
1. Determines user role and permissions
2. Filters quizzes based on user's access rights
3. For students: filters by allowedGroups matching their academic details
4. For faculty: shows quizzes they created
5. Applies pagination and sorting
**Response**: `{ quizzes: [...], total, page, limit }`

#### POST `/api/quiz`
**Purpose**: Create new academic quiz
**Access**: Protected (Faculty, Admin)
**Body**: `{ title, description, subject, duration, startTime, endTime, questions, allowedGroups, securitySettings }`
**Process**:
1. Validates faculty permissions for specified departments/subjects
2. Validates question format and structure
3. Calculates total marks from questions
4. Sets up security and access control settings
5. Creates quiz with proper relationships
**Response**: `{ message: "Quiz created", quiz: {...}, emailNotification: "Email notifications will be sent to X eligible students" }`
**Email Notification**: Automatically sends email notifications to all students matching the allowedGroups criteria

#### GET `/api/quiz/:id`
**Purpose**: Get specific quiz details
**Access**: Protected (Students, Faculty)
**Process**:
1. Fetches quiz by ID
2. Checks user access permissions
3. For students: validates eligibility and timing
4. For faculty: shows full quiz details including submissions
5. Returns appropriate data based on user role
**Response**: `{ quiz: {...}, canAccess: boolean, submissions?: [...] }`

#### PUT `/api/quiz/:id`
**Purpose**: Update existing quiz
**Access**: Protected (Faculty who created it, Admin)
**Body**: `{ title, description, duration, questions, allowedGroups, securitySettings }`
**Process**:
1. Validates ownership or admin permissions
2. Checks if quiz has submissions (limits certain updates)
3. Updates allowed fields
4. Recalculates total marks if questions changed
5. Maintains data integrity
**Response**: `{ message: "Quiz updated", quiz: {...} }`

#### DELETE `/api/quiz/:id`
**Purpose**: Delete quiz (soft delete)
**Access**: Protected (Faculty who created it, Admin)
**Process**:
1. Validates ownership or admin permissions
2. Checks for existing submissions
3. Performs soft delete or hard delete based on policy
4. Updates related records
**Response**: `{ message: "Quiz deleted successfully" }`

#### POST `/api/quiz/:id/start`
**Purpose**: Start quiz attempt for student
**Access**: Protected (Students)
**Process**:
1. Validates student eligibility
2. Checks timing constraints
3. Verifies no existing active submission
4. Creates new QuizSubmission record
5. Returns shuffled questions if enabled
**Response**: `{ submission: {...}, questions: [...] }`

#### POST `/api/quiz/:id/submit`
**Purpose**: Submit quiz answers
**Access**: Protected (Students)
**Body**: `{ answers: [{ questionId, selectedOption }] }`
**Process**:
1. Validates active submission exists
2. Checks submission timing
3. Evaluates answers against correct options
4. Calculates score with negative marking if enabled
5. Updates submission status to 'submitted'
**Response**: `{ message: "Quiz submitted", score, totalMarks }`

#### GET `/api/quiz/:id/submissions`
**Purpose**: Get quiz submissions for faculty review
**Access**: Protected (Faculty who created quiz, Admin)
**Query**: `{ page, limit, section, status }`
**Process**:
1. Validates faculty permissions
2. Fetches submissions with student details
3. Applies filters and pagination
4. Calculates statistics
**Response**: `{ submissions: [...], stats: {...}, total, page, limit }`

### **EVENT QUIZ ROUTES** (`/api/event-quiz`)

#### GET `/api/event-quiz`
**Purpose**: Get event quizzes accessible to current user
**Access**: Protected (Event Managers, Admin)
**Query**: `{ page, limit, status }`
**Process**:
1. Filters event quizzes based on user permissions
2. For event managers: shows quizzes they created
3. For admin: shows all event quizzes
4. Applies pagination and status filtering
**Response**: `{ eventQuizzes: [...], total, page, limit }`

#### POST `/api/event-quiz`
**Purpose**: Create new event quiz
**Access**: Protected (Event Managers, Admin)
**Body**: `{ title, description, duration, startTime, endTime, questions, participantType, participationMode, teamSize }`
**Process**:
1. Validates event manager permissions
2. Validates question format and structure
3. Sets up registration and participation settings
4. Creates event quiz with proper relationships
**Response**: `{ message: "Event quiz created", eventQuiz: {...} }`

#### GET `/api/event-quiz/:id`
**Purpose**: Get specific event quiz details
**Access**: Protected (Event Managers, Admin)
**Process**:
1. Fetches event quiz by ID
2. Checks user access permissions
3. Returns complete quiz details including registrations
**Response**: `{ eventQuiz: {...}, registrations: [...] }`

#### PUT `/api/event-quiz/:id`
**Purpose**: Update existing event quiz
**Access**: Protected (Event Manager who created it, Admin)
**Body**: `{ title, description, duration, questions, participantType, registrationEnabled }`
**Process**:
1. Validates ownership or admin permissions
2. Updates allowed fields based on quiz status
3. Maintains data integrity with existing registrations
**Response**: `{ message: "Event quiz updated", eventQuiz: {...} }`

#### POST `/api/event-quiz/:id/register`
**Purpose**: Register for event quiz
**Access**: Public or Protected (depends on participantType)
**Body**: `{ name, email, college, department, year, phoneNumber, isTeam, teamName, teamMembers }`
**Process**:
1. Validates registration is enabled
2. Checks participant eligibility
3. Validates team size if team registration
4. Creates registration record
5. Generates credentials for participants
6. Sends email notifications with login details
**Response**: `{ message: "Registration successful", registrationId }`

#### POST `/api/event-quiz/:id/login`
**Purpose**: Event quiz participant login
**Access**: Public
**Body**: `{ username, password }`
**Process**:
1. Validates credentials against QuizCredentials
2. Checks quiz timing and availability
3. Generates temporary session token
4. Updates login tracking information
**Response**: `{ token, participant: {...}, quiz: {...} }`

#### POST `/api/event-quiz/:id/start`
**Purpose**: Start event quiz attempt
**Access**: Protected (Event Quiz Participants)
**Process**:
1. Validates participant session
2. Checks timing constraints
3. Verifies no existing submission
4. Returns questions (shuffled if enabled)
**Response**: `{ questions: [...], duration, endTime }`

#### POST `/api/event-quiz/:id/submit`
**Purpose**: Submit event quiz answers
**Access**: Protected (Event Quiz Participants)
**Body**: `{ answers: [{ questionIndex, selectedOption }] }`
**Process**:
1. Validates active session exists
2. Checks submission timing
3. Evaluates answers against correct options
4. Calculates score with negative marking if enabled
5. Creates EventQuizResult record
6. Updates QuizCredentials with submission reference
**Response**: `{ message: "Quiz submitted", score, totalMarks }`

#### GET `/api/event-quiz/:id/results`
**Purpose**: Get event quiz results and leaderboard
**Access**: Protected (Event Manager who created it, Admin)
**Query**: `{ page, limit, sortBy }`
**Process**:
1. Validates permissions
2. Fetches all submissions with participant details
3. Calculates statistics and rankings
4. Applies sorting and pagination
**Response**: `{ results: [...], stats: {...}, total, page, limit }`

### **ADMIN ROUTES** (`/api/admin`)

#### GET `/api/admin/stats`
**Purpose**: Get system-wide statistics for admin dashboard
**Access**: Protected (Admin only)
**Process**:
1. Counts total users by role
2. Counts quizzes by type and status
3. Calculates submission statistics
4. Aggregates recent activity data
**Response**: `{ totalStudents, totalFaculty, totalEventManagers, totalUsers, totalQuizzes, activeQuizzes, totalSubmissions, averageScore }`

#### GET `/api/admin/accounts`
**Purpose**: Get all user accounts with filtering
**Access**: Protected (Admin only)
**Query**: `{ role, department, year, semester, section, page, limit, search }`
**Process**:
1. Builds query based on filter parameters
2. Applies text search on name/email if provided
3. Paginates results
4. Returns accounts with role-specific details
**Response**: `{ accounts: [...], total, page, limit }`

#### POST `/api/admin/accounts`
**Purpose**: Create new user account
**Access**: Protected (Admin only)
**Body**: `{ name, email, password, role, ...role-specific-fields }`
**Process**:
1. Validates required fields based on role
2. Checks email uniqueness
3. Hashes password and encrypts original
4. Creates user with appropriate role settings
5. Optionally sends welcome email
**Response**: `{ message: "Account created", user: {...} }`

#### POST `/api/admin/accounts/bulk`
**Purpose**: Bulk import accounts from Excel file
**Access**: Protected (Admin only)
**Body**: `FormData with Excel file`
**Process**:
1. Parses Excel file with XLSX library
2. Validates each row against required fields
3. Creates accounts in batch operation
4. Handles duplicates and validation errors
5. Returns success/failure counts
**Response**: `{ message: "Import completed", success, errors, details }`

#### PUT `/api/admin/accounts/:id`
**Purpose**: Update user account
**Access**: Protected (Admin only)
**Body**: `{ name, email, role, ...role-specific-fields }`
**Process**:
1. Validates admin permissions
2. Updates allowed fields based on role
3. Handles role changes with appropriate field validation
4. Maintains data integrity
**Response**: `{ message: "Account updated", user: {...} }`

#### DELETE `/api/admin/accounts/:id`
**Purpose**: Delete user account
**Access**: Protected (Admin only)
**Process**:
1. Validates admin permissions
2. Checks for dependencies (submissions, created quizzes)
3. Performs soft delete or hard delete based on policy
4. Updates related records
**Response**: `{ message: "Account deleted successfully" }`

#### POST `/api/admin/reset-password/:id`
**Purpose**: Reset user password
**Access**: Protected (Admin only)
**Body**: `{ newPassword }`
**Process**:
1. Validates admin permissions
2. Hashes new password
3. Updates user password
4. Encrypts and stores original password
5. Optionally sends password reset notification
**Response**: `{ message: "Password reset successfully" }`

### **ACADEMIC DETAILS ROUTES** (`/api/academic-details`)

#### GET `/api/academic-details`
**Purpose**: Get academic structure information
**Access**: Public
**Query**: `{ department, year, semester }`
**Process**:
1. Builds query based on filter parameters
2. Returns matching academic details
3. Sorts by department, year, semester
**Response**: `[ { department, year, semester, sections, subjects } ]`

#### GET `/api/academic-details/subjects`
**Purpose**: Get subjects for specific department, year, semester
**Access**: Public
**Query**: `{ department, year, semester }`
**Process**:
1. Finds academic detail matching query
2. Parses subjects string into structured array
3. Returns formatted subject objects with name and code
**Response**: `[ { name, code } ]`

#### GET `/api/academic-details/sections`
**Purpose**: Get sections for specific department, year, semester
**Access**: Public
**Query**: `{ department, year, semester }`
**Process**:
1. Finds academic detail matching query
2. Parses sections string into array
3. Returns formatted section list
**Response**: `[ "A", "B", "C" ]`

#### GET `/api/academic-details/faculty-structure`
**Purpose**: Get complete academic structure for faculty UI
**Access**: Public
**Process**:
1. Fetches all academic details
2. Organizes into hierarchical structure
3. Processes subjects and sections into structured format
**Response**: `{ "CSE": { years: { "1": { semesters: { "1": { sections, subjects } } } } } }`

#### GET `/api/academic-details/event-structure`
**Purpose**: Get simplified academic structure for event quizzes
**Access**: Public
**Process**:
1. Fetches all academic details
2. Extracts unique departments, years, semesters
3. Returns flat arrays for dropdown menus
**Response**: `{ departments: [...], years: [...], semesters: [...] }`

#### POST `/api/academic-details`
**Purpose**: Create or update academic details
**Access**: Protected (Admin only)
**Body**: `{ department, year, semester, sections, subjects, credits }`
**Process**:
1. Validates required fields and format
2. Creates or updates academic detail record
3. Handles section and subject formatting
**Response**: `{ message: "Academic details created/updated", academicDetail: {...} }`

#### POST `/api/academic-details/upload`
**Purpose**: Bulk import academic details from Excel
**Access**: Protected (Admin only)
**Body**: `FormData with Excel file`
**Process**:
1. Parses Excel file with XLSX library
2. Validates each row against required fields
3. Creates/updates academic details in batch
4. Returns success/failure counts
**Response**: `{ message: "Upload completed", success, errors, details }`

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### **JWT Authentication System**
- **Token Generation**: Created on successful login using `jsonwebtoken` library
- **Token Structure**: Contains user ID, role, and expiration time
- **Token Expiration**: 24 hours by default, configurable in environment variables
- **Token Storage**: Client-side in localStorage, sent in Authorization header
- **Token Verification**: Middleware validates token on protected routes

### **Role-Based Authorization**
- **Middleware Implementation**: `auth.js` and `authorize.js` middleware
- **Role Hierarchy**:
  - **Admin**: Full system access
  - **Faculty**: Department/subject-specific access
  - **Student**: Personal and assigned quiz access
  - **Event**: Event quiz management access
- **Permission Checks**: Both role-level and resource-level authorization

### **Security Measures**
- **Password Hashing**: bcrypt with 10 salt rounds
- **Original Password Storage**: AES-256-CBC encryption for admin recovery
- **Rate Limiting**: Express-rate-limit on auth endpoints
- **CORS Configuration**: Restricted to allowed origins
- **Input Validation**: Mongoose schema validation + express-validator

---

## 📁 FILE PROCESSING SYSTEM

### **Upload Management**
- **Storage**: Local file system in `uploads/` directory
- **File Types**: Excel (.xlsx), Word (.docx), Images (.jpg, .png)
- **Naming**: UUID-based unique filenames with timestamps
- **Size Limits**: Configurable per file type (default: 5MB)

### **Excel Processing**
- **Library**: XLSX for parsing Excel files
- **Use Cases**:
  - Bulk student/faculty import
  - Academic structure import
  - Quiz question import
- **Validation**: Row-by-row validation with detailed error reporting

### **Word Document Processing**
- **Library**: Mammoth.js for DOCX to HTML conversion
- **Use Cases**: Quiz question import with formatting preserved
- **Features**: Maintains text formatting, tables, and basic styling

### **Image Processing**
- **Library**: Sharp for image optimization
- **OCR Integration**: Tesseract.js for text extraction
- **Use Cases**:
  - Logo and background image processing
  - Question image extraction
  - Document scanning

---

## 🛠️ SERVICES & UTILITIES

### **Email Service** (`services/emailService.js`)
- **Provider**: Nodemailer with Gmail SMTP
- **Templates**: HTML email templates with dynamic content
- **Use Cases**:
  - Registration confirmations
  - Event quiz credentials
  - Academic quiz notifications
  - Password reset notifications (NEW)
  - Admin notifications
- **Queue System**: Basic retry mechanism for failed emails

#### **Academic Quiz Email Notifications**
- **Function**: `sendAcademicQuizNotification(quiz, eligibleStudents)`
- **Trigger**: Automatically sent when faculty creates an academic quiz
- **Recipients**: All students matching the quiz's allowedGroups criteria
- **Content**:
  - Quiz details (title, subject, duration, timing)
  - Student's academic details
  - Instructions for accessing the quiz
  - Professional HTML template with college branding
- **Process**:
  1. Find eligible students based on allowedGroups
  2. Send personalized emails asynchronously
  3. Log success/failure counts
  4. Don't block quiz creation if emails fail

#### **Forgot Password Email Notifications**
- **Function**: `sendForgotPasswordEmail(email, name, resetCode)`
- **Trigger**: When user requests password reset
- **Recipients**: User who requested password reset
- **Content**:
  - 6-digit verification code prominently displayed
  - Clear instructions for password reset process
  - Security warnings and expiry information
  - Professional HTML template with security styling
- **Process**:
  1. Generate professional email with reset code
  2. Include security instructions and warnings
  3. Send email with 10-minute expiry notice
  4. Log success/failure for monitoring
- **Error Handling**: Resilient to network timeouts and minor SMTP errors

---

## 🔧 RECENT ENHANCEMENTS & BUG FIXES

### **Enhanced Authentication System**

#### **Improved Login Error Handling**
- **Toast Notifications**: Replaced Alert components with react-toastify for better UX
- **Specific Error Messages**:
  - `404`: "No account found with this email address"
  - `401`: "Incorrect password. Please try again."
  - `400`: "Please provide both email and password"
  - `500`: "Server error. Please try again later."
- **Success Notifications**: Login success confirmation with toast
- **Response Format**: Standardized with `{ success: boolean, message: string, token?, user? }`

#### **Forgot Password System Debugging**
- **Enhanced Logging**: Detailed server-side logging for troubleshooting
- **Code Generation**: 6-digit random codes with proper expiry (10 minutes)
- **Database Verification**: Automatic verification of saved reset codes
- **Time Zone Handling**: Proper UTC time handling for expiry validation
- **Frontend Response Handling**: Dual response structure support for axios interceptors

#### **Frontend Response Handling Improvements**
- **Axios Interceptor Compatibility**: Handles both `response.data` and direct response structures
- **Enhanced Error Logging**: Detailed console logging for debugging
- **Consistent Pattern**: Unified response handling across all auth components
```javascript
// Enhanced response handling pattern
const success = response.success || response.data?.success;
const message = response.message || response.data?.message;
```

### **Quiz Creation Email Notifications**

#### **Automatic Student Notifications**
- **Trigger Points**: All quiz creation methods (manual, Excel, Word, Image upload)
- **Eligibility Matching**: Precise student filtering based on allowedGroups criteria
- **Asynchronous Processing**: Non-blocking email sending to prevent quiz creation delays
- **Error Resilience**: Quiz creation succeeds even if email notifications fail
- **Comprehensive Logging**: Detailed success/failure tracking for monitoring

#### **Email Content Enhancement**
- **Professional Templates**: HTML emails with college branding
- **Comprehensive Information**: Quiz details, timing, instructions, student academic info
- **Mobile Responsive**: Optimized for mobile email clients
- **Security Instructions**: Clear guidelines for quiz access and completion

### **Database Schema Enhancements**

#### **User Model Updates**
```javascript
// Added password reset fields
resetPasswordCode: {
  type: String  // 6-digit verification code
},
resetPasswordExpiry: {
  type: Date   // 10-minute expiry from generation
}
```

#### **Enhanced Validation & Logging**
- **Pre-save Hooks**: Automatic password hashing and validation
- **Detailed Error Logging**: Comprehensive validation error reporting
- **Database Verification**: Automatic verification of saved data
- **Index Optimization**: Performance indexes for reset code queries

### **API Response Standardization**

#### **Consistent Response Format**
```javascript
// Standard success response
{
  success: true,
  message: "Operation completed successfully",
  data?: any,
  token?: string,
  user?: object
}

// Standard error response
{
  success: false,
  message: "Specific error description",
  error?: string
}
```

#### **Enhanced Error Handling**
- **Specific HTTP Status Codes**: Proper status codes for different error types
- **Detailed Error Messages**: User-friendly error descriptions
- **Server-side Logging**: Comprehensive error logging for debugging
- **Response Header Checking**: Prevents duplicate response sending

### **Frontend Improvements**

#### **Toast Notification System**
- **react-toastify Integration**: Professional toast notifications
- **Error Type Mapping**: Specific toasts for different error types
- **Success Confirmations**: Positive feedback for successful operations
- **Auto-dismiss**: Automatic toast dismissal with appropriate timing

#### **Enhanced User Experience**
- **Loading States**: Clear loading indicators during async operations
- **Form Validation**: Client-side validation with immediate feedback
- **Navigation Flow**: Smooth transitions between authentication steps
- **Responsive Design**: Mobile-optimized interface components

#### **Debugging & Development Tools**
- **Console Logging**: Detailed logging for development and debugging
- **Response Structure Logging**: Visibility into API response formats
- **Error Details**: Comprehensive error information for troubleshooting
- **Test Endpoints**: Development endpoints for testing email functionality

### **Security Enhancements**

#### **Password Reset Security**
- **Time-limited Codes**: 10-minute expiry for reset codes
- **Single-use Codes**: Codes cleared after successful password reset
- **Email Verification**: Reset codes sent only to verified email addresses
- **Secure Code Generation**: Cryptographically secure random code generation

#### **Email Security**
- **SMTP Authentication**: Secure email sending with app passwords
- **Rate Limiting**: Protection against email spam and abuse
- **Error Masking**: Generic error messages to prevent information disclosure
- **Audit Logging**: Comprehensive logging for security monitoring

### **Performance Optimizations**

#### **Asynchronous Processing**
- **Non-blocking Email**: Email sending doesn't block main operations
- **Promise Handling**: Proper async/await patterns throughout
- **Error Isolation**: Email failures don't affect core functionality
- **Resource Management**: Efficient database connection handling

#### **Database Optimization**
- **Targeted Queries**: Efficient student eligibility queries
- **Index Usage**: Optimized database indexes for performance
- **Connection Pooling**: Efficient database connection management
- **Query Logging**: Performance monitoring and optimization

#### **Smart Loading & Caching System**
- **Session-based Caching**: Prevents unnecessary re-loading on navigation
- **Cache Expiry**: 5-minute expiry for landing page data
- **Intelligent Loading**: Shows animations only when data needs to be fetched
- **Cache Utilities**: Reusable caching functions for other components
- **Development Tools**: Keyboard shortcuts and cache status logging
- **Performance Benefits**: Faster subsequent page loads and better UX

---

## 🔧 TROUBLESHOOTING GUIDE

### **Common Issues & Solutions**

#### **Forgot Password Issues**

**Problem**: "Invalid or expired reset code" error even with valid code
**Root Cause**: Frontend response handling incompatibility with axios interceptors
**Solution**: Enhanced response handling pattern
```javascript
// Fixed pattern that works with all response structures
const success = response.success || response.data?.success;
const message = response.message || response.data?.message;
```

**Problem**: Email sent successfully but frontend shows "Failed to send reset code"
**Root Cause**: Email service throwing minor errors after successful send
**Solution**: Enhanced error handling in email service and auth routes
```javascript
// Return success even for minor network errors
if (error.code === 'ECONNRESET' || error.message.includes('timeout')) {
  return true; // Email likely sent despite network issue
}
```

#### **Email Notification Issues**

**Problem**: Quiz created but no email notifications sent
**Root Cause**: Missing or incorrect email configuration
**Solution**: Verify environment variables and Gmail app password setup
```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password
```

**Problem**: Email notifications blocking quiz creation
**Root Cause**: Synchronous email processing causing timeouts
**Solution**: Asynchronous email processing with error isolation
```javascript
// Send emails asynchronously without blocking quiz creation
sendAcademicQuizNotification(quiz, eligibleStudents)
  .then(result => console.log('Email success:', result))
  .catch(error => console.error('Email error:', error));
```

#### **Authentication Issues**

**Problem**: Login successful but frontend shows error
**Root Cause**: Inconsistent response format handling
**Solution**: Standardized response format with dual structure support
```javascript
// Backend: Always include success flag
res.json({
  success: true,
  message: 'Login successful',
  token,
  user
});

// Frontend: Handle both response structures
const success = response.success || response.data?.success;
```

#### **Database Issues**

**Problem**: Reset codes not persisting in database
**Root Cause**: Schema fields not properly defined or saved
**Solution**: Verify User model schema and save operations
```javascript
// Ensure fields are properly defined in schema
resetPasswordCode: { type: String },
resetPasswordExpiry: { type: Date }

// Verify save operation
await user.save();
console.log('Saved data:', await User.findOne({ email: user.email }));
```

### **Development Best Practices**

#### **Error Handling**
- Always use try-catch blocks for async operations
- Provide specific error messages for different failure types
- Log detailed error information for debugging
- Don't expose sensitive information in error messages

#### **Response Handling**
- Use consistent response format across all endpoints
- Include success flags in all API responses
- Handle both nested and direct response structures in frontend
- Provide meaningful success and error messages

#### **Email Configuration**
- Use environment variables for email credentials
- Implement proper error handling for email failures
- Use Gmail app passwords instead of regular passwords
- Test email functionality with dedicated test endpoints

#### **Database Operations**
- Always verify data persistence after save operations
- Use proper indexes for performance optimization
- Implement comprehensive logging for database operations
- Handle validation errors gracefully

#### **Security Considerations**
- Use time-limited codes for password reset
- Clear sensitive data after use
- Implement proper rate limiting
- Log security-related events for monitoring

### **Monitoring & Maintenance**

#### **Logging Strategy**
- Use structured logging with consistent format
- Include request IDs for tracing
- Log both success and failure cases
- Implement log rotation and retention policies

#### **Performance Monitoring**
- Monitor email sending success rates
- Track API response times
- Monitor database query performance
- Set up alerts for critical failures

#### **Regular Maintenance**
- Clean up expired reset codes periodically
- Monitor email service quotas and limits
- Review and update error handling patterns
- Update dependencies and security patches

### **Encryption Utility** (`utils/encryption.js`)
- **Algorithm**: AES-256-CBC for sensitive data
- **Key Management**: Environment variable-based key storage
- **Use Cases**:
  - Original password storage
  - Sensitive participant data

### **Excel Utility** (`utils/excelUtils.js`)
- **Features**: Excel generation and parsing
- **Use Cases**:
  - Data export (results, registrations)
  - Bulk import templates
  - Report generation

### **Validation Utility** (`utils/validation.js`)
- **Features**: Common validation functions
- **Use Cases**:
  - Email format validation
  - Password strength checking
  - Academic ID format validation
