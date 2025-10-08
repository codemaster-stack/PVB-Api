require('dotenv').config(); // Load environment variables
const User = require('../models/User');
const mongoose = require('mongoose');

async function migrateDeactivationData() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log('📦 Connected to database');
    
    // Clear old string-based deactivation data
    const result = await User.updateMany(
      { 
        deactivatedBy: { $type: "string" } 
      },
      { 
        $set: { 
          deactivatedBy: null,
          deactivatedByRole: null,
          deactivatedAt: null 
        }
      }
    );
    
    console.log(`✅ Migration complete! Updated ${result.modifiedCount} users`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDeactivationData();