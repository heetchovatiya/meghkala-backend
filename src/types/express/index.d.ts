// src/types/express/index.d.ts
import { IUser } from '../../models/user.model';
import 'multer'; // Ensures Multer's File type is available

declare global {
  namespace Express {
    export interface Request {
      user?: IUser;
      file?: Multer.File;
    }
  }
}