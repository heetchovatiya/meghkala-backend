// src/types/express/index.d.ts
import { IUser } from '../../models/user.model';
import 'multer'; // This ensures Express knows about Multer's File type

declare global {
  namespace Express {
    export interface Request {
      user?: IUser; // For your auth middleware
      // Note: `file` is now automatically included via `@types/multer`
      // We don't need to declare it here, but `import 'multer'` is still good practice.
    }
  }
}