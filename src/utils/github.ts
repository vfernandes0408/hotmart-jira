import { githubHeaders } from '@/config/github';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  signal?: AbortSignal;
}

export async function fetchGithubWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 10000,
    signal
  } = retryOptions;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check if the operation was aborted
      if (signal?.aborted) {
        throw new Error('Operation aborted by user');
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...githubHeaders,
          ...(options.headers || {})
        },
        signal
      });

      // If rate limited, wait and retry
      if (response.status === 403 || response.status === 429) {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const waitTime = resetTime ? (parseInt(resetTime) * 1000) - Date.now() : delay;
        
        console.warn(`Rate limited on attempt ${attempt + 1}. Waiting ${waitTime}ms before retry.`);
        await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, maxDelay)));
        
        delay = Math.min(delay * 2, maxDelay); // Exponential backoff
        continue;
      }

      // For other client or server errors, throw an error
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      
      // If it's an abort error or we're out of retries, throw immediately
      if (error instanceof Error && (error.name === 'AbortError' || attempt === maxRetries - 1)) {
        throw error;
      }

      console.warn(`Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay); // Exponential backoff
    }
  }

  throw lastError || new Error('Failed after max retries');
} 