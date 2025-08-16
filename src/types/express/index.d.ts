// src/types/express/index.d.ts
import { IUser } from '../../models/user.model';
import 'multer';

declare global {
  namespace Express {
    export interface Request {
      user?: IUser;
      // The 'file' property from multer is automatically added by @types/multer
      // but we can leave it here for explicit clarity if needed.
      // file?: Multer.File;
    }
  }
}