import { JobStatus, ProcessingStage } from './types';
import { logWithTimestamp } from './utils';
import { createClient } from 'redis';

// Create Redis client
const redisUrl = process.env.REDIS_URL;
logWithTimestamp('Redis configuration', { 
  redisUrl: redisUrl ? 'configured' : 'missing',
  urlPreview: redisUrl ? redisUrl.substring(0, 20) + '...' : 'none'
});

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is not set');
}

const redis = createClient({
  url: redisUrl
});

// Connect to Redis
redis.on('error', (err) => {
  logWithTimestamp('Redis Client Error', { error: err.message });
});

redis.on('connect', () => {
  logWithTimestamp('Redis Client Connected');
});

// Connect to Redis
redis.connect().catch((err) => {
  logWithTimestamp('Redis Connection Failed', { error: err.message });
});

logWithTimestamp('Job storage initialized', { 
  storageType: 'redis',
  redisUrl: 'configured'
});

// Job storage class with Redis operations
class JobStorage {
  async get(jobId: string): Promise<JobStatus | string | undefined> {
    try {
      logWithTimestamp('Job get requested', { jobId });
      
      const jobData = await redis.get(`job:${jobId}`);
      
      if (jobData) {
        // Try to parse as JobStatus first, fallback to string
        try {
          const job = JSON.parse(jobData) as JobStatus;
          if (job.stage && job.progress !== undefined) {
            logWithTimestamp('Job retrieved successfully', { 
              jobId, 
              stage: job.stage,
              progress: job.progress
            });
            return job;
          }
        } catch {
          // If parsing fails or doesn't look like JobStatus, return as string
          logWithTimestamp('String value retrieved successfully', { jobId });
          return jobData;
        }
      } else {
        logWithTimestamp('Job not found', { jobId });
        return undefined;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Job get failed', { jobId, error: errorMessage });
      return undefined;
    }
  }

  async set(jobId: string, status: JobStatus | string): Promise<void> {
    try {
      logWithTimestamp('Job set requested', { jobId });

      if (typeof status === 'string') {
        // Store string values directly
        await redis.setEx(`job:${jobId}`, 3600, status); // Expire after 1 hour
        logWithTimestamp('String value stored successfully', { jobId });
      } else {
        // Store JobStatus objects with timestamp
        const statusWithTimestamp = {
          ...status,
          timestamp: status.timestamp || Date.now()
        };

        logWithTimestamp('Job set requested', { 
          jobId, 
          stage: statusWithTimestamp.stage,
          progress: statusWithTimestamp.progress 
        });

        await redis.setEx(`job:${jobId}`, 3600, JSON.stringify(statusWithTimestamp)); // Expire after 1 hour

        logWithTimestamp('Job updated successfully', { 
          jobId, 
          stage: statusWithTimestamp.stage
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Job set failed', { jobId, error: errorMessage });
      throw error; // Re-throw to ensure errors are not silently ignored
    }
  }

  async delete(jobId: string): Promise<boolean> {
    try {
      logWithTimestamp('Job deletion requested', { jobId });
      
      const result = await redis.del(`job:${jobId}`);

      logWithTimestamp('Job deleted successfully', { jobId, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logWithTimestamp('Job delete failed', { jobId, error: errorMessage });
      return false;
    }
  }

  async has(jobId: string): Promise<boolean> {
    const job = await this.get(jobId);
    return !!job;
  }

  async clear(): Promise<void> {
    try {
      // Get all job keys and delete them
      const keys = await redis.keys('job:*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
      logWithTimestamp('All jobs cleared', { deletedKeys: keys.length });
    } catch (error) {
      logWithTimestamp('Failed to clear jobs', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}

// Export singleton instance
export const jobs = new JobStorage();
