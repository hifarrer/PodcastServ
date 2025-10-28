'use client';

import { useState, useEffect, useRef } from 'react';
import GeneratorForm from '@/components/GeneratorForm';
import ProgressTracker from '@/components/ProgressTracker';
import { ScriptGenerationOptions } from '@/lib/types';
import { logWithTimestamp } from '@/lib/utils';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [scriptResult, setScriptResult] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [options, setOptions] = useState<ScriptGenerationOptions | null>(null);
  const [continueCallMade, setContinueCallMade] = useState(false);
  const [showApiDocs, setShowApiDocs] = useState(false);
  
  // Elapsed time tracking
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    if (startTime && isGenerating) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTime, isGenerating]);

  // Format elapsed time as MM:SS
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerate = async (data: {
    prompt: string;
    image: File;
    options: ScriptGenerationOptions;
  }) => {
    logWithTimestamp('Starting generation request', {
      prompt: data.prompt.substring(0, 100) + '...',
      imageName: data.image.name,
      options: data.options
    });

    setIsGenerating(true);
    setShowProgress(true);
    setJobId(null);
    setContinueCallMade(false); // Reset the flag for new generation
    
    // Start elapsed time tracking
    const now = Date.now();
    setStartTime(now);
    setElapsedTime(0);

    try {
      const formData = new FormData();
      formData.append('prompt', data.prompt);
      formData.append('image', data.image);
      formData.append('options', JSON.stringify(data.options));

      logWithTimestamp('Submitting generation request to API');

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      logWithTimestamp('Generation request response', {
        success: result.success,
        jobId: result.jobId,
        error: result.error
      });

      if (result.success) {
        setJobId(result.jobId);
        setScriptResult(result.scriptResult);
        setImageFile(data.image);
        setOptions(data.options);
        logWithTimestamp('Generation started successfully', { jobId: result.jobId });
      } else {
        throw new Error(result.error || 'Generation failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Generation request failed', { error: errorMessage });
      alert(`Generation failed: ${errorMessage}`);
      setIsGenerating(false);
      setShowProgress(false);
      
      // Reset timer on error
      setStartTime(null);
      setElapsedTime(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  };

  const handleGenerationComplete = () => {
    logWithTimestamp('Generation completed, stopping timer');
    setIsGenerating(false);
    
    // Stop timer
    setStartTime(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleReset = () => {
    logWithTimestamp('Resetting form');
    setIsGenerating(false);
    setJobId(null);
    setShowProgress(false);
    setScriptResult(null);
    setImageFile(null);
    setOptions(null);
    setContinueCallMade(false);
    
    // Reset timer
    setStartTime(null);
    setElapsedTime(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleContinue = async () => {
    // Prevent multiple calls
    if (continueCallMade) {
      logWithTimestamp('Continue already called, skipping', { jobId });
      return;
    }

    if (!jobId || !scriptResult || !imageFile || !options) {
      logWithTimestamp('Cannot continue - missing required data', {
        hasJobId: !!jobId,
        hasScriptResult: !!scriptResult,
        hasImageFile: !!imageFile,
        hasOptions: !!options
      });
      return;
    }

    // Mark as called immediately to prevent race conditions
    setContinueCallMade(true);

    try {
      logWithTimestamp('Calling continue endpoint', { jobId });
      
      // Convert image file to base64 for the continue endpoint
      const imageBuffer = await imageFile.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      
      const response = await fetch('/api/continue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          scriptResult,
          imageFile: {
            name: imageFile.name,
            data: imageBase64
          },
          options
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        logWithTimestamp('Continue request successful', { jobId });
      } else {
        // If job is already being processed (409 conflict), don't show error
        if (result.code === 'JOB_LOCKED') {
          logWithTimestamp('Continue request rejected - job already processing', { jobId });
          // Don't reset flag - let the existing process complete
          return;
        }
        throw new Error(result.error || 'Continue request failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a 409 conflict (job already processing)
      if (errorMessage.includes('already being processed')) {
        logWithTimestamp('Continue request rejected - job already processing', { jobId, error: errorMessage });
        // Silent fail - don't show alert, don't reset flag
        return;
      }
      
      logWithTimestamp('Continue request failed', { jobId, error: errorMessage });
      // Reset the flag on error so it can be retried
      setContinueCallMade(false);
      alert(`Continue failed: ${errorMessage}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1"></div>
            <h1 className="text-4xl font-bold text-gray-900">
              AI Podcast Generator
            </h1>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => setShowApiDocs(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
              >
                📚 API Docs
              </button>
            </div>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your content into professional podcast episodes with AI-powered script generation, 
            text-to-speech, and video creation.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="order-2 lg:order-1">
            <GeneratorForm 
              onSubmit={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          {/* Progress Section */}
          <div className="order-1 lg:order-2">
            {showProgress && (
              <div className="space-y-6">
                <ProgressTracker 
                  jobId={jobId}
                  isVisible={showProgress}
                  onContinue={handleContinue}
                  scriptResult={scriptResult}
                  elapsedTime={elapsedTime}
                  formatElapsedTime={formatElapsedTime}
                  onGenerationComplete={handleGenerationComplete}
                />
                
                {/* Reset Button */}
                {!isGenerating && (
                  <div className="text-center">
                    <button
                      onClick={handleReset}
                      className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Start New Generation
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Welcome Message */}
            {!showProgress && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Welcome!</h3>
                <div className="space-y-4 text-gray-600">
                  <p>
                    Create professional podcast episodes by simply providing a topic and speaker image.
                  </p>
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Features:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>AI-powered script generation with multiple modes</li>
                      <li>High-quality text-to-speech with ElevenLabs</li>
                      <li>Automatic audio splitting into segments</li>
                      <li>Lip-sync video generation with your image</li>
                      <li>Professional video merging and output</li>
                    </ul>
                  </div>
                  <div className="pt-4">
                    <p className="text-sm text-gray-500">
                      Fill out the form to get started with your podcast generation!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>AI Podcast Generator - Powered by OpenAI, ElevenLabs, Wavespeed, and FFmpeg</p>
        </div>
      </div>

      {/* API Docs Modal */}
      {showApiDocs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">API Documentation</h2>
                <button
                  onClick={() => setShowApiDocs(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Overview */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Overview</h3>
                  <p className="text-gray-600 mb-4">
                    The AI Podcast Generator provides a RESTful API for creating podcast episodes with AI-generated scripts, 
                    text-to-speech audio, and video generation. Perfect for integration with external applications and testing tools like Postman.
                  </p>
                </div>

                {/* Create Podcast Endpoint */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Create Podcast Episode</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-3">
                      <span className="inline-block bg-green-100 text-green-800 text-sm font-medium px-2 py-1 rounded mr-2">POST</span>
                      <code className="text-sm font-mono">/api/create-podcast</code>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Required Parameters:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li><code className="bg-gray-200 px-1 rounded">prompt</code> - The topic or content for the podcast</li>
                        <li><code className="bg-gray-200 px-1 rounded">speaker_image_url</code> - URL of the speaker's image</li>
                        <li><code className="bg-gray-200 px-1 rounded">voice_id</code> - ElevenLabs voice ID for audio generation</li>
                      </ul>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Optional Parameters:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li><code className="bg-gray-200 px-1 rounded">duration</code> - Duration in minutes (default: 2)</li>
                        <li><code className="bg-gray-200 px-1 rounded">language</code> - Language for the podcast (default: "English")</li>
                        <li><code className="bg-gray-200 px-1 rounded">style</code> - Style of the podcast (default: "Professional")</li>
                        <li><code className="bg-gray-200 px-1 rounded">mode</code> - "SUMMARY", "READTHROUGH", or "DISCUSSION" (default: "SUMMARY")</li>
                        <li><code className="bg-gray-200 px-1 rounded">twoSpeakers</code> - Whether to use two speakers (default: false)</li>
                        <li><code className="bg-gray-200 px-1 rounded">speakerNameA</code> - Name of first speaker (default: "Host")</li>
                        <li><code className="bg-gray-200 px-1 rounded">speakerNameB</code> - Name of second speaker (default: "Guest")</li>
                      </ul>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Example Request:</h4>
                      <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
{`{
  "prompt": "The future of artificial intelligence in healthcare",
  "speaker_image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
  "duration": 2,
  "language": "English",
  "style": "Professional",
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "mode": "SUMMARY",
  "twoSpeakers": false,
  "speakerNameA": "Dr. Smith",
  "speakerNameB": "Interviewer"
}`}
                      </pre>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Example Response:</h4>
                      <pre className="bg-gray-800 text-blue-400 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "jobId": "job_abc123",
  "message": "Podcast creation started successfully!",
  "stage": "AUDIO",
  "progress": 20,
  "scriptResult": {
    "title": "The Future of AI in Healthcare",
    "chapters": [...],
    "show_notes": "...",
    "estimated_wpm": 150,
    "speaker_names": {"A": "Dr. Smith", "B": "Interviewer"},
    "turns": [...]
  },
  "statusUrl": "/api/status/job_abc123"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Check Status Endpoint */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Check Job Status</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-3">
                      <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded mr-2">GET</span>
                      <code className="text-sm font-mono">/api/status/{'{jobId}'}</code>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Example:</h4>
                      <code className="text-sm font-mono bg-gray-200 px-2 py-1 rounded">GET /api/status/job_abc123</code>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Response:</h4>
                      <pre className="bg-gray-800 text-blue-400 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "jobId": "job_abc123",
  "stage": "COMPLETE",
  "progress": 100,
  "message": "Podcast generation completed successfully!",
  "videoUrl": "https://example.com/final-video.mp4"
}`}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Get Voices Endpoint */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Get Available Voices</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-3">
                      <span className="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded mr-2">GET</span>
                      <code className="text-sm font-mono">/api/voices</code>
                    </div>
                    <p className="text-sm text-gray-600">
                      Returns a list of available ElevenLabs voices with their IDs, names, and descriptions.
                    </p>
                  </div>
                </div>

                {/* Testing Tips */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Testing Tips</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• Use <code className="bg-blue-200 px-1 rounded">Content-Type: application/json</code> header</li>
                      <li>• Start with a simple prompt and short duration (2-3 minutes) for testing</li>
                      <li>• Use the <code className="bg-blue-200 px-1 rounded">/api/voices</code> endpoint to get valid voice IDs</li>
                      <li>• Check job status every 10-15 seconds for progress updates</li>
                      <li>• The complete process typically takes 2-5 minutes depending on duration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}