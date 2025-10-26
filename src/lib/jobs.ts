import { JobStatus } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { logWithTimestamp } from './utils';

// File-based job storage for Vercel compatibility
const JOBS_DIR = '/tmp/jobs';
const JOBS_FILE = path.join(JOBS_DIR, 'jobs.json');

// Ensure jobs directory exists
async function ensureJobsDir() {
  try {
    await fs.mkdir(JOBS_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Load jobs from file
async function loadJobs(): Promise<Map<string, JobStatus>> {
  try {
    await ensureJobsDir();
    const data = await fs.readFile(JOBS_FILE, 'utf-8');
    const jobsArray = JSON.parse(data);
    return new Map(jobsArray);
  } catch (error) {
    // File doesn't exist or is invalid, return empty map
    return new Map();
  }
}

// Save jobs to file
async function saveJobs(jobs: Map<string, JobStatus>): Promise<void> {
  try {
    await ensureJobsDir();
    const jobsArray = Array.from(jobs.entries());
    await fs.writeFile(JOBS_FILE, JSON.stringify(jobsArray, null, 2));
  } catch (error) {
    logWithTimestamp('Failed to save jobs', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Job storage class
class JobStorage {
  private jobs: Map<string, JobStatus> = new Map();
  private initialized = false;

  private async initialize() {
    if (!this.initialized) {
      this.jobs = await loadJobs();
      this.initialized = true;
    }
  }

  async get(jobId: string): Promise<JobStatus | undefined> {
    await this.initialize();
    return this.jobs.get(jobId);
  }

  async set(jobId: string, status: JobStatus): Promise<void> {
    await this.initialize();
    // Add timestamp if not present
    const statusWithTimestamp = {
      ...status,
      timestamp: status.timestamp || Date.now()
    };
    this.jobs.set(jobId, statusWithTimestamp);
    await saveJobs(this.jobs);
  }

  async delete(jobId: string): Promise<boolean> {
    await this.initialize();
    const deleted = this.jobs.delete(jobId);
    if (deleted) {
      await saveJobs(this.jobs);
    }
    return deleted;
  }

  async has(jobId: string): Promise<boolean> {
    await this.initialize();
    return this.jobs.has(jobId);
  }

  async clear(): Promise<void> {
    await this.initialize();
    this.jobs.clear();
    await saveJobs(this.jobs);
  }
}

// Cleanup old jobs (older than 1 hour)
async function cleanupOldJobs() {
  try {
    await ensureJobsDir();
    const jobs = await loadJobs();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    let cleaned = false;
    for (const [jobId, status] of jobs.entries()) {
      // If job is complete or error and older than 1 hour, remove it
      if ((status.stage === ProcessingStage.COMPLETE || status.stage === ProcessingStage.ERROR) && 
          status.timestamp && (now - status.timestamp) > oneHour) {
        jobs.delete(jobId);
        cleaned = true;
      }
    }
    
    if (cleaned) {
      await saveJobs(jobs);
      logWithTimestamp('Cleaned up old jobs');
    }
  } catch (error) {
    logWithTimestamp('Failed to cleanup old jobs', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldJobs, 10 * 60 * 1000);

// Export singleton instance
export const jobs = new JobStorage();
