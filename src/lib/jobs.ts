import { JobStatus, ProcessingStage } from './types';
import { logWithTimestamp } from './utils';

// Global job storage that persists across function invocations
// This is a workaround for Vercel's serverless limitations
declare global {
  var __jobStorage: Map<string, JobStatus> | undefined;
}

// Use global storage if available, otherwise create new Map
const jobStorage = globalThis.__jobStorage || new Map<string, JobStatus>();
if (!globalThis.__jobStorage) {
  globalThis.__jobStorage = jobStorage;
}

// Job storage class with simple in-memory operations
class JobStorage {
  async get(jobId: string): Promise<JobStatus | undefined> {
    const status = jobStorage.get(jobId);
    logWithTimestamp('Job get requested', { 
      jobId, 
      found: !!status, 
      stage: status?.stage,
      totalJobs: jobStorage.size 
    });
    return status;
  }

  async set(jobId: string, status: JobStatus): Promise<void> {
    // Add timestamp if not present
    const statusWithTimestamp = {
      ...status,
      timestamp: status.timestamp || Date.now()
    };
    jobStorage.set(jobId, statusWithTimestamp);
    logWithTimestamp('Job set requested', { 
      jobId, 
      stage: statusWithTimestamp.stage,
      progress: statusWithTimestamp.progress,
      totalJobs: jobStorage.size 
    });
  }

  async delete(jobId: string): Promise<boolean> {
    const deleted = jobStorage.delete(jobId);
    logWithTimestamp('Job deleted', { jobId, deleted, totalJobs: jobStorage.size });
    return deleted;
  }

  async has(jobId: string): Promise<boolean> {
    return jobStorage.has(jobId);
  }

  async clear(): Promise<void> {
    jobStorage.clear();
    logWithTimestamp('All jobs cleared');
  }
}

// Cleanup old jobs (older than 1 hour)
function cleanupOldJobs() {
  try {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    let cleaned = false;
    for (const [jobId, status] of jobStorage.entries()) {
      // If job is complete or error and older than 1 hour, remove it
      if ((status.stage === ProcessingStage.COMPLETE || status.stage === ProcessingStage.ERROR) && 
          status.timestamp && (now - status.timestamp) > oneHour) {
        jobStorage.delete(jobId);
        cleaned = true;
      }
    }
    
    if (cleaned) {
      logWithTimestamp('Cleaned up old jobs', { remainingJobs: jobStorage.size });
    }
  } catch (error) {
    logWithTimestamp('Failed to cleanup old jobs', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldJobs, 10 * 60 * 1000);

// Export singleton instance
export const jobs = new JobStorage();
