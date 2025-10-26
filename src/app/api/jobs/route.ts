import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { JobStatus, ProcessingStage } from '@/lib/types';
import { logWithTimestamp } from '@/lib/utils';

const JOBS_FILE = path.join(process.cwd(), 'public', 'jobs.json');

// Ensure jobs file exists
async function ensureJobsFile() {
  try {
    await fs.access(JOBS_FILE);
  } catch {
    // File doesn't exist, create it
    await fs.writeFile(JOBS_FILE, '{}', 'utf-8');
  }
}

// Load jobs from file
async function loadJobs(): Promise<Record<string, JobStatus>> {
  try {
    await ensureJobsFile();
    const data = await fs.readFile(JOBS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logWithTimestamp('Failed to load jobs', { error: error instanceof Error ? error.message : 'Unknown error' });
    return {};
  }
}

// Save jobs to file
async function saveJobs(jobs: Record<string, JobStatus>): Promise<void> {
  try {
    await ensureJobsFile();
    await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
  } catch (error) {
    logWithTimestamp('Failed to save jobs', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// GET - Retrieve a specific job
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json({
      success: false,
      error: 'Job ID is required'
    }, { status: 400 });
  }
  
  logWithTimestamp('Job retrieval requested', { jobId });
  
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
    
    logWithTimestamp('Job retrieved successfully', { 
      jobId, 
      stage: job.stage,
      progress: job.progress 
    });
    
    return NextResponse.json({
      success: true,
      jobId,
      ...job
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Job retrieval failed', { jobId, error: errorMessage });
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

// POST - Create or update a job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, status } = body;
    
    if (!jobId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Job ID and status are required'
      }, { status: 400 });
    }
    
    logWithTimestamp('Job update requested', { jobId, stage: status.stage });
    
    const jobs = await loadJobs();
    jobs[jobId] = {
      ...status,
      timestamp: status.timestamp || Date.now()
    };
    
    await saveJobs(jobs);
    
    logWithTimestamp('Job updated successfully', { 
      jobId, 
      stage: status.stage,
      totalJobs: Object.keys(jobs).length 
    });
    
    return NextResponse.json({
      success: true,
      jobId,
      message: 'Job updated successfully'
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Job update failed', { error: errorMessage });
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

// DELETE - Remove a job
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  
  if (!jobId) {
    return NextResponse.json({
      success: false,
      error: 'Job ID is required'
    }, { status: 400 });
  }
  
  logWithTimestamp('Job deletion requested', { jobId });
  
  try {
    const jobs = await loadJobs();
    delete jobs[jobId];
    await saveJobs(jobs);
    
    logWithTimestamp('Job deleted successfully', { jobId });
    
    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Job deletion failed', { jobId, error: errorMessage });
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
