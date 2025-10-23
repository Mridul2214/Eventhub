const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    enum: ['Technology', 'Music', 'Food & Drink', 'Business', 'Arts', 'Sports', 'Health & Wellness', 'Education', 'Networking', 'Charity', 'Other']
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  time: {
    type: String,
    required: [true, 'Event time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  endTime: {
    type: String,
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  location: {
    type: String,
    required: [true, 'Event location is required'],
    trim: true
  },
  locationType: {
    type: String,
    enum: ['in-person', 'online', 'hybrid'],
    required: [true, 'Location type is required']
  },
  virtualLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        if (this.locationType === 'online' || this.locationType === 'hybrid') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Virtual link is required for online or hybrid events'
    }
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  maxAttendees: {
    type: Number,
    min: [1, 'Maximum attendees must be at least 1']
  },
  currentAttendees: {
    type: Number,
    default: 0
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event organizer is required']
  },
  images: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  requiresApproval: {
    type: Boolean,
    default: true
  },
  attendees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'cancelled'],
      default: 'registered'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    review: {
      type: String,
      maxlength: [500, 'Review cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  contactPhone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  socialLinks: {
    facebook: String,
    twitter: String,
    instagram: String,
    linkedin: String
  },
  agenda: [{
    time: String,
    activity: String,
    description: String
  }],
  requirements: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for formatted date
eventSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (!this.maxAttendees) return null;
  return Math.max(0, this.maxAttendees - this.currentAttendees);
});

// Index for better query performance
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ locationType: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ title: 'text', description: 'text' }); // Text search

// Pre-save middleware to update average rating
eventSchema.pre('save', function(next) {
  if (this.ratings && this.ratings.length > 0) {
    const totalRating = this.ratings.reduce((sum, rating) => sum + rating.rating, 0);
    this.averageRating = totalRating / this.ratings.length;
    this.totalRatings = this.ratings.length;
  } else {
    this.averageRating = 0;
    this.totalRatings = 0;
  }
  next();
});

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function(limit = 10) {
  return this.find({
    date: { $gte: new Date() },
    status: 'published',
    isActive: true
  })
  .populate('organizer', 'firstName lastName profileImage')
  .sort({ date: 1 })
  .limit(limit);
};

// Static method to find events by category
eventSchema.statics.findByCategory = function(category, limit = 10) {
  return this.find({
    category,
    date: { $gte: new Date() },
    status: 'published',
    isActive: true
  })
  .populate('organizer', 'firstName lastName profileImage')
  .sort({ date: 1 })
  .limit(limit);
};

// Instance method to check if event is full
eventSchema.methods.isFull = function() {
  return this.maxAttendees && this.currentAttendees >= this.maxAttendees;
};

// Instance method to add attendee
eventSchema.methods.addAttendee = function(userId) {
  if (this.isFull()) {
    throw new Error('Event is full');
  }

  const existingAttendee = this.attendees.find(attendee =>
    attendee.user.toString() === userId.toString()
  );

  if (existingAttendee) {
    throw new Error('User is already registered for this event');
  }

  this.attendees.push({ user: userId });
  this.currentAttendees += 1;
  return this.save();
};

// Instance method to remove attendee
eventSchema.methods.removeAttendee = function(userId) {
  const attendeeIndex = this.attendees.findIndex(attendee =>
    attendee.user.toString() === userId.toString()
  );

  if (attendeeIndex === -1) {
    throw new Error('User is not registered for this event');
  }

  this.attendees.splice(attendeeIndex, 1);
  this.currentAttendees = Math.max(0, this.currentAttendees - 1);
  return this.save();
};

module.exports = mongoose.model('Event', eventSchema);
