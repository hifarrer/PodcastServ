import { JobStatus } from './types';

// In-memory job storage (for single-instance deployment)
export const jobs = new Map<string, JobStatus>();
