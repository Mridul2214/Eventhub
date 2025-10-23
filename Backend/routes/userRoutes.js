const express = require('express');
const {
  register,
  login,
  getMe,
  getProfile,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  blockUser,
  unblockUser
} = require('../controllers/userController');

const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgotPassword', forgotPassword);
router.put('/resetPassword/:resetToken', resetPassword);
router.post('/verifyEmail/:verificationToken', verifyEmail);

// Protected routes
router.use(protect); // All routes below require authentication

router.get('/me', getMe);
router.get('/profile', getProfile);
router.put('/updateDetails', updateDetails);
router.put('/updatePassword', updatePassword);

// Admin only routes
router.use(authorize('admin')); // All routes below require admin role

router.route('/')
  .get(getUsers);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

// Admin user moderation
router.patch('/:id/block', blockUser);
router.patch('/:id/unblock', unblockUser);

module.exports = router;
