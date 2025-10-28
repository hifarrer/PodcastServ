import { NextRequest, NextResponse } from 'next/server';
import { generateScript } from '@/lib/services/openai';
import { generateJobId, logWithTimestamp } from '@/lib/utils';
import { ProcessingStage, ScriptGenerationOptions } from '@/lib/types';
import { jobs } from '@/lib/jobs';

export async function POST(request: NextRequest) {
  const jobId = generateJobId();
  
  try {
    logWithTimestamp('Starting podcast creation job', { jobId });
    
    // Parse JSON request body
    const body = await request.json();
    const { 
      prompt, 
      speaker_image_url, 
      duration, 
      language, 
      style, 
      voice_id,
      mode = "SUMMARY",
      twoSpeakers = false,
      speakerNameA = "Host",
      speakerNameB = "Guest"
    } = body;
    
    // Validate required fields
    if (!prompt || !speaker_image_url || !voice_id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: prompt, speaker_image_url, and voice_id are required'
      }, { status: 400 });
    }
    
    // Initialize job status
    await jobs.set(jobId, {
      stage: ProcessingStage.SCRIPT,
      progress: 0,
      message: 'Starting podcast creation...'
    });
    
    // Create options object
    const options: ScriptGenerationOptions = {
      mode: mode as "SUMMARY" | "READTHROUGH" | "DISCUSSION",
      targetMinutes: duration || 2,
      language: language || "English",
      style: style || "Professional",
      voiceId: voice_id,
      twoSpeakers,
      speakerNameA,
      speakerNameB,
      generateVideo: true
    };
    
    logWithTimestamp('Job parameters received', { 
      jobId, 
      promptLength: prompt.length,
      speakerImageUrl: speaker_image_url,
      options 
    });
    
    // Stage 1: Script Generation
    logWithTimestamp('Stage 1: Script Generation - Starting', { jobId });
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
    
    await jobs.set(jobId, {
      stage: ProcessingStage.AUDIO,
      progress: 20,
      message: 'Script generated successfully! Audio generation will continue in the background.',
      scriptResult
    });
    
    // Return success response with job ID for status checking
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Podcast creation started successfully!',
      stage: 'AUDIO',
      progress: 20,
      scriptResult: {
        title: scriptResult.title,
        chapters: scriptResult.chapters,
        show_notes: scriptResult.show_notes,
        estimated_wpm: scriptResult.estimated_wpm,
        speaker_names: scriptResult.speaker_names,
        turns: scriptResult.turns.slice(0, 3) // Return first 3 turns as preview
      },
      statusUrl: `/api/status/${jobId}`
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Podcast creation failed', { jobId, error: errorMessage });
    
    await jobs.set(jobId, {
      stage: ProcessingStage.ERROR,
      progress: 0,
      message: `Creation failed: ${errorMessage}`,
      error: errorMessage
    });
    
    return NextResponse.json({
      success: false,
      jobId,
      error: errorMessage,
      message: 'Podcast creation failed'
    }, { status: 500 });
  }
}

// Optional: Add GET method to show API documentation
export async function GET() {
  return NextResponse.json({
    message: "Podcast Creation API",
    description: "Create podcast episodes with AI-generated scripts and audio",
    endpoint: "POST /api/create-podcast",
    requiredFields: {
      prompt: "string - The topic or content for the podcast",
      speaker_image_url: "string - URL of the speaker's image",
      voice_id: "string - ElevenLabs voice ID for audio generation"
    },
    optionalFields: {
      duration: "number - Duration in minutes (default: 2)",
      language: "string - Language for the podcast (default: 'English')",
      style: "string - Style of the podcast (default: 'Professional')",
      mode: "string - 'SUMMARY', 'READTHROUGH', or 'DISCUSSION' (default: 'SUMMARY')",
      twoSpeakers: "boolean - Whether to use two speakers (default: false)",
      speakerNameA: "string - Name of first speaker (default: 'Host')",
      speakerNameB: "string - Name of second speaker (default: 'Guest')"
    },
    response: {
      success: "boolean",
      jobId: "string - Use this to check status",
      message: "string",
      stage: "string - Current processing stage",
      progress: "number - Progress percentage",
      scriptResult: "object - Generated script preview",
      statusUrl: "string - URL to check job status"
    },
    statusCheck: "GET /api/status/{jobId} - Check job progress and results"
  });
}
