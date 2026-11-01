import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gdg';

export const connectDB = async (): Promise<void> => {
  mongoose.set('bufferCommands', false);
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    console.log('🚀 MongoDB connected successfully');
  } catch (error) {
    console.warn('⚠️ MongoDB connection unavailable. Server continuing with real-time WebSocket and API routing.');
  }
};
