import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUser } from './user.model';
import { IProduct } from './product.model';

// Enum to track the status of a notification request
export enum NotificationStatus {
  PENDING = 'Pending',
  CONTACTED = 'Contacted',
  COMPLETED = 'Completed', // e.g., if the user purchased after being notified
}

// Interface for the Notification document
export interface INotification extends Document {
  user: IUser['_id'];
  product: IProduct['_id'];
  status: NotificationStatus;
}

const notificationSchema: Schema<INotification> = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  product: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Product',
  },
  status: {
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.PENDING,
  },
}, { timestamps: true });

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;