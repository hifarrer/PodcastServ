import axios from 'axios';
import { FFmpegSplitResponse, FFmpegMergeResponse, FFmpegJobStatus } from '@/lib/types';
import { logWithTimestamp, sleep } from '@/lib/utils';

const FFMPEGAPI_KEY = process.env.FFMPEGAPI_KEY;

export async function splitAudio(audioUrl: string, parts: number): Promise<FFmpegSplitResponse> {
  logWithTimestamp('Starting audio splitting', { audioUrl, parts });

  if (!FFMPEGAPI_KEY) {
    throw new Error('FFMPEGAPI_KEY not configured');
  }

  try {
    const startTime = Date.now();
    
    const response = await axios.post(
      'https://ffmpegapi.net/api/split_audio',
      {
        audio_url: audioUrl,
        parts: parts
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': FFMPEGAPI_KEY
        },
        timeout: 60000
      }
    );

    const duration = Date.now() - startTime;
    logWithTimestamp('Audio splitting completed', {
      duration: `${duration}ms`,
      parts: response.data.parts,
      success: response.data.success
    });

    return response.data as FFmpegSplitResponse;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response = error && typeof error === 'object' && 'response' in error ? error.response as any : null;
    
    logWithTimestamp('FFmpeg split audio failed', {
      error: errorMessage,
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data
    });
    throw new Error(`Audio splitting failed: ${errorMessage}`);
  }
}

export async function mergeVideos(
  videoUrls: string[], 
  audioUrl: string, 
  options: {
    dimensions?: string;
    subtitleUrl?: string;
    watermarkUrl?: string;
  } = {}
): Promise<FFmpegMergeResponse> {
  logWithTimestamp('Starting video merging', { 
    videoCount: videoUrls.length,
    audioUrl,
    options 
  });

  if (!FFMPEGAPI_KEY) {
    throw new Error('FFMPEGAPI_KEY not configured');
  }

  try {
    const startTime = Date.now();
    
    const response = await axios.post(
      'https://ffmpegapi.net/api/merge_videos',
      {
        video_urls: videoUrls,
        audio_url: audioUrl,
        subtitle_url: options.subtitleUrl,
        watermark_url: options.watermarkUrl,
        dimensions: options.dimensions || '1920x1080',
        async: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': FFMPEGAPI_KEY
        },
        timeout: 30000
      }
    );

    const duration = Date.now() - startTime;
    logWithTimestamp('Video merge job submitted', {
      duration: `${duration}ms`,
      jobId: response.data.job_id,
      status: response.data.status
    });

    return response.data as FFmpegMergeResponse;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response = error && typeof error === 'object' && 'response' in error ? error.response as any : null;
    
    logWithTimestamp('FFmpeg merge videos failed', {
      error: errorMessage,
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data
    });
    throw new Error(`Video merging failed: ${errorMessage}`);
  }
}

export async function pollJobStatus(jobId: string, maxAttempts: number = 60): Promise<FFmpegJobStatus> {
  logWithTimestamp('Starting job status polling', { jobId, maxAttempts });

  if (!FFMPEGAPI_KEY) {
    throw new Error('FFMPEGAPI_KEY not configured');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logWithTimestamp(`Polling job status (attempt ${attempt}/${maxAttempts})`, { jobId });
      
      const response = await axios.get(
        `https://ffmpegapi.net/api/job/${jobId}/status`,
        {
          headers: {
            'X-API-Key': FFMPEGAPI_KEY
          },
          timeout: 10000
        }
      );

      const status = response.data as FFmpegJobStatus;
      logWithTimestamp('Job status response', {
        attempt,
        status: status.status,
        progress: status.progress,
        success: status.success,
        hasDownloadUrl: !!status.download_url
      });

      if (status.success && status.download_url) {
        logWithTimestamp('Job completed successfully', {
          jobId,
          finalStatus: status.status,
          downloadUrl: status.download_url
        });
        return status;
      }

      if (status.error) {
        logWithTimestamp('Job failed with error', { jobId, error: status.error });
        throw new Error(`Job failed: ${status.error}`);
      }

      // Wait before next poll with progressive backoff
      // Start with shorter intervals, increase over time
      if (attempt < maxAttempts) {
        let waitTime: number;
        if (attempt <= 5) {
          waitTime = 3000; // First 5 attempts: 3 seconds (15 sec total)
        } else if (attempt <= 15) {
          waitTime = 5000; // Next 10 attempts: 5 seconds (50 sec total)
        } else if (attempt <= 30) {
          waitTime = 8000; // Next 15 attempts: 8 seconds (120 sec total)
        } else {
          waitTime = 10000; // After that: 10 seconds
        }
        
        logWithTimestamp(`Waiting ${waitTime/1000} seconds before next poll (attempt ${attempt}/${maxAttempts})`);
        await sleep(waitTime);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Error polling job status', {
        attempt,
        jobId,
        error: errorMessage
      });
      
      if (attempt === maxAttempts) {
        throw new Error(`Job polling failed after ${maxAttempts} attempts: ${errorMessage}`);
      }
      
      // Wait before retrying
      await sleep(10000);
    }
  }

  throw new Error(`Job did not complete within ${maxAttempts} attempts (${maxAttempts * 10} seconds)`);
}
