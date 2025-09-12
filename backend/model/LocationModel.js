const mongoose = require("mongoose");

// Activity Log Schema for tracking crowd updates
const activityLogSchema = new mongoose.Schema({
  crowdLevel: {
    type: String,
    enum: ['min', 'moderate', 'max'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 60 * 3 // ⏳ 1 hour (in seconds)
  },
  organizerId: {
    type: String,
    default: 'organizer' // You can replace this with actual organizer ID if you have user authentication
  }
}, { _id: false }); // _id: false to avoid creating separate IDs for subdocuments

// Location Schema
const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required'],
    unique: true,
    trim: true,
  },
  capacity: {
    type: Number,
    required: [true, 'Capacity is required'],
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maxCrowdScore: {
    type: Number, // Score of Maximum crowded
    default: 0,
    min: [0, 'Score cannot be negative']
  },
  moderateCrowdScore: {
    type: Number, // Score of moderate crowded
    default: 0,
    min: [0, 'Score cannot be negative']
  },
  minCrowdScore: {
    type: Number, // Score of minimum crowded
    default: 0,
    min: [0, 'Score cannot be negative']
  },
  // New field for activity tracking
  activityLog: {
    type: [activityLogSchema],
    default: []
  },
  // Track the last update time
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Method to add activity and clean old entries (older than 1 hour)
locationSchema.methods.addActivity = function(crowdLevel) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  
  // Add new activity
  this.activityLog.push({
    crowdLevel: crowdLevel,
    timestamp: new Date()
  });
  
  // Remove activities older than 1 hour
  this.activityLog = this.activityLog.filter(activity => 
    activity.timestamp > oneHourAgo
  );
  
  // Update last updated time
  this.lastUpdated = new Date();
  
  return this.save();
};

// Method to get recent activities (last hour only)
locationSchema.methods.getRecentActivities = function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  return this.activityLog
    .filter(activity => activity.timestamp > oneHourAgo)
    .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
};

module.exports = mongoose.model("Location", locationSchema);