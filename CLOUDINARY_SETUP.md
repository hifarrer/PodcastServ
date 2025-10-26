# Cloudinary Setup Guide

## Why Cloudinary?

Cloudinary is the easiest cloud storage solution for this project because:

- ✅ **Free Tier**: 25GB storage + 25GB bandwidth/month
- ✅ **Simple Setup**: Just 3 environment variables
- ✅ **Automatic Optimization**: Images and videos are automatically optimized
- ✅ **CDN Delivery**: Global edge locations for fast access
- ✅ **Developer Friendly**: Excellent documentation and SDK

## Setup Steps

### 1. Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Click "Sign Up For Free"
3. Fill in your details and verify your email

### 2. Get Your Credentials

1. After logging in, you'll see your dashboard
2. Look for the "Product Environment Credentials" section
3. Copy these three values:
   - **Cloud Name** (e.g., `d1234567890`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Add to Environment Variables

Add these to your `.env.local` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 4. Test the Setup

The application will automatically use Cloudinary for:
- **Audio files** from ElevenLabs TTS
- **Images** uploaded by users
- **Temporary storage** for the video generation pipeline

## What Gets Stored

- **Audio files**: Generated TTS audio from ElevenLabs
- **Images**: User-uploaded speaker images
- **Organization**: Files are organized in folders:
  - `podcast-service/audio/` - Audio files
  - `podcast-service/images/` - User images

## Free Tier Limits

- **Storage**: 25GB total
- **Bandwidth**: 25GB/month
- **Transformations**: 25,000/month
- **Uploads**: 1,000/month

For a personal/internal tool, this should be more than enough!

## Security

- API Secret is only used server-side
- Files are stored securely in your Cloudinary account
- You can delete files programmatically if needed
- All uploads are logged for debugging

## Troubleshooting

If you get upload errors:

1. **Check credentials**: Make sure all 3 environment variables are set
2. **Check network**: Ensure your server can reach Cloudinary
3. **Check limits**: Verify you haven't exceeded free tier limits
4. **Check logs**: Look at console logs for detailed error messages

## Alternative Options

If you prefer other storage solutions:

- **AWS S3**: More complex setup, but more control
- **Google Cloud Storage**: Similar to S3
- **Vercel Blob**: Simple, but limited to Vercel deployments
- **Local storage**: Not recommended for production (files would be lost on server restart)

Cloudinary is recommended because it's the easiest to set up and has the most generous free tier for this use case.
