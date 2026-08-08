const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
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

export function uploadFileApi<T>(
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

export function getFullMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}
