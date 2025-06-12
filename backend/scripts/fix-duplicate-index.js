const mongoose = require('mongoose');
require('dotenv').config();

async function fixDuplicateIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('eventquizresults');

    // Get current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop the problematic unique index on quiz + student
    try {
      await collection.dropIndex({ quiz: 1, student: 1 });
      console.log('Dropped problematic quiz_1_student_1 index');
    } catch (error) {
      console.log('Index quiz_1_student_1 not found or already dropped:', error.message);
    }

    // Remove any duplicate entries with null student
    const duplicates = await collection.aggregate([
      {
        $match: { student: null }
      },
      {
        $group: {
          _id: { quiz: '$quiz', email: '$participantInfo.email' },
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    console.log(`Found ${duplicates.length} duplicate groups`);

    // Remove duplicates, keeping only the first one
    for (const duplicate of duplicates) {
      const docsToRemove = duplicate.docs.slice(1); // Keep first, remove rest
      if (docsToRemove.length > 0) {
        await collection.deleteMany({ _id: { $in: docsToRemove } });
        console.log(`Removed ${docsToRemove.length} duplicate entries for quiz ${duplicate._id.quiz}`);
      }
    }

    // Create new proper indexes
    try {
      // Index for email-based submissions (public)
      await collection.createIndex(
        { quiz: 1, 'participantInfo.email': 1 },
        { 
          unique: true, 
          sparse: true,
          partialFilterExpression: { 
            'participantInfo.email': { $exists: true, $ne: null } 
          },
          name: 'quiz_email_unique'
        }
      );
      console.log('Created quiz_email_unique index');

      // Index for authenticated submissions
      await collection.createIndex(
        { quiz: 1, student: 1 },
        { 
          unique: true, 
          sparse: true,
          partialFilterExpression: { 
            student: { $exists: true, $ne: null } 
          },
          name: 'quiz_student_unique'
        }
      );
      console.log('Created quiz_student_unique index');

      // Performance indexes
      await collection.createIndex({ quiz: 1, score: -1 }, { name: 'quiz_score' });
      await collection.createIndex({ 'participantInfo.email': 1, submittedAt: -1 }, { name: 'email_submitted' });
      
      console.log('Created performance indexes');
    } catch (indexError) {
      console.log('Some indexes may already exist:', indexError.message);
    }

    console.log('Index fix completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing indexes:', error);
    process.exit(1);
  }
}

fixDuplicateIndex();
