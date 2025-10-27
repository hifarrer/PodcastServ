import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '@/lib/jobs';
import { logWithTimestamp } from '@/lib/utils';
import { JobStatus } from '@/lib/types';

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
    
    // Check if job is a JobStatus object or a string
    if (typeof job === 'string') {
      logWithTimestamp('Job is a string value (likely cached data)', { jobId, value: job });
      return NextResponse.json({
        success: true,
        jobId,
        value: job,
        message: 'This appears to be cached data, not a job status'
      });
    }
    
    // job is a JobStatus object
    const jobStatus = job as JobStatus;
    logWithTimestamp('Job status retrieved', { 
      jobId, 
      stage: jobStatus.stage,
      progress: jobStatus.progress,
      message: jobStatus.message,
      hasError: !!jobStatus.error
    });
    
    return NextResponse.json({
      success: true,
      jobId,
      ...jobStatus
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
