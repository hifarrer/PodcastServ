import { NextRequest, NextResponse } from 'next/server';
import { logWithTimestamp } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
  logWithTimestamp('Status check requested', { jobId });
  
  try {
    // Call the jobs API directly
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'production'
      ? 'https://www.podcastservice.site'
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/jobs?jobId=${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success) {
      logWithTimestamp('Job status retrieved', { 
        jobId, 
        stage: data.stage,
        progress: data.progress,
        message: data.message,
        hasError: !!data.error
      });
      
      return NextResponse.json({
        success: true,
        jobId,
        ...data
      });
    } else {
      logWithTimestamp('Job not found', { jobId, error: data.error });
      return NextResponse.json({
        success: false,
        error: 'Job not found',
        message: 'Job ID not found or expired'
      }, { status: 404 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Status check failed', { jobId, error: errorMessage });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check job status',
      message: 'Internal server error'
    }, { status: 500 });
  }
}
