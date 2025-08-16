// src/types/express/index.d.ts

// This file uses declaration merging to add custom properties to the Express Request type.
// This allows us to use req.user and req.file in our controllers with full TypeScript support.

import { IUser } from '../../models/user.model'; // Import your User interface

// We need to tell TypeScript about Multer's File type.
// This is often needed when extending namespaces.
import 'multer';

declare global {
  namespace Express {
    // This interface is now merged with the original Express.Request.
    // We can add as many custom properties as we need here.
    export interface Request {
      // Property added by your `protect` auth middleware
      user?: IUser; 

      // Property added by the `upload.single('image')` multer middleware
      // It's already part of the base Request type if @types/multer is installed,
      // but explicitly adding it here can solve conflicts and improve clarity.
      file?: Multer.File; 
    }
  }
}