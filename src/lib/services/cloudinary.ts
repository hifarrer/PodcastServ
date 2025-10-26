import { v2 as cloudinary } from 'cloudinary';
import { logWithTimestamp } from '@/lib/utils';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadAudioToTempStorage(audioBuffer: Buffer): Promise<string> {
  logWithTimestamp('Uploading audio to Cloudinary', { 
    bufferSize: `${(audioBuffer.length / 1024).toFixed(2)}KB` 
  });

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
  }

  try {
    const startTime = Date.now();
    
    // Convert buffer to base64 data URI
    const base64Audio = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;
    
    const result = await cloudinary.uploader.upload(base64Audio, {
      resource_type: 'video', // Cloudinary treats audio as video for processing
      folder: 'podcast-service/audio',
      public_id: `audio_${Date.now()}`,
      format: 'mp3',
      quality: 'auto',
      fetch_format: 'auto'
    });

    const duration = Date.now() - startTime;
    logWithTimestamp('Audio uploaded to Cloudinary successfully', {
      duration: `${duration}ms`,
      publicId: result.public_id,
      url: result.secure_url,
      size: result.bytes
    });

    return result.secure_url;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Cloudinary upload failed', { error: errorMessage });
    throw new Error(`Audio upload failed: ${errorMessage}`);
  }
}

export async function uploadImageToTempStorage(imageBuffer: Buffer, originalName: string): Promise<string> {
  logWithTimestamp('Uploading image to Cloudinary', { 
    bufferSize: `${(imageBuffer.length / 1024).toFixed(2)}KB`,
    originalName 
  });

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
  }

  try {
    const startTime = Date.now();
    
    // Convert buffer to base64 data URI
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    const result = await cloudinary.uploader.upload(base64Image, {
      resource_type: 'image',
      folder: 'podcast-service/images',
      public_id: `image_${Date.now()}`,
      format: 'jpg',
      quality: 'auto',
      fetch_format: 'auto',
      width: 1920,
      height: 1080,
      crop: 'limit'
    });

    const duration = Date.now() - startTime;
    logWithTimestamp('Image uploaded to Cloudinary successfully', {
      duration: `${duration}ms`,
      publicId: result.public_id,
      url: result.secure_url,
      size: result.bytes
    });

    return result.secure_url;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Cloudinary image upload failed', { error: errorMessage });
    throw new Error(`Image upload failed: ${errorMessage}`);
  }
}

export async function deleteFile(publicId: string): Promise<void> {
  logWithTimestamp('Deleting file from Cloudinary', { publicId });

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logWithTimestamp('File deleted from Cloudinary', { 
      publicId, 
      result: result.result 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Failed to delete file from Cloudinary', { 
      publicId, 
      error: errorMessage 
    });
    // Don't throw error for cleanup operations
  }
}
