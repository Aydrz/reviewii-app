const getApiBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url || url.includes('localhost')) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      url = 'https://reviewii-api.vercel.app';
    } else {
      url = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    }
  }
  return url.replace(/\/+$/, '');
};

const API_BASE_URL = getApiBaseUrl();

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('editor_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Terjadi kesalahan server' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export interface UploadProgressInfo {
  loaded: number;
  total: number;
  percentage: number;
  speedBps: number;
  remainingSec: number;
}

function uploadSingleFile<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (info: UploadProgressInfo) => void,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('editor_token') : null;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const loaded = event.loaded;
        const total = event.total;
        const percentage = Math.round((loaded / total) * 100);
        const elapsedTimeSec = (Date.now() - startTime) / 1000;
        const speedBps = elapsedTimeSec > 0 ? loaded / elapsedTimeSec : 0;
        const remainingBytes = total - loaded;
        const remainingSec = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;

        onProgress({ loaded, total, percentage, speedBps, remainingSec });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          resolve({} as T);
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.message || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`Upload gagal (HTTP ${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error saat mengunggah file.'));

    xhr.open('POST', url, true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

export async function uploadFileApi<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (info: UploadProgressInfo) => void,
): Promise<T> {
  const file = formData.get('file') as File;
  const fileType = (formData.get('file_type') as string) || 'video';

  // 3 MB chunk size (strictly below Vercel's 4.5 MB limit)
  const CHUNK_SIZE = 3 * 1024 * 1024;

  if (!file || file.size <= CHUNK_SIZE) {
    return uploadSingleFile<T>(endpoint, formData, onProgress);
  }

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const projectId = endpoint.split('/projects/')[1]?.split('/')[0];
  const chunkEndpoint = `/projects/${projectId}/versions/chunk`;

  let lastResult: any = null;
  const startTime = Date.now();

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunkBlob = file.slice(start, end);

    const chunkFormData = new FormData();
    chunkFormData.append('file', chunkBlob, file.name);
    chunkFormData.append('upload_id', uploadId);
    chunkFormData.append('chunk_index', String(i));
    chunkFormData.append('total_chunks', String(totalChunks));
    chunkFormData.append('original_name', file.name);
    chunkFormData.append('file_type', fileType);

    lastResult = await uploadSingleFile(chunkEndpoint, chunkFormData, (chunkProg) => {
      if (onProgress) {
        const loaded = Math.min(file.size, start + chunkProg.loaded);
        const total = file.size;
        const percentage = Math.round((loaded / total) * 100);
        const elapsedTimeSec = (Date.now() - startTime) / 1000;
        const speedBps = elapsedTimeSec > 0 ? loaded / elapsedTimeSec : 0;
        const remainingBytes = total - loaded;
        const remainingSec = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;

        onProgress({ loaded, total, percentage, speedBps, remainingSec });
      }
    });
  }

  return lastResult as T;
}

export function getFullMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
