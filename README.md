# AI Podcast Generator

Transform your content into professional podcast episodes through a multi-stage AI-powered pipeline.

## Features

- **AI Script Generation**: OpenAI GPT-4o-mini with Anthropic Claude fallback
- **Text-to-Speech**: ElevenLabs API with multilingual support
- **Audio Processing**: FFmpeg API for splitting and merging
- **Video Generation**: Wavespeed AI for lip-sync video creation
- **Real-time Progress**: Live status updates throughout the generation process

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy `env.example` to `.env.local` and fill in your API keys:
   ```bash
   cp env.example .env.local
   ```

   Required API keys:
   - `OPENAI_API_KEY` - OpenAI API key for script generation
   - `ANTHROPIC_API_KEY` - Anthropic API key (fallback)
   - `ELEVENLABS_API_KEY` - ElevenLabs API key for TTS
   - `WAVESPEED_API_KEY` - Wavespeed API key for video generation
   - `FFMPEGAPI_KEY` - FFmpeg API key for audio/video processing
   - `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name for file storage
   - `CLOUDINARY_API_KEY` - Cloudinary API key
   - `CLOUDINARY_API_SECRET` - Cloudinary API secret

3. **Set up Cloudinary (for file storage)**
   - Create a free account at [cloudinary.com](https://cloudinary.com)
   - Go to your dashboard and copy your credentials:
     - Cloud Name
     - API Key  
     - API Secret
   - Add these to your `.env.local` file

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Deployment

### Vercel (Recommended)

1. **Deploy to Vercel**
   ```bash
   npx vercel
   ```

2. **Set Environment Variables**
   In your Vercel dashboard, add all the required environment variables.

3. **Configure Function Timeout**
   The `vercel.json` file is already configured with appropriate timeouts for long-running operations.

## Usage

1. **Enter Prompt**: Describe what you want your podcast to be about
2. **Upload Image**: Select a speaker image for video generation
3. **Select Voice**: Choose from available ElevenLabs voices with preview
4. **Configure Options**:
   - Target duration (minutes)
   - Language and style
   - Video generation toggle
5. **Generate**: Click "Generate Podcast" and watch real-time progress
6. **Download**: Get your final video when generation completes

## Generation Pipeline

1. **Script Generation**: AI creates structured podcast script with SSML
2. **Audio Generation**: ElevenLabs converts script to high-quality speech
3. **Audio Splitting**: FFmpeg splits audio into 30-second segments
4. **Video Generation**: Wavespeed creates lip-sync videos for each segment
5. **Video Merging**: FFmpeg combines all segments into final video
6. **Completion**: Download link provided for final video

## Technical Details

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **TypeScript**: Full type safety
- **API Integration**: OpenAI, ElevenLabs, Wavespeed, FFmpeg
- **Voice Selection**: Dynamic voice loading with preview functionality
- **Simplified UI**: Streamlined form with essential options only
- **Real-time Updates**: Polling-based status tracking
- **Error Handling**: Comprehensive logging and fallbacks

## Console Logging

Every step is logged to the console with timestamps for debugging:
- API request/response details
- Processing times
- Error messages with stack traces
- Progress updates

## Limitations

- Single-instance deployment (in-memory job storage)
- Vercel function timeout limits (300s max)
- No database persistence
- Internal use only (no authentication)

## Troubleshooting

Check the browser console and server logs for detailed error information. Common issues:

- Missing API keys
- API rate limits
- File upload size limits
- Network timeouts

## Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing instructions.

## Deployment

See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for deployment instructions.

## File Storage

This application uses Cloudinary for file storage. See [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md) for setup instructions.

## Support

This is an internal tool. For issues, check the console logs and ensure all API keys are properly configured.

## Implementation Status

✅ **Complete Implementation:**
- Next.js 14+ with TypeScript and Tailwind CSS
- OpenAI script generation with Anthropic fallback
- ElevenLabs voice selection and TTS
- Cloudinary file storage integration
- FFmpeg audio splitting and video merging
- Wavespeed video generation
- Real-time progress tracking
- Comprehensive error handling and logging
- Vercel deployment ready