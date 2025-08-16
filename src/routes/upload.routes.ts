// src/routes/upload.routes.ts (or wherever your file is)

import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
// ✅ MODIFIED: Import the CONFIGURED cloudinary instance from your new config file
import { cloudinary } from '../config/cloudinary.config'; 
import { protect, admin } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

/**
 * @route   POST /api/upload
 * @desc    Uploads a single image to Cloudinary and returns its secure URL.
 * @access  Private/Admin
 */
router.post(
  '/', 
  protect, 
  admin, 
  upload.single('image'), 
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400);
      throw new Error('No image file provided. Please upload an image.');
    }

    // Convert the file buffer from multer to a Data URI for streaming
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload the image using the pre-configured Cloudinary instance
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'Meghkala', // Organizes uploads into a 'Meghkala' folder in Cloudinary
      resource_type: 'auto', // Automatically detect resource type (image, video, etc.)
    });

    // Send back a success response with the secure URL
    res.status(200).json({
      message: 'Image uploaded successfully!',
      imageUrl: result.secure_url,
    });
  })
);

export default router;