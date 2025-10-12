const express = require('express');
const router = express.Router();
const slidesController = require('../controllers/slidesController');
const { slideUpload } = require('../config/cloudinaryConfig'); // ✅ Use slideUpload from cloudinary config

// Health check
router.get('/health', slidesController.healthCheck);

// Get only active slides (for public website) - MUST be before /:id route
router.get('/slides/public/active', slidesController.getActiveSlides);

// Get all slides (with optional filtering)
router.get('/slides', slidesController.getAllSlides);

// Get single slide by ID - MUST be after specific routes
router.get('/slides/:id', slidesController.getSlideById);

// Create new slide - ✅ Changed to slideUpload
router.post('/slides', slideUpload.single('backgroundImage'), slidesController.createSlide);

// Update existing slide - ✅ Changed to slideUpload
router.put('/slides/:id', slideUpload.single('backgroundImage'), slidesController.updateSlide);

// Toggle slide active status
router.patch('/slides/:id/toggle', slidesController.toggleSlideStatus);

// Delete single slide
router.delete('/slides/:id', slidesController.deleteSlide);

// Delete all slides (requires confirmation)
router.delete('/slides', slidesController.deleteAllSlides);

module.exports = router;