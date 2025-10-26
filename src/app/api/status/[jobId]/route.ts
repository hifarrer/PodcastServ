import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '@/lib/jobs';
import { logWithTimestamp } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
  logWithTimestamp('Status check requested', { jobId });
  
  const jobStatus = jobs.get(jobId);
  
  if (!jobStatus) {
    logWithTimestamp('Job not found', { jobId });
    return NextResponse.json({
      success: false,
      error: 'Job not found',
      message: 'Job ID not found or expired'
    }, { status: 404 });
  }
  
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
}
