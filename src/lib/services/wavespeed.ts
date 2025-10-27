import axios from 'axios';
import { WavespeedRequest, WavespeedResponse } from '@/lib/types';
import { logWithTimestamp, sleep } from '@/lib/utils';

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY;

// Cache to prevent duplicate API calls with identical parameters
const videoGenerationCache = new Map<string, Promise<string>>();

export async function generateLipsyncVideo(
  audioUrl: string, 
  imageUrl: string, 
  options: {
    prompt?: string;
    resolution?: string;
    seed?: number;
  } = {}
): Promise<string> {
  // Create a cache key based on all parameters
  const cacheKey = JSON.stringify({
    audioUrl,
    imageUrl,
    prompt: options.prompt || '',
    resolution: options.resolution || '480p',
    seed: options.seed || -1
  });

  // Check if we already have a pending or completed request for these exact parameters
  if (videoGenerationCache.has(cacheKey)) {
    logWithTimestamp('Using cached video generation request', { 
      cacheKey,
      audioUrl, 
      imageUrl, 
      options 
    });
    return await videoGenerationCache.get(cacheKey)!;
  }

  logWithTimestamp('Starting Wavespeed video generation', { 
    audioUrl, 
    imageUrl, 
    options,
    cacheKey
  });

  if (!WAVESPEED_API_KEY) {
    throw new Error('WAVESPEED_API_KEY not configured');
  }

  // Create the promise and cache it immediately to prevent duplicate requests
  const videoGenerationPromise = generateVideoInternal(audioUrl, imageUrl, options);
  videoGenerationCache.set(cacheKey, videoGenerationPromise);

  try {
    const result = await videoGenerationPromise;
    return result;
  } catch (error) {
    // Remove from cache on error so it can be retried
    videoGenerationCache.delete(cacheKey);
    throw error;
  }
}

async function generateVideoInternal(
  audioUrl: string, 
  imageUrl: string, 
  options: {
    prompt?: string;
    resolution?: string;
    seed?: number;
  } = {}
): Promise<string> {
  try {
    const startTime = Date.now();
    
    const requestData: WavespeedRequest = {
      audio: audioUrl,
      image: imageUrl,
      prompt: options.prompt || '',
      resolution: options.resolution || '480p',
      seed: options.seed || -1
    };

    logWithTimestamp('Submitting Wavespeed request', requestData);

    const response = await axios.post(
      'https://api.wavespeed.ai/api/v3/wavespeed-ai/infinitetalk',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`
        },
        timeout: 30000
      }
    );

    const duration = Date.now() - startTime;
    // Handle nested data structure in response
    const requestId = response.data.data?.id || response.data.id;
    
    logWithTimestamp('Wavespeed request submitted', {
      duration: `${duration}ms`,
      requestId,
      status: response.data.data?.status || response.data.status,
      fullResponse: response.data
    });

    // Poll for completion
    const result = await pollVideoResult(requestId);
    
    logWithTimestamp('Wavespeed video generation completed', {
      requestId,
      outputUrl: result
    });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response = error && typeof error === 'object' && 'response' in error ? error.response as any : null;
    
    logWithTimestamp('Wavespeed video generation failed', {
      error: errorMessage,
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data
    });
    throw new Error(`Video generation failed: ${errorMessage}`);
  }
}

export async function pollVideoResult(requestId: string, maxAttempts: number = 120): Promise<string> {
  logWithTimestamp('Starting video result polling', { requestId, maxAttempts });

  if (!WAVESPEED_API_KEY) {
    throw new Error('WAVESPEED_API_KEY not configured');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logWithTimestamp(`Polling video result (attempt ${attempt}/${maxAttempts})`, { requestId });
      
    const response = await axios.get(
      `https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`,
      {
        headers: {
          'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

      const result = response.data as any;
      
      // Handle nested data structure - check both direct and nested paths
      const actualData = result.data || result;
      const status = actualData.status;
      const outputs = actualData.outputs || [];
      const error = actualData.error;
      
      logWithTimestamp('Video result response', {
        attempt,
        requestId,
        status,
        hasOutputs: outputs && outputs.length > 0,
        outputCount: outputs?.length || 0,
        hasError: !!error,
        fullResponse: result
      });

      // Debug: Log the exact values we're checking
      logWithTimestamp('Checking completion conditions', {
        requestId,
        status,
        statusIsCompleted: status === 'completed',
        hasOutputs: outputs && outputs.length > 0,
        outputsLength: outputs?.length || 0,
        firstOutput: outputs?.[0]
      });

      // Check if video is completed and has outputs
      if (status === 'completed' && outputs && outputs.length > 0) {
        logWithTimestamp('Video generation completed successfully', {
          requestId,
          outputUrl: outputs[0]
        });
        return outputs[0];
      }

      // Also check if we have outputs even if status is not explicitly 'completed'
      if (outputs && outputs.length > 0) {
        logWithTimestamp('Video generation completed (has outputs)', {
          requestId,
          status,
          outputUrl: outputs[0]
        });
        return outputs[0];
      }

      if (status === 'failed' || error) {
        logWithTimestamp('Video generation failed', { 
          requestId, 
          error: error,
          status: status 
        });
        throw new Error(`Video generation failed: ${error || 'Unknown error'}`);
      }

      // Wait 5 seconds before next poll
      if (attempt < maxAttempts) {
        logWithTimestamp('Waiting 5 seconds before next poll');
        await sleep(5000);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const response = error && typeof error === 'object' && 'response' in error ? error.response as any : null;
      
      logWithTimestamp('Error polling video result', {
        attempt,
        requestId,
        error: errorMessage,
        status: response?.status,
        statusText: response?.statusText,
        data: response?.data
      });
      
      // If we get a 404, it might mean the video is already completed and the endpoint is no longer available
      // In this case, we should try to get the result from the initial response or return an error
      if (response?.status === 404) {
        logWithTimestamp('Received 404 - video may be completed but endpoint unavailable', {
          requestId,
          attempt
        });
        
        // For now, we'll continue polling in case it's a temporary issue
        // In a production system, you might want to implement a different strategy here
      }
      
      if (attempt === maxAttempts) {
        throw new Error(`Video polling failed after ${maxAttempts} attempts: ${errorMessage}`);
      }
      
      // Wait before retrying
      await sleep(5000);
    }
  }

  throw new Error(`Video generation did not complete within ${maxAttempts} attempts (${maxAttempts * 5} seconds)`);
}

export async function generateMultipleVideos(
  audioUrls: string[], 
  imageUrl: string, 
  options: {
    prompt?: string;
    resolution?: string;
    seed?: number;
    delayBetweenRequests?: number;
  } = {}
): Promise<string[]> {
  logWithTimestamp('Starting multiple video generation', { 
    audioCount: audioUrls.length,
    imageUrl,
    options 
  });

  // Deduplicate audio URLs to prevent duplicate API calls
  const uniqueAudioUrls = [...new Set(audioUrls)];
  const audioUrlToIndex = new Map<string, number[]>();
  
  // Map each unique URL to its original indices
  audioUrls.forEach((url, index) => {
    if (!audioUrlToIndex.has(url)) {
      audioUrlToIndex.set(url, []);
    }
    audioUrlToIndex.get(url)!.push(index);
  });

  logWithTimestamp('Audio URL deduplication', {
    originalCount: audioUrls.length,
    uniqueCount: uniqueAudioUrls.length,
    duplicates: audioUrls.length - uniqueAudioUrls.length,
    audioUrlMapping: Array.from(audioUrlToIndex.entries()).map(([url, indices]) => ({
      url,
      indices,
      count: indices.length
    }))
  });

  const results: string[] = new Array(audioUrls.length); // Pre-allocate array
  const delayBetweenRequests = options.delayBetweenRequests || 2000; // 2 seconds default

  // Process only unique audio URLs
  for (let i = 0; i < uniqueAudioUrls.length; i++) {
    try {
      const audioUrl = uniqueAudioUrls[i];
      const originalIndices = audioUrlToIndex.get(audioUrl)!;
      
      logWithTimestamp(`Generating video ${i + 1}/${uniqueAudioUrls.length}`, { 
        audioUrl,
        uniqueIndex: i,
        originalIndices,
        allAudioUrls: audioUrls
      });

      const videoUrl = await generateLipsyncVideo(audioUrl, imageUrl, {
        ...options,
        seed: (options.seed || -1) + i // Vary seed for each unique video
      });

      // Assign the same video URL to all original indices that had this audio URL
      originalIndices.forEach(originalIndex => {
        results[originalIndex] = videoUrl;
      });
      
      logWithTimestamp(`Video ${i + 1} completed`, { 
        videoUrl,
        assignedToIndices: originalIndices,
        originalIndices
      });

      // Add delay between requests to avoid rate limiting
      if (i < uniqueAudioUrls.length - 1) {
        logWithTimestamp(`Waiting ${delayBetweenRequests}ms before next request`);
        await sleep(delayBetweenRequests);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const audioUrl = uniqueAudioUrls[i];
      const originalIndices = audioUrlToIndex.get(audioUrl)!;
      
      logWithTimestamp(`Video ${i + 1} generation failed`, { 
        uniqueIndex: i,
        audioUrl,
        originalIndices,
        error: errorMessage 
      });
      throw new Error(`Video ${i + 1} generation failed: ${errorMessage}`);
    }
  }

  logWithTimestamp('All videos generated successfully', { 
    originalCount: audioUrls.length,
    uniqueCount: uniqueAudioUrls.length,
    resultsCount: results.length,
    urls: results 
  });

  return results;
}
