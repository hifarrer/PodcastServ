'use client';

import { useState, useEffect } from 'react';
import { ProcessingStage, JobStatus } from '@/lib/types';
import { logWithTimestamp } from '@/lib/utils';

interface ProgressTrackerProps {
  jobId: string | null;
  isVisible: boolean;
}

const stageInfo = {
  [ProcessingStage.SCRIPT]: {
    name: 'Script Generation',
    description: 'Creating podcast script with AI',
    icon: '📝',
    color: 'bg-blue-500'
  },
  [ProcessingStage.AUDIO]: {
    name: 'Audio Generation',
    description: 'Converting script to speech',
    icon: '🎙️',
    color: 'bg-green-500'
  },
  [ProcessingStage.SPLIT]: {
    name: 'Audio Splitting',
    description: 'Dividing audio into segments',
    icon: '✂️',
    color: 'bg-yellow-500'
  },
  [ProcessingStage.VIDEO_GENERATION]: {
    name: 'Video Generation',
    description: 'Creating lip-sync videos',
    icon: '🎬',
    color: 'bg-purple-500'
  },
  [ProcessingStage.VIDEO_MERGE]: {
    name: 'Video Merging',
    description: 'Combining video segments',
    icon: '🔗',
    color: 'bg-orange-500'
  },
  [ProcessingStage.COMPLETE]: {
    name: 'Complete',
    description: 'Podcast ready for download',
    icon: '✅',
    color: 'bg-green-600'
  },
  [ProcessingStage.ERROR]: {
    name: 'Error',
    description: 'Generation failed',
    icon: '❌',
    color: 'bg-red-500'
  }
};

export default function ProgressTracker({ jobId, isVisible }: ProgressTrackerProps) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!jobId || !isVisible) {
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    logWithTimestamp('Starting progress polling', { jobId });

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status/${jobId}`);
        const data = await response.json();
        
        if (data.success) {
          setStatus(data);
          logWithTimestamp('Status update received', {
            jobId,
            stage: data.stage,
            progress: data.progress,
            message: data.message
          });

          // Stop polling if complete or error
          if (data.stage === ProcessingStage.COMPLETE || data.stage === ProcessingStage.ERROR) {
            setIsPolling(false);
            logWithTimestamp('Polling stopped', { 
              jobId, 
              reason: data.stage === ProcessingStage.COMPLETE ? 'completed' : 'error' 
            });
          }
        } else {
          logWithTimestamp('Status check failed', { jobId, error: data.error });
          setStatus({
            stage: ProcessingStage.ERROR,
            progress: 0,
            message: data.error || 'Failed to check status'
          });
          setIsPolling(false);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logWithTimestamp('Status polling error', { jobId, error: errorMessage });
        setStatus({
          stage: ProcessingStage.ERROR,
          progress: 0,
          message: 'Failed to check status'
        });
        setIsPolling(false);
      }
    };

    // Poll immediately, then every 2 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [jobId, isVisible]);

  if (!isVisible || !status) {
    return null;
  }

  const stages = [
    ProcessingStage.SCRIPT,
    ProcessingStage.AUDIO,
    ProcessingStage.SPLIT,
    ProcessingStage.VIDEO_GENERATION,
    ProcessingStage.VIDEO_MERGE,
    ProcessingStage.COMPLETE
  ];

  const currentStageIndex = stages.indexOf(status.stage);
  const isError = status.stage === ProcessingStage.ERROR;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Generation Progress</h3>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{status.message}</span>
          <span>{Math.round(status.progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isError ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="space-y-3">
        {stages.map((stage, index) => {
          const stageData = stageInfo[stage];
          const isCompleted = index < currentStageIndex;
          const isCurrent = index === currentStageIndex && !isError;
          const isErrorStage = isError && index === currentStageIndex;

          return (
            <div
              key={stage}
              className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
                isCompleted
                  ? 'bg-green-50 border border-green-200'
                  : isCurrent
                  ? 'bg-blue-50 border border-blue-200'
                  : isErrorStage
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 ${
                  isCompleted
                    ? 'bg-green-500'
                    : isCurrent
                    ? 'bg-blue-500'
                    : isErrorStage
                    ? 'bg-red-500'
                    : 'bg-gray-300'
                }`}
              >
                {isCompleted ? '✓' : isErrorStage ? '✗' : stageData.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{stageData.name}</div>
                <div className="text-sm text-gray-600">{stageData.description}</div>
              </div>
              {isCurrent && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Display */}
      {isError && status.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-red-800">Generation Failed</h4>
              <div className="mt-1 text-sm text-red-700">{status.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {status.stage === ProcessingStage.COMPLETE && status.videoUrl && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-green-400">🎉</span>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">Generation Complete!</h4>
              <div className="mt-2">
                <a
                  href={status.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Download Video
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Polling Indicator */}
      {isPolling && (
        <div className="mt-4 text-sm text-gray-500 flex items-center">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400 mr-2" />
          Checking status...
        </div>
      )}
    </div>
  );
}
