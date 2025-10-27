import { NextRequest, NextResponse } from 'next/server';
import { generateAudio, uploadAudioToTempStorage } from '@/lib/services/elevenlabs';
import { splitAudio, mergeVideos, pollJobStatus } from '@/lib/services/ffmpeg';
import { generateMultipleVideos } from '@/lib/services/wavespeed';
import { uploadImageToTempStorage } from '@/lib/services/cloudinary';
import { logWithTimestamp } from '@/lib/utils';
import { ProcessingStage, JobStatus, ScriptGenerationOptions } from '@/lib/types';
import { jobs } from '@/lib/jobs';

export async function POST(request: NextRequest) {
  let jobId: string | null = null;
  
  try {
    const { jobId: requestJobId, scriptResult, imageFile, options } = await request.json();
    jobId = requestJobId;
    
    if (!jobId || !scriptResult || !imageFile || !options) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    logWithTimestamp('Continuing podcast generation', { jobId });

    // ATOMIC LOCK: Try to acquire a distributed lock for this job
    const lockAcquired = await jobs.acquireLock(jobId, 600); // 10 minute TTL
    
    if (!lockAcquired) {
      logWithTimestamp('REJECTED: Job is already being processed by another request', { jobId });
      return NextResponse.json({
        success: false,
        error: 'This job is already being processed. Please wait for the current process to complete.',
        code: 'JOB_LOCKED'
      }, { status: 409 }); // 409 Conflict
    }

    logWithTimestamp('Lock acquired successfully - proceeding with job', { jobId });

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
    
    logWithTimestamp('Stage 3: Audio Splitting - Completed', { 
      jobId,
      segmentsCount,
      audioPartsCount: audioParts.length,
      audioParts: audioParts,
      splitResult: splitResult
    });

    await jobs.set(jobId, {
      stage: ProcessingStage.VIDEO_GENERATION,
      progress: 40,
      message: 'Generating video segments...',
      audioParts
    });

    // Stage 4: Video Generation (start only)
    logWithTimestamp('Stage 4: Video Generation - Starting', { jobId });
    
    const imageBuffer = Buffer.from(imageFile.data, 'base64');
    const imageUrl = await uploadImageToTempStorage(imageBuffer, imageFile.name);
    
    logWithTimestamp('Image uploaded to Cloudinary', { imageUrl });
    
    await jobs.set(jobId, {
      stage: ProcessingStage.VIDEO_GENERATION,
      progress: 40,
      message: 'Generating video segments...',
      audioParts,
      imageUrl
    });

    // Stage 4: Video Generation
    logWithTimestamp('Stage 4: Video Generation - Starting', { 
      jobId,
      audioPartsCount: audioParts.length,
      audioParts: audioParts,
      imageUrl,
      style: options.style
    });
    
    const videoUrls = await generateMultipleVideos(audioParts, imageUrl, {
      prompt: options.style,
      resolution: '480p',
      concurrencyLimit: 8 // Process up to 8 videos in parallel
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

    // Poll for merge completion with progress updates
    logWithTimestamp('Polling for merge completion', { jobId, mergeJobId: mergeResult.job_id });
    
    // Create a polling wrapper that updates progress
    let pollAttempt = 0;
    const pollWithProgress = async () => {
      const pollInterval = setInterval(async () => {
        pollAttempt++;
        if (pollAttempt % 3 === 0 && jobId) { // Update every 3 attempts
          const progressPercent = Math.min(70 + Math.floor(pollAttempt / 2), 95);
          await jobs.set(jobId, {
            stage: ProcessingStage.VIDEO_MERGE,
            progress: progressPercent,
            message: `Merging videos... (${Math.floor(pollAttempt * 5)}s elapsed)`,
            mergeJobId: mergeResult.job_id
          });
        }
      }, 5000);

      try {
        const result = await pollJobStatus(mergeResult.job_id);
        clearInterval(pollInterval);
        return result;
      } catch (error) {
        clearInterval(pollInterval);
        throw error;
      }
    };
    
    const finalResult = await pollWithProgress();
    
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

    // Release the lock after successful completion
    await jobs.releaseLock(jobId);

    // Return success with final video URL
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
        
        // Release the lock on error
        await jobs.releaseLock(jobId);
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
