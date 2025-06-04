const quizRoutes = require('./routes/quiz');
const eventQuizRoutes = require('./routes/event-quizzes');
const authRoutes = require('./routes/auth');
const adminQuizRoutes = require('./routes/admin/quizzes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/event-quizzes', eventQuizRoutes);
app.use('/api/admin/quizzes', adminQuizRoutes); 