import axios from 'axios';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { logWithTimestamp } from '@/lib/utils';
import { ElevenLabsVoice } from '@/lib/types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

function getElevenLabsClient() {
  return new ElevenLabsClient({
    apiKey: ELEVENLABS_API_KEY,
    environment: "https://api.elevenlabs.io",
  });
}

export async function generateAudio(ssml: string, voiceId?: string): Promise<Buffer> {
  logWithTimestamp('Starting ElevenLabs audio generation', { 
    ssmlLength: ssml.length,
    voiceId: voiceId
  });

  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  if (!voiceId) {
    throw new Error('Voice ID is required');
  }

  try {
    const startTime = Date.now();
    
    // First, try with the multilingual model
    let response;
    try {
      logWithTimestamp('Attempting with eleven_multilingual_v2 model');
      response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: ssml,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );
      
      logWithTimestamp('eleven_multilingual_v2 model succeeded');
      
    } catch (modelError) {
      const errorMessage = modelError instanceof Error ? modelError.message : 'Unknown error';
      logWithTimestamp('eleven_multilingual_v2 failed, trying eleven_turbo_v2', { error: errorMessage });
      
      // Fallback to turbo model
      response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: ssml,
          model_id: "eleven_turbo_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': ELEVENLABS_API_KEY
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );
      
      logWithTimestamp('eleven_turbo_v2 model succeeded');
    }

    const duration = Date.now() - startTime;
    const audioBuffer = Buffer.from(response.data);
    
    logWithTimestamp('ElevenLabs audio generation completed', {
      duration: `${duration}ms`,
      audioSize: `${(audioBuffer.length / 1024).toFixed(2)}KB`,
      contentType: response.headers['content-type']
    });

    return audioBuffer;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response = error && typeof error === 'object' && 'response' in error ? error.response as any : null;
    
    logWithTimestamp('ElevenLabs API failed', { 
      error: errorMessage,
      status: response?.status,
      statusText: response?.statusText 
    });
    throw new Error(`Audio generation failed: ${errorMessage}`);
  }
}

export async function getVoices(): Promise<ElevenLabsVoice[]> {
  logWithTimestamp('Fetching ElevenLabs voices');
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  try {
    const client = getElevenLabsClient();
    const response = await client.voices.search({
      pageSize: 50,
      sort: 'name',
      sortDirection: 'asc'
    });

    logWithTimestamp('Voices fetched successfully', { 
      count: response.voices.length,
      hasMore: response.hasMore 
    });

    return response.voices.map(voice => ({
      voice_id: voice.voiceId,
      name: voice.name || 'Unknown Voice',
      description: voice.description,
      preview_url: voice.previewUrl,
      category: voice.category || 'unknown',
      settings: {
        stability: voice.settings?.stability || 0.5,
        similarity_boost: voice.settings?.similarityBoost || 0.5,
        style: voice.settings?.style || 0.0,
        use_speaker_boost: voice.settings?.useSpeakerBoost || true
      },
      labels: voice.labels || {},
      sharing: {
        status: voice.sharing?.status || 'disabled',
        public_owner_id: voice.sharing?.publicOwnerId
      },
      high_quality_base_model_ids: voice.highQualityBaseModelIds || [],
      safety_control: voice.safetyControl || 'NONE',
      voice_verification: {
        requires_verification: voice.voiceVerification?.requiresVerification || false,
        is_verified: voice.voiceVerification?.isVerified || false
      },
      is_verified: voice.voiceVerification?.isVerified || false,
      permission_on_resource: voice.permissionOnResource || '',
      is_owner: voice.isOwner || false,
      is_legacy: voice.isLegacy || false,
      is_mixed: voice.isMixed || false,
      favorited_at_unix: voice.favoritedAtUnix,
      created_at_unix: voice.createdAtUnix || 0
    }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Failed to fetch voices', { error: errorMessage });
    throw new Error(`Failed to fetch voices: ${errorMessage}`);
  }
}

export async function getVoice(voiceId: string): Promise<ElevenLabsVoice> {
  logWithTimestamp('Fetching voice details', { voiceId });
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  try {
    const client = getElevenLabsClient();
    const voice = await client.voices.get(voiceId, {});

    logWithTimestamp('Voice details fetched successfully', { 
      voiceId,
      name: voice.name 
    });

    return {
      voice_id: voice.voiceId,
      name: voice.name || 'Unknown Voice',
      description: voice.description,
      preview_url: voice.previewUrl,
      category: voice.category || 'unknown',
      settings: {
        stability: voice.settings?.stability || 0.5,
        similarity_boost: voice.settings?.similarityBoost || 0.5,
        style: voice.settings?.style || 0.0,
        use_speaker_boost: voice.settings?.useSpeakerBoost || true
      },
      labels: voice.labels || {},
      sharing: {
        status: voice.sharing?.status || 'disabled',
        public_owner_id: voice.sharing?.publicOwnerId
      },
      high_quality_base_model_ids: voice.highQualityBaseModelIds || [],
      safety_control: voice.safetyControl || 'NONE',
      voice_verification: {
        requires_verification: voice.voiceVerification?.requiresVerification || false,
        is_verified: voice.voiceVerification?.isVerified || false
      },
      is_verified: voice.voiceVerification?.isVerified || false,
      permission_on_resource: voice.permissionOnResource || '',
      is_owner: voice.isOwner || false,
      is_legacy: voice.isLegacy || false,
      is_mixed: voice.isMixed || false,
      favorited_at_unix: voice.favoritedAtUnix,
      created_at_unix: voice.createdAtUnix || 0
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Failed to fetch voice details', { voiceId, error: errorMessage });
    throw new Error(`Failed to fetch voice details: ${errorMessage}`);
  }
}

export async function uploadAudioToTempStorage(audioBuffer: Buffer): Promise<string> {
  // Import the Cloudinary service
  const { uploadAudioToTempStorage: cloudinaryUpload } = await import('./cloudinary');
  return cloudinaryUpload(audioBuffer);
}
