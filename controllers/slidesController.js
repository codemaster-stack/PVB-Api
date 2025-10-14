// const fs = require('fs');
// const path = require('path');
// const { cloudinary } = require('../config/cloudinaryConfig'); // Use your existing config

// // Database file path
// const DATA_FILE = path.join(__dirname, '../slides-data.json');

// // Database object
// let database = {
//     slides: [],
//     nextId: 1
// };

// // Load database
// function loadDatabase() {
//     try {
//         if (fs.existsSync(DATA_FILE)) {
//             const data = fs.readFileSync(DATA_FILE, 'utf8');
//             database = JSON.parse(data);
//         } else {
//             saveDatabase();
//         }
//     } catch (error) {
//         console.error('Error loading database:', error);
//     }
// }

// // Save database
// function saveDatabase() {
//     try {
//         fs.writeFileSync(DATA_FILE, JSON.stringify(database, null, 2), 'utf8');
//     } catch (error) {
//         console.error('Error saving database:', error);
//     }
// }

// // Delete image from Cloudinary
// async function deleteCloudinaryImage(imageUrl) {
//     try {
//         if (!imageUrl) return false;
        
//         // Extract public_id from Cloudinary URL
//         // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/marketing_slides/slide_12345.jpg
//         const matches = imageUrl.match(/\/marketing_slides\/([^\/]+)\./);
//         if (matches && matches[1]) {
//             const publicId = `marketing_slides/${matches[1]}`;
//             const result = await cloudinary.uploader.destroy(publicId);
//             console.log(`Deleted image from Cloudinary: ${publicId}`, result);
//             return result.result === 'ok';
//         }
//         return false;
//     } catch (error) {
//         console.error('Error deleting image from Cloudinary:', error);
//         return false;
//     }
// }

// // Initialize database
// loadDatabase();


// exports.healthCheck = async (req, res) => {
//     try {
//         res.json({
//             status: 'ok',
//             timestamp: new Date().toISOString(),
//             totalSlides: database.slides.length,
//             activeSlides: database.slides.filter(s => s.isActive).length
//         });
//     } catch (error) {
//         res.status(500).json({ error: 'Health check failed' });
//     }
// };

// // Get all slides
// exports.getAllSlides = async (req, res) => {
//     try {
//         let slides = [...database.slides];
        
//         // Filter by active status if requested
//         if (req.query.active === 'true') {
//             slides = slides.filter(s => s.isActive);
//         }
        
//         // Sort by sortOrder
//         slides.sort((a, b) => a.sortOrder - b.sortOrder);
        
//         res.json(slides);
//     } catch (error) {
//         console.error('Error fetching slides:', error);
//         res.status(500).json({ error: 'Failed to fetch slides' });
//     }
// };

// // Get single slide by ID
// exports.getSlideById = async (req, res) => {
//     try {
//         const slideId = parseInt(req.params.id);
//         const slide = database.slides.find(s => s.id === slideId);
        
//         if (!slide) {
//             return res.status(404).json({ error: 'Slide not found' });
//         }
        
//         res.json(slide);
//     } catch (error) {
//         console.error('Error fetching slide:', error);
//         res.status(500).json({ error: 'Failed to fetch slide' });
//     }
// };

// // Get active slides only
// exports.getActiveSlides = async (req, res) => {
//     try {
//         const activeSlides = database.slides
//             .filter(s => s.isActive)
//             .sort((a, b) => a.sortOrder - b.sortOrder);
        
//         res.json(activeSlides);
//     } catch (error) {
//         console.error('Error fetching active slides:', error);
//         res.status(500).json({ error: 'Failed to fetch active slides' });
//     }
// };

// // Create new slide
// exports.createSlide = async (req, res) => {
//     try {
//         const { title, subtitle, buttonText, buttonAction, slideClass, sortOrder, isActive } = req.body;
        
//         // Validation
//         if (!title || !subtitle) {
//             return res.status(400).json({ error: 'Title and subtitle are required' });
//         }
        
//         const newSlide = {
//             id: database.nextId++,
//             title: title.trim(),
//             subtitle: subtitle.trim(),
//             buttonText: buttonText?.trim() || 'Learn More',
//             buttonAction: buttonAction?.trim() || '',
//             slideClass: slideClass || 'mk-slide3',
//             sortOrder: parseInt(sortOrder) || 0,
//             isActive: isActive === 'true' || isActive === true,
//             // ✅ CHANGED: Use req.file.path for Cloudinary URL
//             backgroundImage: req.file ? req.file.path : null,
//             createdAt: new Date().toISOString(),
//             updatedAt: new Date().toISOString()
//         };
        
//         database.slides.push(newSlide);
//         saveDatabase();
        
//         console.log(`✓ Created new slide: ${newSlide.title} (ID: ${newSlide.id})`);
//         res.status(201).json(newSlide);
        
//     } catch (error) {
//         console.error('Error creating slide:', error);
//         res.status(500).json({ error: 'Failed to create slide' });
//     }
// };
// // Update slide
// exports.updateSlide = async (req, res) => {
//     try {
//         const slideId = parseInt(req.params.id);
//         const slideIndex = database.slides.findIndex(s => s.id === slideId);
        
//         if (slideIndex === -1) {
//             return res.status(404).json({ error: 'Slide not found' });
//         }
        
//         const { title, subtitle, buttonText, buttonAction, slideClass, sortOrder, isActive } = req.body;
//         const existingSlide = database.slides[slideIndex];
        
//         // Validation
//         if (!title || !subtitle) {
//             return res.status(400).json({ error: 'Title and subtitle are required' });
//         }
        
//         // ✅ CHANGED: Handle image replacement for Cloudinary
//         let backgroundImage = existingSlide.backgroundImage;
//         if (req.file) {
//             // Delete old image from Cloudinary if it exists
//             if (existingSlide.backgroundImage) {
//                 await deleteCloudinaryImage(existingSlide.backgroundImage);
//             }
//             // Use Cloudinary URL from req.file.path
//             backgroundImage = req.file.path;
//         }
        
//         // Update slide
//         database.slides[slideIndex] = {
//             ...existingSlide,
//             title: title.trim(),
//             subtitle: subtitle.trim(),
//             buttonText: buttonText?.trim() || 'Learn More',
//             buttonAction: buttonAction?.trim() || '',
//             slideClass: slideClass || 'mk-slide3',
//             sortOrder: parseInt(sortOrder) || 0,
//             isActive: isActive === 'true' || isActive === true,
//             backgroundImage: backgroundImage,
//             updatedAt: new Date().toISOString()
//         };
        
//         saveDatabase();
        
//         console.log(`✓ Updated slide: ${database.slides[slideIndex].title} (ID: ${slideId})`);
//         res.json(database.slides[slideIndex]);
        
//     } catch (error) {
//         console.error('Error updating slide:', error);
//         res.status(500).json({ error: 'Failed to update slide' });
//     }
// };
// // Toggle slide active status
// exports.toggleSlideStatus = async (req, res) => {
//     try {
//         const slideId = parseInt(req.params.id);
//         const slideIndex = database.slides.findIndex(s => s.id === slideId);
        
//         if (slideIndex === -1) {
//             return res.status(404).json({ error: 'Slide not found' });
//         }
        
//         database.slides[slideIndex].isActive = !database.slides[slideIndex].isActive;
//         database.slides[slideIndex].updatedAt = new Date().toISOString();
        
//         saveDatabase();
        
//         console.log(`✓ Toggled slide status: ${database.slides[slideIndex].title} (ID: ${slideId}) - Active: ${database.slides[slideIndex].isActive}`);
//         res.json(database.slides[slideIndex]);
        
//     } catch (error) {
//         console.error('Error toggling slide status:', error);
//         res.status(500).json({ error: 'Failed to toggle slide status' });
//     }
// };

// // Delete single slide
// exports.deleteSlide = async (req, res) => {
//     try {
//         const slideId = parseInt(req.params.id);
//         const slideIndex = database.slides.findIndex(s => s.id === slideId);
        
//         if (slideIndex === -1) {
//             return res.status(404).json({ error: 'Slide not found' });
//         }
        
//         const slide = database.slides[slideIndex];
        
//         // Delete associated image file
//         if (slide.backgroundImage) {
//             const imagePath = path.join(__dirname, '..', slide.backgroundImage);
//             deleteFile(imagePath);
//         }
        
//         // Remove slide from database
//         database.slides.splice(slideIndex, 1);
//         saveDatabase();
        
//         console.log(`✓ Deleted slide: ${slide.title} (ID: ${slideId})`);
//         res.json({ 
//             message: 'Slide deleted successfully',
//             deletedSlide: slide
//         });
        
//     } catch (error) {
//         console.error('Error deleting slide:', error);
//         res.status(500).json({ error: 'Failed to delete slide' });
//     }
// };

// // Delete all slides
// exports.deleteAllSlides = async (req, res) => {
//     try {
//         const { confirm } = req.body;
        
//         if (confirm !== 'DELETE_ALL') {
//             return res.status(400).json({ 
//                 error: 'Confirmation required. Send { "confirm": "DELETE_ALL" } to delete all slides' 
//             });
//         }
        
//         // Delete all image files
//         database.slides.forEach(slide => {
//             if (slide.backgroundImage) {
//                 const imagePath = path.join(__dirname, '..', slide.backgroundImage);
//                 deleteFile(imagePath);
//             }
//         });
        
//         const deletedCount = database.slides.length;
//         database.slides = [];
//         database.nextId = 1;
//         saveDatabase();
        
//         console.log(`✓ Deleted all ${deletedCount} slides`);
//         res.json({ 
//             message: `Successfully deleted ${deletedCount} slides`,
//             deletedCount
//         });
        
//     } catch (error) {
//         console.error('Error deleting all slides:', error);
//         res.status(500).json({ error: 'Failed to delete all slides' });
//     }
// };

const Slide = require('../models/Slide');
const { cloudinary } = require('../config/cloudinaryConfig');

// Health check
exports.healthCheck = async (req, res) => {
  try {
    const totalSlides = await Slide.countDocuments();
    const activeSlides = await Slide.countDocuments({ isActive: true });
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      totalSlides,
      activeSlides
    });
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
};

// Get all slides
exports.getAllSlides = async (req, res) => {
  try {
    let query = {};
    
    // Filter by active status if requested
    if (req.query.active === 'true') {
      query.isActive = true;
    }
    
    const slides = await Slide.find(query).sort({ sortOrder: 1 });
    res.json(slides);
  } catch (error) {
    console.error('Error fetching slides:', error);
    res.status(500).json({ error: 'Failed to fetch slides' });
  }
};

// Get single slide by ID
exports.getSlideById = async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    
    if (!slide) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    
    res.json(slide);
  } catch (error) {
    console.error('Error fetching slide:', error);
    res.status(500).json({ error: 'Failed to fetch slide' });
  }
};

// Get active slides only
exports.getActiveSlides = async (req, res) => {
  try {
    const activeSlides = await Slide.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json(activeSlides);
  } catch (error) {
    console.error('Error fetching active slides:', error);
    res.status(500).json({ error: 'Failed to fetch active slides' });
  }
};

// Create new slide
exports.createSlide = async (req, res) => {
  try {
    const { title, subtitle, buttonText, buttonAction, slideClass, sortOrder, isActive } = req.body;
    
    // Validation
    if (!title || !subtitle) {
      return res.status(400).json({ error: 'Title and subtitle are required' });
    }
    
    const newSlide = new Slide({
      title: title.trim(),
      subtitle: subtitle.trim(),
      buttonText: buttonText?.trim() || 'Learn More',
      buttonAction: buttonAction?.trim() || '',
      slideClass: slideClass || 'mk-slide3',
      sortOrder: parseInt(sortOrder) || 0,
      isActive: isActive === 'true' || isActive === true,
      backgroundImage: req.file ? req.file.path : null
    });
    
    await newSlide.save();
    
    console.log(`✓ Created new slide: ${newSlide.title} (ID: ${newSlide._id})`);
    res.status(201).json(newSlide);
    
  } catch (error) {
    console.error('Error creating slide:', error);
    res.status(500).json({ error: 'Failed to create slide' });
  }
};

// Update slide
exports.updateSlide = async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    
    if (!slide) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    
    const { title, subtitle, buttonText, buttonAction, slideClass, sortOrder, isActive } = req.body;
    
    // Validation
    if (!title || !subtitle) {
      return res.status(400).json({ error: 'Title and subtitle are required' });
    }
    
    // Handle image replacement
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (slide.backgroundImage) {
        await deleteCloudinaryImage(slide.backgroundImage);
      }
      slide.backgroundImage = req.file.path;
    }
    
    // Update fields
    slide.title = title.trim();
    slide.subtitle = subtitle.trim();
    slide.buttonText = buttonText?.trim() || 'Learn More';
    slide.buttonAction = buttonAction?.trim() || '';
    slide.slideClass = slideClass || 'mk-slide3';
    slide.sortOrder = parseInt(sortOrder) || 0;
    slide.isActive = isActive === 'true' || isActive === true;
    
    await slide.save();
    
    console.log(`✓ Updated slide: ${slide.title} (ID: ${slide._id})`);
    res.json(slide);
    
  } catch (error) {
    console.error('Error updating slide:', error);
    res.status(500).json({ error: 'Failed to update slide' });
  }
};

// Toggle slide active status
exports.toggleSlideStatus = async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    
    if (!slide) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    
    slide.isActive = !slide.isActive;
    await slide.save();
    
    console.log(`✓ Toggled slide status: ${slide.title} (ID: ${slide._id}) - Active: ${slide.isActive}`);
    res.json(slide);
    
  } catch (error) {
    console.error('Error toggling slide status:', error);
    res.status(500).json({ error: 'Failed to toggle slide status' });
  }
};

// Delete single slide
exports.deleteSlide = async (req, res) => {
  try {
    const slide = await Slide.findById(req.params.id);
    
    if (!slide) {
      return res.status(404).json({ error: 'Slide not found' });
    }
    
    // Delete image from Cloudinary
    if (slide.backgroundImage) {
      await deleteCloudinaryImage(slide.backgroundImage);
    }
    
    await Slide.findByIdAndDelete(req.params.id);
    
    console.log(`✓ Deleted slide: ${slide.title} (ID: ${slide._id})`);
    res.json({ 
      message: 'Slide deleted successfully',
      deletedSlide: slide
    });
    
  } catch (error) {
    console.error('Error deleting slide:', error);
    res.status(500).json({ error: 'Failed to delete slide' });
  }
};

// Delete all slides
exports.deleteAllSlides = async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_ALL') {
      return res.status(400).json({ 
        error: 'Confirmation required. Send { "confirm": "DELETE_ALL" } to delete all slides' 
      });
    }
    
    // Get all slides to delete their images
    const slides = await Slide.find();
    
    // Delete all images from Cloudinary
    for (const slide of slides) {
      if (slide.backgroundImage) {
        await deleteCloudinaryImage(slide.backgroundImage);
      }
    }
    
    const result = await Slide.deleteMany({});
    
    console.log(`✓ Deleted all ${result.deletedCount} slides`);
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} slides`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Error deleting all slides:', error);
    res.status(500).json({ error: 'Failed to delete all slides' });
  }
};

// Helper function to delete image from Cloudinary
async function deleteCloudinaryImage(imageUrl) {
  try {
    if (!imageUrl) return false;
    
    // Extract public_id from Cloudinary URL
    const matches = imageUrl.match(/\/marketing_slides\/([^\/]+)\./);
    if (matches && matches[1]) {
      const publicId = `marketing_slides/${matches[1]}`;
      const result = await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted image from Cloudinary: ${publicId}`, result);
      return result.result === 'ok';
    }
    return false;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
}