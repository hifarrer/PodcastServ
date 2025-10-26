import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logWithTimestamp } from '@/lib/utils';

const JOBS_FILE = path.join(process.cwd(), 'public', 'jobs.json');

export async function GET() {
  try {
    logWithTimestamp('Testing jobs file access');
    
    // Check if file exists
    try {
      await fs.access(JOBS_FILE);
      logWithTimestamp('Jobs file exists');
    } catch {
      logWithTimestamp('Jobs file does not exist, creating it');
      await fs.writeFile(JOBS_FILE, '{}', 'utf-8');
    }
    
    // Read the file
    const data = await fs.readFile(JOBS_FILE, 'utf-8');
    const jobs = JSON.parse(data);
    
    logWithTimestamp('Jobs file contents', { 
      filePath: JOBS_FILE,
      content: data,
      jobCount: Object.keys(jobs).length,
      jobs: Object.keys(jobs)
    });
    
    return NextResponse.json({
      success: true,
      filePath: JOBS_FILE,
      content: data,
      jobCount: Object.keys(jobs).length,
      jobs: Object.keys(jobs)
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logWithTimestamp('Test jobs failed', { error: errorMessage });
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
