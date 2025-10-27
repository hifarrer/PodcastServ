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
  const [scriptResult, setScriptResult] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [options, setOptions] = useState<ScriptGenerationOptions | null>(null);
  const [continueCallMade, setContinueCallMade] = useState(false);

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
                  onContinue={handleContinue}
                  scriptResult={scriptResult}
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