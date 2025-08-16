// src/config/cloudinary.config.ts

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Configure the Cloudinary instance using your secure environment variables
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Forces HTTPS URLs for all assets
});

// Export the configured instance for use in other parts of the application
export { cloudinary };