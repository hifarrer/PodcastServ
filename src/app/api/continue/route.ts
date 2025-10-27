import { NextRequest, NextResponse } from 'next/server';
import { generateAudio, uploadAudioToTempStorage } from '@/lib/services/elevenlabs';
import { splitAudio, mergeVideos, pollJobStatus } from '@/lib/services/ffmpeg';
import { generateMultipleVideos } from '@/lib/services/wavespeed';
import { uploadImageToTempStorage } from '@/lib/services/cloudinary';
import { logWithTimestamp } from '@/lib/utils';
import { ProcessingStage, JobStatus, ScriptGenerationOptions } from '@/lib/types';
import { jobs } from '@/lib/jobs';

export async function POST(request: NextRequest) {
  try {
    const { jobId, scriptResult, imageFile, options } = await request.json();
    
    if (!jobId || !scriptResult || !imageFile || !options) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    logWithTimestamp('Continuing podcast generation', { jobId });

    // Stage 2: Audio Generation
    logWithTimestamp('Stage 2: Audio Generation - Starting', { jobId });
    await jobs.set(jobId, {
      stage: ProcessingStage.AUDIO,
      progress: 20,
      message: 'Generating audio...',
      scriptResult
    });

    const audioBuffer = await generateAudio(scriptResult.ssml, options.voiceId);
    const audioUrl = await uploadAudioToTempStorage(audioBuffer);
    
    logWithTimestamp('Stage 2: Audio Generation - Completed', { jobId });

    await jobs.set(jobId, {
      stage: ProcessingStage.SPLIT,
      progress: 30,
      message: 'Splitting audio into segments...',
      audioUrl
    });

    // Stage 3: Audio Splitting
    logWithTimestamp('Stage 3: Audio Splitting - Starting', { jobId });
    
    const targetDurationSeconds = (options.targetMinutes || 5) * 60;
    const segmentsCount = Math.ceil(targetDurationSeconds / 30);
    
    const splitResult = await splitAudio(audioUrl, segmentsCount);
    const audioParts = splitResult.audio_parts.map(part => part.download_url);
    
    logWithTimestamp('Stage 3: Audio Splitting - Completed', { jobId });

    await jobs.set(jobId, {
      stage: ProcessingStage.VIDEO_GENERATION,
      progress: 40,
      message: 'Generating video segments...',
      audioParts
    });

    // Stage 4: Video Generation
    logWithTimestamp('Stage 4: Video Generation - Starting', { jobId });
    
    const imageBuffer = Buffer.from(imageFile.data, 'base64');
    const imageUrl = await uploadImageToTempStorage(imageBuffer, imageFile.name);
    
    logWithTimestamp('Image uploaded to Cloudinary', { imageUrl });
    
    const videoUrls = await generateMultipleVideos(audioParts, imageUrl, {
      prompt: options.style,
      resolution: '480p',
      delayBetweenRequests: 2000
    });
    
    logWithTimestamp('Video generation completed', { 
      jobId, 
      videoCount: videoUrls.length,
      videoUrls 
    });

    await jobs.set(jobId, {
      stage: ProcessingStage.VIDEO_MERGE,
      progress: 60,
      message: 'Merging video segments...',
      videoParts: videoUrls
    });

    // Stage 5: Video Merging
    logWithTimestamp('Stage 5: Video Merging', { jobId });
    const mergeResult = await mergeVideos(videoUrls, audioUrl, {
      dimensions: '1920x1080'
    });
    
    logWithTimestamp('Video merge job submitted', { 
      jobId, 
      mergeJobId: mergeResult.job_id 
    });

    await jobs.set(jobId, {
      stage: ProcessingStage.VIDEO_MERGE,
      progress: 70,
      message: 'Waiting for video merge to complete...',
      mergeJobId: mergeResult.job_id
    });

    // Poll for merge completion
    logWithTimestamp('Polling for merge completion', { jobId, mergeJobId: mergeResult.job_id });
    const finalResult = await pollJobStatus(mergeResult.job_id);
    
    logWithTimestamp('Video merge completed', { 
      jobId, 
      finalVideoUrl: finalResult.download_url 
    });

    // Stage 6: Complete
    await jobs.set(jobId, {
      stage: ProcessingStage.COMPLETE,
      progress: 100,
      message: 'Podcast generation completed successfully!',
      videoUrl: finalResult.download_url
    });

    logWithTimestamp('Job completed successfully', { 
      jobId, 
      finalVideoUrl: finalResult.download_url 
    });

    // Return success with final result
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Podcast generation completed successfully!',
      stage: 'COMPLETE',
      progress: 100,
      videoUrl: finalResult.download_url
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Continue processing failed', { error: errorMessage });
    
    // Update job status to error
    if (jobId) {
      try {
        await jobs.set(jobId, {
          stage: ProcessingStage.ERROR,
          progress: 0,
          message: `Processing failed: ${errorMessage}`,
          error: errorMessage
        });
      } catch (jobUpdateError) {
        logWithTimestamp('Failed to update job status with error', { 
          jobId, 
          error: jobUpdateError instanceof Error ? jobUpdateError.message : 'Unknown error' 
        });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: 'Continue processing failed'
    }, { status: 500 });
  }
}
