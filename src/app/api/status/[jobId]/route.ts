import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '@/lib/jobs';
import { logWithTimestamp } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
  logWithTimestamp('Status check requested', { jobId });
  
  try {
    const job = await jobs.get(jobId);
    
    if (!job) {
      logWithTimestamp('Job not found', { jobId });
      return NextResponse.json({
        success: false,
        error: 'Job not found',
        message: 'Job ID not found or expired'
      }, { status: 404 });
    }
    
    logWithTimestamp('Job status retrieved', { 
      jobId, 
      stage: job.stage,
      progress: job.progress,
      message: job.message,
      hasError: !!job.error
    });
    
    return NextResponse.json({
      success: true,
      jobId,
      ...job
    });
    
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
