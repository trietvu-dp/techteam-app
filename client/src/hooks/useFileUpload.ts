import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface UploadState {
  progress: number;
  uploading: boolean;
  error: string | null;
}

export function useFileUpload() {
  const [state, setState] = useState<UploadState>({
    progress: 0,
    uploading: false,
    error: null,
  });

  const upload = async (
    courseId: string,
    file: File,
    type: string
  ): Promise<string | null> => {
    setState({ progress: 0, uploading: true, error: null });

    try {
      // Get presigned URL from server
      const res = await apiRequest('POST', `/api/courses/${courseId}/upload-url`, {
        filename: file.name,
        contentType: file.type,
        type,
      });
      const { uploadUrl, key } = await res.json();

      // Upload directly to S3 via XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setState((prev) => ({ ...prev, progress: Math.round((e.loaded / e.total) * 100) }));
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setState({ progress: 100, uploading: false, error: null });
      return key;
    } catch (error: any) {
      setState({ progress: 0, uploading: false, error: error.message });
      return null;
    }
  };

  return { ...state, upload };
}
