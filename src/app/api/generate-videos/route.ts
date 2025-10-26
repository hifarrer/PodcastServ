import { NextRequest, NextResponse } from 'next/server';
import { generateMultipleVideos } from '@/lib/services/wavespeed';
import { mergeVideos, pollJobStatus } from '@/lib/services/ffmpeg';
import { logWithTimestamp } from '@/lib/utils';
import { ProcessingStage } from '@/lib/types';
import { jobs } from '@/lib/jobs';

export async function POST(request: NextRequest) {
  try {
    const { jobId, audioParts, imageUrl, audioUrl, options } = await request.json();
    
    if (!jobId || !audioParts || !imageUrl || !audioUrl || !options) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    logWithTimestamp('Starting video generation', { jobId });

    // Stage 4: Video Generation
    logWithTimestamp('Stage 4: Video Generation - Generating videos', { jobId });
    
    const videoUrls = await generateMultipleVideos(audioParts, imageUrl, {
      prompt: options.style,
      resolution: '480p',
      delayBetweenRequests: 2000
    });
    
    logWithTimestamp('Stage 4: Video Generation - Completed', { jobId });

    await jobs.set(jobId, {
      stage: ProcessingStage.VIDEO_MERGE,
      progress: 60,
      message: 'Merging video segments...',
      videoParts: videoUrls
    });

    // Stage 5: Video Merging
    logWithTimestamp('Stage 5: Video Merging - Starting', { jobId });
    const mergeResult = await mergeVideos(videoUrls, audioUrl, {
      dimensions: '1920x1080'
    });

    await jobs.set(jobId, {
      stage: ProcessingStage.VIDEO_MERGE,
      progress: 70,
      message: 'Waiting for video merge to complete...',
      mergeJobId: mergeResult.job_id
    });

    // Poll for merge completion
    logWithTimestamp('Stage 5: Video Merging - Polling for completion', { jobId });
    const finalResult = await pollJobStatus(mergeResult.job_id);

    // Stage 6: Complete
    await jobs.set(jobId, {
      stage: ProcessingStage.COMPLETE,
      progress: 100,
      message: 'Podcast generation completed successfully!',
      videoUrl: finalResult.download_url
    });

    logWithTimestamp('Podcast generation completed', { jobId });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Podcast generation completed successfully!',
      videoUrl: finalResult.download_url
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Video generation failed', { error: errorMessage });
    
    // Update job status to error
    try {
      await jobs.set(jobId, {
        stage: ProcessingStage.ERROR,
        progress: 0,
        message: `Video generation failed: ${errorMessage}`,
        error: errorMessage
      });
    } catch (setError) {
      logWithTimestamp('Failed to set error status', { jobId, error: setError });
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: 'Video generation failed'
    }, { status: 500 });
  }
}
