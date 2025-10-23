const Event = require('../models/eventModel');
const User = require('../models/userModel');
const Comment = require('../models/commentModel');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const notifyEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const recipient = (req.body && req.body.email) || (req.user && req.user.email);
    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Missing recipient email' });
    }
    const countdown = (req.body && req.body.countdown) || '';
    const link = (req.body && req.body.link) || '';
    const subject = `Event Reminder: ${req.body.title || event.title}`;
    const eventDateObj = req.body.date ? new Date(req.body.date) : (event.date ? new Date(event.date) : null);
    const whenDate = eventDateObj && !isNaN(eventDateObj.getTime())
      ? eventDateObj.toISOString().slice(0, 10)
      : '';
    const whenTime = (req.body.time || event.time || '').toString();
    const when = `${whenDate} ${whenTime}`.trim();
    const location = req.body.location || event.location || '';
    const text = [
      `Title: ${req.body.title || event.title}`,
      `When: ${when}`,
      `Location: ${location}`,
      countdown ? `Countdown: ${countdown}` : null,
      link ? `Link: ${link}` : null
    ].filter(Boolean).join('\n');
    const html = [
      `<h2 style="margin:0 0 10px">${req.body.title || event.title}</h2>`,
      when ? `<p><strong>When:</strong> ${when}</p>` : '',
      location ? `<p><strong>Location:</strong> ${location}</p>` : '',
      countdown ? `<p><strong>Countdown:</strong> ${countdown}</p>` : '',
      link ? `<p><a href="${link}">View Event</a></p>` : ''
    ].join('');

    // Build transporter: prefer real SMTP, else fallback to Ethereal for testing
    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
    }

    const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';
    const info = await transporter.sendMail({ from, to: recipient, subject, text, html });
    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : undefined;
    res.status(200).json({ success: true, message: 'Notification email sent', previewUrl });
  } catch (error) {
    console.error('Notify event error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to send notification' });
  }
};

// @desc    Get comments for an event
// @route   GET /api/events/:id/comments
// @access  Public
const getEventComments = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }
    const comments = await Comment.find({ event: id })
      .populate('user', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: comments });
  } catch (error) {
    console.error('Get event comments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch comments' });
  }
};

// @desc    Add a comment to an event
// @route   POST /api/events/:id/comments
// @access  Private
const addEventComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, rating } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    const payload = { event: id, user: req.user._id, text: text.trim() };
    if (rating && rating >= 1 && rating <= 5) payload.rating = rating;
    const comment = await Comment.create(payload);
    await comment.populate('user', 'firstName lastName profileImage');
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    console.error('Add event comment error:', error);
    res.status(500).json({ success: false, message: 'Failed to add comment' });
  }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Organizers only)
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      date,
      time,
      endTime,
      location,
      locationType,
      virtualLink,
      price,
      currency,
      maxAttendees,
      images,
      tags,
      isPublic,
      requiresApproval,
      contactEmail,
      contactPhone,
      website,
      socialLinks,
      agenda,
      requirements
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !date || !time || !location || !locationType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Validate date is not in the past
    const eventDate = new Date(date);
    if (eventDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Event date cannot be in the past'
      });
    }

    // Validate virtual link for online/hybrid events
    if ((locationType === 'online' || locationType === 'hybrid') && !virtualLink) {
      return res.status(400).json({
        success: false,
        message: 'Virtual link is required for online or hybrid events'
      });
    }

    // Create event
    const event = await Event.create({
      title,
      description,
      category,
      date: eventDate,
      time,
      endTime,
      location,
      locationType,
      virtualLink,
      price: parseFloat(price),
      currency: currency || 'USD',
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : undefined,
      organizer: req.user._id,
      images: images || [],
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      isPublic: isPublic !== undefined ? isPublic : true,
      // Force moderation workflow
      status: 'draft',
      requiresApproval: true,
      contactEmail: contactEmail || req.user.email,
      contactPhone,
      website,
      socialLinks,
      agenda,
      requirements
    });

    // Add event to user's created events
    await User.findByIdAndUpdate(req.user._id, {
      $push: { createdEvents: event._id }
    });

    // Populate organizer details
    await event.populate('organizer', 'firstName lastName profileImage email');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Approve (publish) an event
// @route   POST /api/events/:id/approve
// @access  Private/Admin
const approveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    event.status = 'published';
    event.requiresApproval = false;
    await event.save();
    res.status(200).json({ success: true, message: 'Event approved', data: event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve event' });
  }
};

// @desc    Set event visibility (isActive)
// @route   PATCH /api/events/:id/visibility
// @access  Private/Admin
const setEventVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID' });
    }
    const updated = await Event.findByIdAndUpdate(id, { isActive: !!isActive }, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Event not found' });
    res.status(200).json({ success: true, message: 'Visibility updated', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update visibility' });
  }
};

// @desc    Get all events (admin)
// @route   GET /api/events/admin
// @access  Private/Admin
const adminGetEvents = async (req, res) => {
  try {
    const events = await Event.find({}).populate('organizer', 'firstName lastName email');
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
};

// @desc    Get all events with filtering and pagination
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      locationType,
      priceRange,
      dateRange,
      search,
      sortBy = 'date',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    let filter = { status: 'published', isActive: true };

    // Category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Location type filter
    if (locationType && locationType !== 'all') {
      filter.locationType = locationType;
    }

    // Price range filter
    if (priceRange) {
      switch (priceRange) {
        case 'free':
          filter.price = 0;
          break;
        case 'under50':
          filter.price = { $gt: 0, $lt: 50 };
          break;
        case '50-100':
          filter.price = { $gte: 50, $lte: 100 };
          break;
        case '100-200':
          filter.price = { $gte: 100, $lte: 200 };
          break;
        case 'over200':
          filter.price = { $gt: 200 };
          break;
      }
    }

    // Date range filter
    if (dateRange) {
      const today = new Date();
      switch (dateRange) {
        case 'today':
          filter.date = {
            $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
          };
          break;
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          filter.date = {
            $gte: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()),
            $lt: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1)
          };
          break;
        case 'week':
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          filter.date = { $gte: today, $lte: nextWeek };
          break;
        case 'month':
          const nextMonth = new Date(today);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          filter.date = { $gte: today, $lte: nextMonth };
          break;
        case 'upcoming':
          filter.date = { $gte: today };
          break;
      }
    }

    // Search filter
    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'date':
        sort.date = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'price':
        sort.price = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'popularity':
        sort.currentAttendees = sortOrder === 'desc' ? -1 : 1;
        break;
      case 'rating':
        sort.averageRating = sortOrder === 'desc' ? -1 : 1;
        break;
      default:
        sort.createdAt = -1;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const events = await Event.find(filter)
      .populate('organizer', 'firstName lastName profileImage')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalEvents = await Event.countDocuments(filter);
    const totalPages = Math.ceil(totalEvents / parseInt(limit));

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalEvents,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
const getEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await Event.findById(id)
      .populate('organizer', 'firstName lastName profileImage email')
      .populate('attendees.user', 'firstName lastName profileImage');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Increment view count
    await Event.findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.status(200).json({
      success: true,
      data: event
    });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private (Organizer or Admin only)
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer or admin
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this event'
      });
    }

    // If event is already approved/published, only admins can edit
    if (event.status === 'published' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Approved events cannot be edited. Contact admin for changes or delete and recreate.'
      });
    }

    const updateData = { ...req.body };

    // Handle tags array
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(tag => tag.trim());
    }

    // Validate date is not in the past for published events
    if (updateData.date && event.status === 'published') {
      const eventDate = new Date(updateData.date);
      if (eventDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Event date cannot be in the past'
        });
      }
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    }).populate('organizer', 'firstName lastName profileImage email');

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private (Organizer or Admin only)
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check if user is the organizer or admin
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this event'
      });
    }

    // Remove event from user's created events
    await User.findByIdAndUpdate(event.organizer, {
      $pull: { createdEvents: event._id }
    });

    // Remove event from all attendees' attended events
    await User.updateMany(
      { attendedEvents: event._id },
      { $pull: { attendedEvents: event._id } }
    );

    await Event.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Register for an event
// @route   POST /api/events/:id/register
// @access  Private
const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (event.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Event is not available for registration'
      });
    }

    // Check if event is full
    if (event.isFull()) {
      return res.status(400).json({
        success: false,
        message: 'Event is full'
      });
    }

    // Check if user is already registered
    const existingAttendee = event.attendees.find(attendee =>
      attendee.user.toString() === req.user._id.toString()
    );

    if (existingAttendee) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    // Add attendee
    await event.addAttendee(req.user._id);

    // Add event to user's attended events
    await User.findByIdAndUpdate(req.user._id, {
      $push: { attendedEvents: event._id }
    });

    res.status(200).json({
      success: true,
      message: 'Successfully registered for the event'
    });

  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register for event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Unregister from an event
// @route   DELETE /api/events/:id/register
// @access  Private
const unregisterFromEvent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Remove attendee
    await event.removeAttendee(req.user._id);

    // Remove event from user's attended events
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { attendedEvents: event._id }
    });

    res.status(200).json({
      success: true,
      message: 'Successfully unregistered from the event'
    });

  } catch (error) {
    console.error('Unregister from event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister from event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's created events
// @route   GET /api/events/my-events
// @access  Private
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id })
      .populate('organizer', 'firstName lastName profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Get my events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user's registered events
// @route   GET /api/events/my-registrations
// @access  Private
const getMyRegistrations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'attendedEvents',
      populate: {
        path: 'organizer',
        select: 'firstName lastName profileImage'
      }
    });

    res.status(200).json({
      success: true,
      data: user.attendedEvents
    });

  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your registrations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Add rating and review to event
// @route   POST /api/events/:id/rate
// @access  Private
const rateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const event = await Event.findById(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Allow any authenticated user to rate (relaxed rule)

    // Check if user already rated
    const existingRating = event.ratings.find(r =>
      r.user.toString() === req.user._id.toString()
    );

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      existingRating.review = review;
      existingRating.createdAt = new Date();
    } else {
      // Add new rating
      event.ratings.push({
        user: req.user._id,
        rating,
        review
      });
    }

    await event.save();

    res.status(200).json({
      success: true,
      message: 'Rating submitted successfully'
    });

  } catch (error) {
    console.error('Rate event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit rating',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  notifyEvent,
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getMyEvents,
  getMyRegistrations,
  rateEvent,
  approveEvent,
  setEventVisibility,
  adminGetEvents,
  getEventComments,
  addEventComment
};
