import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// Enum for user roles
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

// Interface for the Address sub-document
export interface IAddress extends Document {
    type: string;
    line1: string;
    city: string;
    postalCode: string;
    country: string;
}

// Interface for the main User document (without GoogleId)
export interface IUser extends Document {
  name: string;
  email: string;
  role: UserRole;
  addresses: IAddress[];
  otp?: string;
  otpExpiry?: Date;
}

const addressSchema: Schema<IAddress> = new Schema({
    type: { type: String, default: 'Shipping' },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
});

const userSchema: Schema<IUser> = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.USER },
  addresses: [addressSchema],
  otp: { type: String },
  otpExpiry: { type: Date },
}, { timestamps: true });


const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;