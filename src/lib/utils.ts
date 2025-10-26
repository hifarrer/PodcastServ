import { v4 as uuidv4 } from 'uuid';

export function generateJobId(): string {
  return uuidv4();
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateProgress(stage: string, current: number, total: number): number {
  const stageWeights = {
    SCRIPT: 0.1,
    AUDIO: 0.2,
    SPLIT: 0.3,
    VIDEO_GENERATION: 0.4,
    VIDEO_MERGE: 0.5,
    COMPLETE: 1.0
  };
  
  const baseProgress = stageWeights[stage as keyof typeof stageWeights] || 0;
  const stageProgress = total > 0 ? (current / total) * 0.1 : 0;
  
  return Math.min(baseProgress + stageProgress, 1.0);
}

export function logWithTimestamp(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:image/...;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isValidImageFile(file: File): boolean {
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = getFileExtension(file.name);
  return validExtensions.includes(extension);
}
