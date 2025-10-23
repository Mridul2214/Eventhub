const express = require('express');
const router = express.Router();
const https = require('https');
const { URL } = require('url');
const multer = require('multer');
const path = require('path');
const {
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
  notifyEvent,
  approveEvent,
  setEventVisibility,
  adminGetEvents,
  getEventComments,
  addEventComment
} = require('../controllers/eventController');

const { protect, authorize } = require('../middleware/authMiddleware');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Admin routes
router.get('/admin/all', protect, authorize('admin'), adminGetEvents);
router.post('/:id/approve', protect, authorize('admin'), approveEvent);
router.patch('/:id/visibility', protect, authorize('admin'), setEventVisibility);

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Public routes
router.get('/', getEvents);

// Server-side geocoding proxy to avoid browser CORS issues
router.get('/geocode', (req, res) => {
  try {
    const q = (req.query.q || '').toString();
    if (!q) {
      return res.status(400).json({ success: false, message: 'Missing q parameter' });
    }
    const nomiUrl = new URL('https://nominatim.openstreetmap.org/search');
    nomiUrl.searchParams.set('format', 'json');
    nomiUrl.searchParams.set('q', q);

    const options = {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SmartCityApp/1.0 (contact@example.com)'
      }
    };

    https.get(nomiUrl, options, (r) => {
      let data = '';
      r.on('data', chunk => (data += chunk));
      r.on('end', () => {
        try {
          const json = JSON.parse(data);
          res.status(200).json(json);
        } catch (e) {
          res.status(502).json({ success: false, message: 'Bad response from geocoder' });
        }
      });
    }).on('error', (err) => {
      res.status(502).json({ success: false, message: 'Geocoding request failed' });
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Internal error' });
  }
});

router.get('/:id', getEvent);

// Notification route (email event details)
router.post('/:id/notify', protect, notifyEvent);

// Comments routes
router.get('/:id/comments', getEventComments);
router.post('/:id/comments', protect, addEventComment);

// Protected routes (require authentication)
router.post('/', protect, createEvent);
router.put('/:id', protect, updateEvent);
router.delete('/:id', protect, deleteEvent);

// Event registration routes
router.post('/:id/register', protect, registerForEvent);
router.delete('/:id/register', protect, unregisterFromEvent);

// Rating route
router.post('/:id/rate', protect, rateEvent);

// User-specific routes
router.get('/user/my-events', protect, getMyEvents);
router.get('/user/my-registrations', protect, getMyRegistrations);

// Image upload route
router.post('/upload-image', protect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Return the image URL
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl,
        filename: req.file.filename
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
