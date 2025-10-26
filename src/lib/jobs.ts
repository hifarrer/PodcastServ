import { JobStatus, ProcessingStage } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { logWithTimestamp } from './utils';

const JOBS_FILE = path.join(process.cwd(), 'public', 'jobs.json');

// Log the file path for debugging
console.log('Jobs file path:', JOBS_FILE);

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

// Job storage class with direct file operations
class JobStorage {
  async get(jobId: string): Promise<JobStatus | undefined> {
    try {
      logWithTimestamp('Job get requested', { jobId });
      
      const jobs = await loadJobs();
      const job = jobs[jobId];
      
      if (job) {
        logWithTimestamp('Job retrieved successfully', { 
          jobId, 
          stage: job.stage,
          progress: job.progress 
        });
        return job;
      } else {
        logWithTimestamp('Job not found', { jobId, availableJobs: Object.keys(jobs) });
        return undefined;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Job get failed', { jobId, error: errorMessage });
      return undefined;
    }
  }

  async set(jobId: string, status: JobStatus): Promise<void> {
    try {
      const statusWithTimestamp = {
        ...status,
        timestamp: status.timestamp || Date.now()
      };

      logWithTimestamp('Job set requested', { 
        jobId, 
        stage: statusWithTimestamp.stage,
        progress: statusWithTimestamp.progress 
      });

      const jobs = await loadJobs();
      jobs[jobId] = statusWithTimestamp;
      await saveJobs(jobs);

      logWithTimestamp('Job updated successfully', { 
        jobId, 
        stage: statusWithTimestamp.stage,
        totalJobs: Object.keys(jobs).length 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Job set failed', { jobId, error: errorMessage });
    }
  }

  async delete(jobId: string): Promise<boolean> {
    try {
      logWithTimestamp('Job deletion requested', { jobId });
      
      const jobs = await loadJobs();
      delete jobs[jobId];
      await saveJobs(jobs);

      logWithTimestamp('Job deleted successfully', { jobId });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Job delete failed', { jobId, error: errorMessage });
      return false;
    }
  }

  async has(jobId: string): Promise<boolean> {
    const status = await this.get(jobId);
    return !!status;
  }

  async clear(): Promise<void> {
    try {
      await saveJobs({});
      logWithTimestamp('All jobs cleared');
    } catch (error) {
      logWithTimestamp('Failed to clear jobs', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

// Export singleton instance
export const jobs = new JobStorage();
