const mongoose = require('mongoose');
require('dotenv').config();

async function fixCredentialsIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('quizcredentials');

    // Get current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop the problematic global unique index on username
    try {
      await collection.dropIndex({ username: 1 });
      console.log('Dropped global username_1 unique index');
    } catch (error) {
      console.log('Global username index not found or already dropped:', error.message);
    }

    // Drop any existing username_1 index
    try {
      await collection.dropIndex('username_1');
      console.log('Dropped username_1 index by name');
    } catch (error) {
      console.log('username_1 index not found:', error.message);
    }

    // Create new compound unique index on quiz + username
    try {
      await collection.createIndex(
        { quiz: 1, username: 1 },
        { 
          unique: true,
          name: 'quiz_username_unique'
        }
      );
      console.log('Created compound unique index: quiz_username_unique');
    } catch (indexError) {
      console.log('Compound index may already exist:', indexError.message);
    }

    // Verify the new indexes
    const newIndexes = await collection.indexes();
    console.log('Updated indexes:', newIndexes.map(idx => ({ name: idx.name, key: idx.key, unique: idx.unique })));

    console.log('Credentials index fix completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing credentials indexes:', error);
    process.exit(1);
  }
}

fixCredentialsIndex();
