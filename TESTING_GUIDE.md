# AI Podcast Generator - Testing Guide

## 🚀 Complete Pipeline Testing

Your AI Podcast Generator is now fully implemented with real cloud storage! Here's how to test the complete pipeline:

### **Prerequisites Checklist**

Before testing, ensure you have all API keys configured in `.env.local`:

- ✅ **OpenAI API Key** - For script generation  
- ✅ **ElevenLabs API Key** - For text-to-speech
- ✅ **Wavespeed API Key** - For video generation
- ✅ **FFmpeg API Key** - For audio splitting and video merging
- ✅ **Cloudinary Credentials** - For file storage (Cloud Name, API Key, API Secret)

### **Testing Steps**

#### 1. **Start the Application**
```bash
npm run dev
```
Visit: `http://localhost:3000`

#### 2. **Test Voice Loading**
- The form should automatically load available ElevenLabs voices
- You should see a dropdown with voice options
- Each voice should show name, category, and description
- Preview buttons should work (if voice has preview URL)

#### 3. **Test Complete Pipeline**

**Fill out the form:**
- **Prompt**: "Create a 3-minute podcast about the benefits of renewable energy"
- **Image**: Upload any speaker image (JPG, PNG, etc.)
- **Voice**: Select any available voice
- **Mode**: Choose "Summary" for faster testing
- **Duration**: Set to 2-3 minutes
- **Language**: "English"
- **Style**: "Professional and engaging"
- **Generate Video**: ✅ Checked

**Click "Generate Podcast"**

#### 4. **Monitor the Pipeline**

Watch the real-time progress through these stages:

1. **📝 Script Generation** (30-60 seconds)
   - OpenAI creates structured podcast script
   - Console logs: Script title, chapters, turns, parts30s

2. **🎙️ Audio Generation** (30-90 seconds)
   - ElevenLabs converts script to speech
   - Audio uploaded to Cloudinary
   - Console logs: Audio size, Cloudinary URL

3. **✂️ Audio Splitting** (10-30 seconds)
   - FFmpeg splits audio into 30-second segments
   - Console logs: Number of parts, download URLs

4. **🎬 Video Generation** (2-5 minutes)
   - Wavespeed creates lip-sync videos for each segment
   - Image uploaded to Cloudinary
   - Console logs: Video generation progress for each segment

5. **🔗 Video Merging** (1-3 minutes)
   - FFmpeg merges all video segments
   - Console logs: Merge job ID, polling status

6. **✅ Complete**
   - Final video URL provided for download
   - Console logs: Success message with final URL

### **Expected Console Output**

You should see detailed logging like:
```
[2025-01-26T12:00:00.000Z] Starting podcast generation job { jobId: "abc123" }
[2025-01-26T12:00:01.000Z] Stage 1: Script Generation { jobId: "abc123" }
[2025-01-26T12:00:02.000Z] Script generation completed { title: "Renewable Energy Benefits", chapters: 3, turns: 15 }
[2025-01-26T12:00:03.000Z] Stage 2: Audio Generation { jobId: "abc123" }
[2025-01-26T12:00:45.000Z] Audio uploaded to Cloudinary successfully { url: "https://res.cloudinary.com/..." }
[2025-01-26T12:00:46.000Z] Stage 3: Audio Splitting { jobId: "abc123" }
[2025-01-26T12:01:00.000Z] Audio splitting completed { parts: 4, audioParts: [...] }
[2025-01-26T12:01:01.000Z] Stage 4: Video Generation { jobId: "abc123" }
[2025-01-26T12:01:02.000Z] Image uploaded to Cloudinary { imageUrl: "https://res.cloudinary.com/..." }
[2025-01-26T12:01:05.000Z] Video 1 generation completed { videoUrl: "https://..." }
[2025-01-26T12:01:10.000Z] Video 2 generation completed { videoUrl: "https://..." }
[2025-01-26T12:01:15.000Z] Video 3 generation completed { videoUrl: "https://..." }
[2025-01-26T12:01:20.000Z] Video 4 generation completed { videoUrl: "https://..." }
[2025-01-26T12:01:21.000Z] Stage 5: Video Merging { jobId: "abc123" }
[2025-01-26T12:01:25.000Z] Video merge job submitted { mergeJobId: "xyz789" }
[2025-01-26T12:03:00.000Z] Video merge completed { finalVideoUrl: "https://..." }
[2025-01-26T12:03:01.000Z] Job completed successfully { finalVideoUrl: "https://..." }
```

### **Troubleshooting**

#### **Common Issues:**

1. **Voice Loading Fails**
   - Check ElevenLabs API key
   - Check network connection
   - Look for CORS errors in browser console

2. **Script Generation Fails**
   - Check OpenAI API key
   - Verify prompt is not too long

3. **Audio Generation Fails**
   - Check ElevenLabs API key
   - Verify voice ID is valid
   - Check Cloudinary credentials

4. **Video Generation Fails**
   - Check Wavespeed API key
   - Verify image upload to Cloudinary
   - Check audio segment URLs

5. **Video Merging Fails**
   - Check FFmpeg API key
   - Verify all video URLs are accessible
   - Check merge job polling

#### **Debug Steps:**

1. **Check Environment Variables**
   ```bash
   # In your .env.local file, verify all keys are set
   cat .env.local
   ```

2. **Check Console Logs**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for error messages

3. **Check Network Tab**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Look for failed API calls (red entries)

4. **Check Server Logs**
   - Look at terminal where `npm run dev` is running
   - Look for server-side error messages

### **Success Criteria**

✅ **Complete Pipeline Success:**
- Form loads with voice selection
- Script generation completes
- Audio generation and upload to Cloudinary
- Audio splitting into segments
- Video generation for each segment
- Video merging into final file
- Download link provided

✅ **Expected Total Time:** 5-10 minutes for a 3-minute podcast

✅ **Final Output:** A downloadable MP4 video file with lip-sync

### **Performance Notes**

- **Script Generation**: 30-60 seconds
- **Audio Generation**: 30-90 seconds  
- **Audio Splitting**: 10-30 seconds
- **Video Generation**: 2-5 minutes (parallel processing)
- **Video Merging**: 1-3 minutes
- **Total**: 5-10 minutes

The pipeline is designed to be robust with comprehensive error handling and logging at every step. If any step fails, you'll get detailed error messages to help debug the issue.
