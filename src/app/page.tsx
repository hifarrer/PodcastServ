'use client';

import { useState } from 'react';
import GeneratorForm from '@/components/GeneratorForm';
import ProgressTracker from '@/components/ProgressTracker';
import { ScriptGenerationOptions } from '@/lib/types';
import { logWithTimestamp } from '@/lib/utils';

export default function Home() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);

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
        logWithTimestamp('Script generation completed', { jobId: result.jobId });
        
        // If we have a script result, continue with the rest of the processing
        if (result.scriptResult) {
          logWithTimestamp('Continuing with audio generation', { jobId: result.jobId });
          
          // Continue processing in the background
          continueProcessing(result.jobId, result.scriptResult, data.image, data.options);
        }
      } else {
        throw new Error(result.error || 'Generation failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Generation request failed', { error: errorMessage });
      alert(`Generation failed: ${errorMessage}`);
      setIsGenerating(false);
      setShowProgress(false);
    }
  };

  const continueProcessing = async (jobId: string, scriptResult: any, imageFile: File, options: any) => {
    try {
      // Convert image file to base64 for API
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
        logWithTimestamp('Continue processing completed', { jobId });
        
        // If we have audio parts and image URL, continue with video generation
        if (result.audioParts && result.imageUrl) {
          logWithTimestamp('Continuing with video generation', { jobId });
          
          // Continue with video generation
          generateVideos(jobId, result.audioParts, result.imageUrl, result.audioUrl, options);
        } else {
          setIsGenerating(false);
        }
      } else {
        throw new Error(result.error || 'Continue processing failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Continue processing failed', { error: errorMessage });
      alert(`Continue processing failed: ${errorMessage}`);
      setIsGenerating(false);
    }
  };

  const generateVideos = async (jobId: string, audioParts: string[], imageUrl: string, audioUrl: string, options: any) => {
    try {
      const response = await fetch('/api/generate-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          audioParts,
          imageUrl,
          audioUrl,
          options
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        logWithTimestamp('Video generation completed', { jobId });
        setIsGenerating(false);
      } else {
        throw new Error(result.error || 'Video generation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Video generation failed', { error: errorMessage });
      alert(`Video generation failed: ${errorMessage}`);
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    logWithTimestamp('Resetting form');
    setIsGenerating(false);
    setJobId(null);
    setShowProgress(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Podcast Generator
          </h1>
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
    </div>
  );
}