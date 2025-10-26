# AI Podcast Generator - Podcasty

A powerful AI-powered podcast generation platform that transforms content into professional podcast episodes through a multi-stage pipeline. Built with Next.js, TypeScript, and Tailwind CSS.

## 🎯 Features

- **AI Script Generation**: OpenAI GPT-4o-mini with Anthropic Claude fallback
- **High-Quality TTS**: ElevenLabs multilingual voice synthesis
- **Video Generation**: Wavespeed AI lip-sync video creation
- **Audio Processing**: FFmpeg API for audio splitting and video merging
- **Cloud Storage**: Cloudinary integration for file management
- **Real-time Progress**: Live progress tracking with detailed logging
- **Voice Selection**: Dynamic voice loading with preview functionality
- **Simplified UI**: Streamlined interface for easy podcast creation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- API keys for OpenAI, ElevenLabs, Wavespeed, FFmpeg, and Cloudinary

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/hifarrer/PodcastServ.git
   cd PodcastServ
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Add your API keys to `.env.local`:
   ```env
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   ELEVENLABS_API_KEY=your_elevenlabs_key
   WAVESPEED_API_KEY=your_wavespeed_key
   FFMPEGAPI_KEY=your_ffmpeg_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Usage

1. **Enter Prompt**: Describe what you want your podcast to be about
2. **Upload Image**: Select a speaker image for video generation
3. **Select Voice**: Choose from available ElevenLabs voices with preview
4. **Configure Options**:
   - Target duration (minutes)
   - Language and style
   - Video generation toggle
5. **Generate**: Click "Generate Podcast" and watch real-time progress
6. **Download**: Get your final video when generation completes

## 🔧 Generation Pipeline

1. **Script Generation**: AI creates structured podcast script with SSML
2. **Audio Generation**: ElevenLabs converts script to high-quality speech
3. **Audio Splitting**: FFmpeg splits audio into 30-second segments
4. **Video Generation**: Wavespeed creates lip-sync videos for each segment
5. **Video Merging**: FFmpeg combines all segments into final video
6. **Completion**: Download your professional podcast video

## 🛠️ Technical Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **APIs**: OpenAI, ElevenLabs, Wavespeed, FFmpeg, Cloudinary
- **Deployment**: Vercel (serverless functions)

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate/route.ts          # Main orchestration endpoint
│   │   ├── status/[jobId]/route.ts   # Job status polling
│   │   └── voices/                   # ElevenLabs voice management
│   ├── page.tsx                      # Main UI page
│   └── layout.tsx                    # Root layout
├── components/
│   ├── GeneratorForm.tsx             # Main form component
│   └── ProgressTracker.tsx           # Real-time progress display
└── lib/
    ├── services/                     # API service integrations
    ├── types.ts                      # TypeScript interfaces
    └── utils.ts                      # Helper functions
```

## 🔑 Required API Keys

| Service | Purpose | Required |
|---------|---------|----------|
| OpenAI | Script generation | ✅ |
| Anthropic | Script generation fallback | ✅ |
| ElevenLabs | Text-to-speech synthesis | ✅ |
| Wavespeed | Video generation | ✅ |
| FFmpeg API | Audio/video processing | ✅ |
| Cloudinary | File storage | ✅ |

## 📚 Documentation

- [Testing Guide](TESTING_GUIDE.md) - Comprehensive testing instructions
- [Deployment Checklist](DEPLOYMENT_CHECKLIST.md) - Vercel deployment guide
- [Cloudinary Setup](CLOUDINARY_SETUP.md) - File storage configuration
- [Bug Fixes](BUG_FIXES.md) - Known issues and solutions

## 🚀 Deployment

### Vercel Deployment

1. **Connect to Vercel**
   - Import project from GitHub
   - Configure environment variables
   - Deploy with default settings

2. **Environment Variables**
   Add all required API keys in Vercel dashboard

3. **Function Configuration**
   - Timeout: 300 seconds (Pro plan)
   - Memory: 1024 MB
   - Regions: Auto

## 🐛 Troubleshooting

### Common Issues

- **Missing API Keys**: Ensure all environment variables are set
- **Voice Loading**: Check ElevenLabs API key and network connection
- **Video Generation**: Verify Wavespeed API key and image format
- **Audio Processing**: Check FFmpeg API key and audio format

### Debug Mode

All operations are logged to console with timestamps:
- API request/response details
- Processing times
- Error messages with stack traces
- Progress updates

## 📊 Performance

- **Script Generation**: ~10-30 seconds
- **Audio Generation**: ~30-60 seconds
- **Video Generation**: ~2-5 minutes per segment
- **Total Pipeline**: ~5-15 minutes (depending on duration)

## 🔒 Security

- No authentication required (internal use)
- API keys stored as environment variables
- Temporary file cleanup after processing
- No persistent data storage

## 📄 License

This project is for internal use only. All API services require their respective subscriptions.

## 🤝 Contributing

This is an internal project. For issues or improvements, please contact the development team.

## 📞 Support

For technical support or questions:
- Check the [Testing Guide](TESTING_GUIDE.md) for common issues
- Review [Bug Fixes](BUG_FIXES.md) for known solutions
- Check console logs for detailed error information

---

**Built with ❤️ for AI-powered podcast creation**