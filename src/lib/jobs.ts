import { JobStatus, ProcessingStage } from './types';
import { logWithTimestamp } from './utils';

// In-memory job storage that persists within the same function instance
// This is a workaround for Vercel's read-only file system
const jobStorage = new Map<string, JobStatus>();

// Track if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';

logWithTimestamp('Job storage initialized', { 
  isServerless,
  storageType: 'in-memory'
});

// Job storage class with in-memory operations
class JobStorage {
  async get(jobId: string): Promise<JobStatus | undefined> {
    try {
      logWithTimestamp('Job get requested', { jobId });
      
      const job = jobStorage.get(jobId);
      
      if (job) {
        logWithTimestamp('Job retrieved successfully', { 
          jobId, 
          stage: job.stage,
          progress: job.progress,
          totalJobs: jobStorage.size
        });
        return job;
      } else {
        logWithTimestamp('Job not found', { 
          jobId, 
          availableJobs: Array.from(jobStorage.keys()),
          totalJobs: jobStorage.size
        });
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

      jobStorage.set(jobId, statusWithTimestamp);

      logWithTimestamp('Job updated successfully', { 
        jobId, 
        stage: statusWithTimestamp.stage,
        totalJobs: jobStorage.size 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Job set failed', { jobId, error: errorMessage });
      throw error; // Re-throw to ensure errors are not silently ignored
    }
  }

  async delete(jobId: string): Promise<boolean> {
    try {
      logWithTimestamp('Job deletion requested', { jobId });
      
      const deleted = jobStorage.delete(jobId);

      logWithTimestamp('Job deleted successfully', { jobId, deleted, totalJobs: jobStorage.size });
      return deleted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Job delete failed', { jobId, error: errorMessage });
      return false;
    }
  }

  async has(jobId: string): Promise<boolean> {
    return jobStorage.has(jobId);
  }

  async clear(): Promise<void> {
    try {
      jobStorage.clear();
      logWithTimestamp('All jobs cleared', { totalJobs: jobStorage.size });
    } catch (error) {
      logWithTimestamp('Failed to clear jobs', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

// Export singleton instance
export const jobs = new JobStorage();
