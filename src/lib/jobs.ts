import { JobStatus, ProcessingStage } from './types';
import { logWithTimestamp } from './utils';

// Job storage class that uses the jobs API
class JobStorage {
  private baseUrl: string;

  constructor() {
    // Use the same domain for API calls
    this.baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'production'
      ? 'https://www.podcastservice.site'
      : 'http://localhost:3000';
  }

  async get(jobId: string): Promise<JobStatus | undefined> {
    try {
      logWithTimestamp('Job get requested', { jobId });
      
      const response = await fetch(`${this.baseUrl}/api/jobs?jobId=${jobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        logWithTimestamp('Job retrieved successfully', { 
          jobId, 
          stage: data.stage,
          progress: data.progress 
        });
        return data;
      } else {
        logWithTimestamp('Job not found', { jobId, error: data.error });
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

      const response = await fetch(`${this.baseUrl}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          status: statusWithTimestamp
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        logWithTimestamp('Job updated successfully', { jobId, stage: statusWithTimestamp.stage });
      } else {
        logWithTimestamp('Job update failed', { jobId, error: data.error });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Job set failed', { jobId, error: errorMessage });
    }
  }

  async delete(jobId: string): Promise<boolean> {
    try {
      logWithTimestamp('Job deletion requested', { jobId });
      
      const response = await fetch(`${this.baseUrl}/api/jobs?jobId=${jobId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        logWithTimestamp('Job deleted successfully', { jobId });
        return true;
      } else {
        logWithTimestamp('Job deletion failed', { jobId, error: data.error });
        return false;
      }
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
    logWithTimestamp('Job clear requested - not implemented for API storage');
  }
}

// Export singleton instance
export const jobs = new JobStorage();
