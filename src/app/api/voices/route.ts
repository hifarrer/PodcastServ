import { NextRequest, NextResponse } from 'next/server';
import { getVoices } from '@/lib/services/elevenlabs';
import { logWithTimestamp } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    logWithTimestamp('Fetching voices list');
    
    const voices = await getVoices();
    
    logWithTimestamp('Voices list retrieved successfully', { 
      count: voices.length 
    });

    return NextResponse.json({
      success: true,
      voices
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Failed to fetch voices', { error: errorMessage });
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: 'Failed to fetch voices'
    }, { status: 500 });
  }
}
