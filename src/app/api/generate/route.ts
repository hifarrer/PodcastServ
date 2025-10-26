import { NextRequest, NextResponse } from 'next/server';
import { generateScript } from '@/lib/services/openai';
import { generateAudio, uploadAudioToTempStorage } from '@/lib/services/elevenlabs';
import { splitAudio, mergeVideos, pollJobStatus } from '@/lib/services/ffmpeg';
import { generateMultipleVideos } from '@/lib/services/wavespeed';
import { uploadImageToTempStorage } from '@/lib/services/cloudinary';
import { generateJobId, logWithTimestamp } from '@/lib/utils';
import { ProcessingStage, JobStatus, ScriptGenerationOptions } from '@/lib/types';
import { jobs } from '@/lib/jobs';

// Background processing function
async function processPodcastGeneration(jobId: string, prompt: string, imageFile: File, options: ScriptGenerationOptions) {
  try {
    logWithTimestamp('Starting background podcast generation', { jobId });
    
    // Stage 1: Script Generation
    logWithTimestamp('Stage 1: Script Generation', { jobId });
    await jobs.set(jobId, {
      stage: ProcessingStage.SCRIPT,
      progress: 10,
      message: 'Generating podcast script...'
    });

    const scriptResult = await generateScript(prompt, options);
    logWithTimestamp('Script generation completed', { 
      jobId, 
      title: scriptResult.title,
      chapters: scriptResult.chapters.length,
      turns: scriptResult.turns.length 
    });

    const currentStatus = await jobs.get(jobId);
    await jobs.set(jobId, {
      ...currentStatus!,
      stage: ProcessingStage.AUDIO,
      progress: 20,
      message: 'Generating audio...',
      scriptResult
    });

    // Stage 2: Audio Generation
    logWithTimestamp('Stage 2: Audio Generation', { jobId });
    const audioBuffer = await generateAudio(scriptResult.ssml, options.voiceId);
    const audioUrl = await uploadAudioToTempStorage(audioBuffer);
    
    logWithTimestamp('Audio generation completed', { 
      jobId, 
      audioSize: `${(audioBuffer.length / 1024).toFixed(2)}KB`,
      audioUrl 
    });

    const currentStatus = await jobs.get(jobId);
    await jobs.set(jobId, {
      ...currentStatus!,
      stage: ProcessingStage.SPLIT,
      progress: 30,
      message: 'Splitting audio into segments...',
      audioUrl
    });

    // Stage 3: Audio Splitting
    logWithTimestamp('Stage 3: Audio Splitting', { jobId });
    
    // Calculate number of 30-second segments based on target duration
    const targetDurationSeconds = (options.targetMinutes || 5) * 60;
    const segmentsCount = Math.ceil(targetDurationSeconds / 30);
    
    logWithTimestamp('Calculating audio segments', { 
      targetMinutes: options.targetMinutes,
      targetDurationSeconds,
      segmentsCount 
    });
    
    const splitResult = await splitAudio(audioUrl, segmentsCount);
    const audioParts = splitResult.audio_parts.map(part => part.download_url);
    
    logWithTimestamp('Audio splitting completed', { 
      jobId, 
      parts: splitResult.parts,
      audioParts 
    });

    const currentStatus = await jobs.get(jobId);
    await jobs.set(jobId, {
      ...currentStatus!,
      stage: ProcessingStage.VIDEO_GENERATION,
      progress: 40,
      message: 'Generating video segments...',
      audioParts
    });

    // Stage 4: Video Generation
    logWithTimestamp('Stage 4: Video Generation', { jobId });
    
    // Upload image to Cloudinary
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
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

    const currentStatus = await jobs.get(jobId);
    await jobs.set(jobId, {
      ...currentStatus!,
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

    const currentStatus = await jobs.get(jobId);
    await jobs.set(jobId, {
      ...currentStatus!,
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
    const currentStatus = await jobs.get(jobId);
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

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logWithTimestamp('Background job failed', { jobId, error: errorMessage, stack: errorStack });
    
    const currentStatus = await jobs.get(jobId);
    await jobs.set(jobId, {
      stage: ProcessingStage.ERROR,
      progress: 0,
      message: `Generation failed: ${errorMessage}`,
      error: errorMessage
    });
  }
}

export async function POST(request: NextRequest) {
  const jobId = generateJobId();
  
  try {
    logWithTimestamp('Starting podcast generation job', { jobId });
    
    // Initialize job status
    await jobs.set(jobId, {
      stage: ProcessingStage.SCRIPT,
      progress: 0,
      message: 'Starting script generation...'
    });

    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    const imageFile = formData.get('image') as File;
    const optionsJson = formData.get('options') as string;
    
    if (!prompt || !imageFile || !optionsJson) {
      throw new Error('Missing required fields: prompt, image, or options');
    }

    const options: ScriptGenerationOptions = JSON.parse(optionsJson);
    logWithTimestamp('Job parameters received', { 
      jobId, 
      promptLength: prompt.length,
      imageName: imageFile.name,
      imageSize: imageFile.size,
      options 
    });

    // Start background processing (don't await)
    processPodcastGeneration(jobId, prompt, imageFile, options).catch(error => {
      logWithTimestamp('Unhandled error in background processing', { jobId, error });
    });

    // Return immediately with jobId
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Podcast generation started successfully!'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logWithTimestamp('Job initialization failed', { jobId, error: errorMessage });
    
    await jobs.set(jobId, {
      stage: ProcessingStage.ERROR,
      progress: 0,
      message: `Generation failed: ${errorMessage}`,
      error: errorMessage
    });

    return NextResponse.json({
      success: false,
      jobId,
      error: errorMessage,
      message: 'Podcast generation failed to start'
    }, { status: 500 });
  }
}

