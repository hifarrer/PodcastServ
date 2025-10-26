import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logWithTimestamp } from '@/lib/utils';

const JOBS_FILE = path.join(process.cwd(), 'public', 'jobs.json');

// Load jobs from file
async function loadJobs(): Promise<Record<string, any>> {
  try {
    const data = await fs.readFile(JOBS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logWithTimestamp('Failed to load jobs', { error: error instanceof Error ? error.message : 'Unknown error' });
    return {};
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  
  logWithTimestamp('Status check requested', { jobId });
  
  try {
    const jobs = await loadJobs();
    const job = jobs[jobId];
    
    if (!job) {
      logWithTimestamp('Job not found', { jobId, availableJobs: Object.keys(jobs) });
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
