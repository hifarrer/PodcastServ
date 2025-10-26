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

    // Stage 4: Video Generation (start only)
    logWithTimestamp('Stage 4: Video Generation - Starting', { jobId });
    
    const imageBuffer = Buffer.from(imageFile.data, 'base64');
    const imageUrl = await uploadImageToTempStorage(imageBuffer, imageFile.name);
    
    await jobs.set(jobId, {
      stage: ProcessingStage.VIDEO_GENERATION,
      progress: 40,
      message: 'Generating video segments...',
      audioParts,
      imageUrl
    });

    // Return early to avoid timeout, let frontend continue
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Audio processing completed! Video generation will continue.',
      stage: 'VIDEO_GENERATION',
      progress: 40,
      audioParts,
      imageUrl
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Continue processing failed', { error: errorMessage });
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: 'Continue processing failed'
    }, { status: 500 });
  }
}
