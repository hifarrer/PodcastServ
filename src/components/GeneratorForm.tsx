'use client';

import { useState, useRef, useEffect } from 'react';
import { ScriptGenerationOptions, ElevenLabsVoice } from '@/lib/types';
import { logWithTimestamp, isValidImageFile } from '@/lib/utils';

interface GeneratorFormProps {
  onSubmit: (data: {
    prompt: string;
    image: File;
    options: ScriptGenerationOptions;
  }) => void;
  isGenerating: boolean;
}

export default function GeneratorForm({ onSubmit, isGenerating }: GeneratorFormProps) {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<ElevenLabsVoice | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [options, setOptions] = useState<ScriptGenerationOptions>({
    mode: 'SUMMARY',
    targetMinutes: 5,
    language: 'English',
    style: 'Professional and engaging',
    twoSpeakers: false,
    speakerNameA: 'Host',
    speakerNameB: 'Co-host',
    generateVideo: true,
    voiceId: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load voices on component mount
  useEffect(() => {
    loadVoices();
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
    };
  }, [currentAudio]);

  const loadVoices = async () => {
    setIsLoadingVoices(true);
    try {
      logWithTimestamp('Loading voices from API');
      const response = await fetch('/api/voices');
      const data = await response.json();
      
      if (data.success) {
        setVoices(data.voices);
        logWithTimestamp('Voices loaded successfully', { count: data.voices.length });
        
        // Select first voice by default
        if (data.voices.length > 0) {
          setSelectedVoice(data.voices[0]);
          setOptions(prev => ({ ...prev, voiceId: data.voices[0].voice_id }));
        }
      } else {
        throw new Error(data.error || 'Failed to load voices');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Failed to load voices', { error: errorMessage });
      alert(`Failed to load voices: ${errorMessage}`);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    const voice = voices.find(v => v.voice_id === voiceId);
    if (voice) {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        setCurrentAudio(null);
        setIsPlayingPreview(false);
      }
      
      setSelectedVoice(voice);
      setOptions(prev => ({ ...prev, voiceId }));
      logWithTimestamp('Voice selected', { voiceId, name: voice.name });
    }
  };

  const playVoicePreview = async (voice: ElevenLabsVoice) => {
    if (voice.preview_url) {
      try {
        // If already playing, stop it
        if (isPlayingPreview && currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          setCurrentAudio(null);
          setIsPlayingPreview(false);
          logWithTimestamp('Stopped voice preview', { voiceId: voice.voice_id, name: voice.name });
          return;
        }

        // Stop any currently playing audio
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }

        logWithTimestamp('Playing voice preview', { voiceId: voice.voice_id, name: voice.name });
        const audio = new Audio(voice.preview_url);
        
        // Set up event listeners
        audio.onended = () => {
          setIsPlayingPreview(false);
          setCurrentAudio(null);
          logWithTimestamp('Voice preview ended', { voiceId: voice.voice_id, name: voice.name });
        };

        audio.onerror = (error) => {
          setIsPlayingPreview(false);
          setCurrentAudio(null);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logWithTimestamp('Voice preview error', { error: errorMessage });
        };

        setCurrentAudio(audio);
        setIsPlayingPreview(true);
        await audio.play();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logWithTimestamp('Failed to play voice preview', { error: errorMessage });
        setIsPlayingPreview(false);
        setCurrentAudio(null);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isValidImageFile(file)) {
        alert('Please select a valid image file (JPG, PNG, GIF, or WebP)');
        return;
      }
      
      setImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      logWithTimestamp('Image selected', { 
        name: file.name, 
        size: file.size, 
        type: file.type 
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    
    if (!image) {
      alert('Please select an image');
      return;
    }

    if (!options.voiceId) {
      alert('Please select a voice');
      return;
    }

    logWithTimestamp('Form submission', { 
      prompt: prompt.substring(0, 100) + '...',
      imageName: image.name,
      options 
    });

    onSubmit({
      prompt: prompt.trim(),
      image,
      options
    });
  };

  const handleOptionChange = (key: keyof ScriptGenerationOptions, value: any) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
    logWithTimestamp('Option changed', { key, value });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">AI Podcast Generator</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt Input */}
        <div>
          <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
            Podcast Topic/Prompt *
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want your podcast to be about..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            disabled={isGenerating}
            required
          />
        </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-2">
            Speaker Image *
          </label>
          <div className="flex items-center space-x-4">
            <input
              ref={fileInputRef}
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isGenerating}
              required
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isGenerating}
            >
              Choose Image
            </button>
            {image && (
              <span className="text-sm text-gray-600">
                {image.name} ({(image.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
          {imagePreview && (
            <div className="mt-2">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-md border"
              />
            </div>
          )}
        </div>


        {/* Target Minutes */}
        <div>
          <label htmlFor="targetMinutes" className="block text-sm font-medium text-gray-700 mb-2">
            Target Duration (minutes)
          </label>
          <input
            type="number"
            id="targetMinutes"
            value={options.targetMinutes}
            onChange={(e) => handleOptionChange('targetMinutes', parseInt(e.target.value))}
            min="1"
            max="60"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isGenerating}
          />
        </div>

        {/* Language */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
            Language
          </label>
          <input
            type="text"
            id="language"
            value={options.language}
            onChange={(e) => handleOptionChange('language', e.target.value)}
            placeholder="e.g., English, Spanish, French"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isGenerating}
          />
        </div>

        {/* Style */}
        <div>
          <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
            Style
          </label>
          <input
            type="text"
            id="style"
            value={options.style}
            onChange={(e) => handleOptionChange('style', e.target.value)}
            placeholder="e.g., Professional and engaging, Casual and friendly"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isGenerating}
          />
        </div>


        {/* Voice Selection */}
        <div>
          <label htmlFor="voice" className="block text-sm font-medium text-gray-700 mb-2">
            Voice Selection *
          </label>
          {isLoadingVoices ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-sm text-gray-600">Loading voices...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <select
                id="voice"
                value={options.voiceId}
                onChange={(e) => handleVoiceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isGenerating}
                required
              >
                <option value="">Select a voice...</option>
                {voices.map((voice) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name} {voice.category && `(${voice.category})`}
                  </option>
                ))}
              </select>
              
              {selectedVoice && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{selectedVoice.name}</h4>
                      {selectedVoice.description && (
                        <p className="text-sm text-gray-600 mt-1">{selectedVoice.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Category: {selectedVoice.category}</span>
                        {selectedVoice.is_verified && (
                          <span className="text-green-600">✓ Verified</span>
                        )}
                      </div>
                    </div>
                    {selectedVoice.preview_url && (
                      <button
                        type="button"
                        onClick={() => playVoicePreview(selectedVoice)}
                        className={`flex items-center px-3 py-1 text-white text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isPlayingPreview 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isPlayingPreview ? (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Stop
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Preview
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generate Video Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="generateVideo"
            checked={options.generateVideo}
            onChange={(e) => handleOptionChange('generateVideo', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={isGenerating}
          />
          <label htmlFor="generateVideo" className="ml-2 block text-sm text-gray-700">
            Generate video with lip-sync
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim() || !image || !options.voiceId}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'Generating...' : 'Generate Podcast'}
        </button>
      </form>
    </div>
  );
}
