# Deployment Guide for Render

## ✅ Changes Made for Render

### Architecture Improvements

1. **Removed Background Processing**: The entire pipeline now runs synchronously
2. **No Timeout Limitations**: Render supports long-running requests (no 5-minute limit)
3. **Simplified Flow**: Single `/api/continue` call processes everything from start to finish

### What Was Changed

- ✅ Removed Vercel-specific `vercel.json` configuration
- ✅ Simplified `/api/continue` to run synchronously (no `.then()` callbacks)
- ✅ Added `render.yaml` configuration file
- ✅ Fixed frontend to prevent multiple `/api/continue` calls

## 🚀 Deployment Steps

### 1. Prerequisites

- Render account (https://render.com)
- Redis database (Upstash recommended: https://upstash.com)
- All API keys ready:
  - OpenAI API Key
  - ElevenLabs API Key
  - Wavespeed API Key
  - FFmpeg API Key
  - Cloudinary credentials

### 2. Deploy to Render

#### Option A: Using Render Dashboard

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `podcast-service`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Choose based on your needs (Standard or higher recommended)

#### Option B: Using render.yaml (Recommended)

1. Push your code to GitHub
2. In Render Dashboard, click "New +" → "Blueprint"
3. Select your repository
4. Render will automatically detect `render.yaml` and configure everything

### 3. Configure Environment Variables

Add these in Render Dashboard → Your Service → Environment:

```
NODE_ENV=production
OPENAI_API_KEY=your_openai_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
WAVESPEED_API_KEY=your_wavespeed_key_here
FFMPEGAPI_KEY=your_ffmpeg_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
REDIS_URL=your_redis_url_from_upstash
```

### 4. Set Up Redis (Upstash)

1. Go to https://upstash.com
2. Create a new Redis database
3. Copy the Redis URL (starts with `redis://`)
4. Add it as `REDIS_URL` environment variable in Render

### 5. Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Wait for build to complete (5-10 minutes first time)
3. Check logs for any errors
4. Visit your deployed URL to test

## 📊 Expected Behavior on Render

### For a 1-Minute Podcast:

1. User submits form → `/api/generate` (20-30 seconds)
2. Frontend calls `/api/continue` **once** (5-10 minutes total):
   - Audio generation: 30-60 seconds
   - Audio splitting: 10-20 seconds  
   - Video generation: 2-4 minutes (2 videos)
   - Video merging: 1-2 minutes
   - Polling for completion: 30-60 seconds
3. Returns complete video URL

### API Calls to External Services:

- **OpenAI**: 1 call (script generation)
- **ElevenLabs**: 1 call (audio generation)
- **FFmpeg API**: 2 calls (split + merge)
- **Wavespeed**: 2 calls (one per audio segment)
- **Cloudinary**: 2-3 uploads (audio + image)

## 🎯 Key Differences from Vercel

| Feature | Vercel | Render |
|---------|--------|--------|
| **Timeout** | 300 seconds (5 min) | No practical limit |
| **Background Jobs** | Limited, requires workarounds | Native support |
| **Long Processing** | Not suitable | ✅ Perfect for this |
| **Cost** | Pay per invocation | Flat monthly rate |
| **Cold Starts** | Frequent | Less frequent |

## 🐛 Troubleshooting

### Issue: Multiple `/api/continue` Calls

**Solution**: Clear browser cache and test in incognito mode. The frontend now has proper guards to prevent this.

### Issue: Redis Connection Errors

**Solution**: Verify `REDIS_URL` is correctly set and your Upstash database is active.

### Issue: Video Generation Timeout

**Solution**: This shouldn't happen on Render! If it does, check:
- Wavespeed API key is valid
- Audio URLs are accessible
- Check Render logs for specific errors

### Issue: Out of Memory

**Solution**: Upgrade your Render instance type to one with more RAM (2GB+ recommended).

## 📈 Recommended Render Plan

For production use:

- **Starter Plan** ($7/month): Good for testing, may be slow
- **Standard Plan** ($25/month): Recommended, handles concurrent requests
- **Pro Plan** ($85/month): Best performance, multiple concurrent jobs

## 🔍 Monitoring

Check your Render logs:
- Dashboard → Your Service → Logs
- Look for these key log messages:
  - "Starting podcast generation job"
  - "Stage 1: Script Generation"
  - "Stage 2: Audio Generation"
  - "Stage 3: Audio Splitting"
  - "Stage 4: Video Generation"
  - "Stage 5: Video Merging"
  - "Job completed successfully"

## ✨ Benefits of Render Deployment

✅ **No More Multiple Calls**: Proper architecture prevents duplicate processing
✅ **Complete Pipeline**: Everything runs in one request from start to finish
✅ **Better Logging**: Full request lifecycle visible in logs
✅ **Cost Predictable**: Flat monthly fee, no per-invocation charges
✅ **No Timeout Issues**: Can process videos of any length
✅ **Better for CPU-Intensive**: Video processing works smoothly

## 🎬 Next Steps

1. Deploy to Render using the steps above
2. Test with a 1-minute podcast
3. Monitor logs to verify only 2 Wavespeed calls are made
4. Enjoy your working podcast generator! 🎉

