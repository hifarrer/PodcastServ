import { NextRequest, NextResponse } from 'next/server';
import { getVoice } from '@/lib/services/elevenlabs';
import { logWithTimestamp } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const { voiceId } = await params;
  
  try {
    logWithTimestamp('Fetching voice details', { voiceId });
    
    const voice = await getVoice(voiceId);
    
    logWithTimestamp('Voice details retrieved successfully', { 
      voiceId,
      name: voice.name 
    });

    return NextResponse.json({
      success: true,
      voice
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Failed to fetch voice details', { voiceId, error: errorMessage });
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      message: 'Failed to fetch voice details'
    }, { status: 500 });
  }
}
