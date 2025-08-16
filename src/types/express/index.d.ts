// This file uses declaration merging to add a 'file' property to the Express Request type.
// This allows us to use req.file in our controllers with full TypeScript support.
declare namespace Express {
  export interface Request {
    file?: Multer.File; // The file property is optional and of type Multer.File
  }
}