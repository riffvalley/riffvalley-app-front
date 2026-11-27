const MAX_CONCURRENT_RESOLUTION_REQUESTS = 3;

let activeRequests = 0;
const waitingRequests: Array<() => void> = [];

/** Shared by all read-only entity resolvers so simultaneous coordinators cannot flood the API. */
export async function withEntityResolutionConcurrency<T>(operation: () => Promise<T>): Promise<T> {
  if (activeRequests >= MAX_CONCURRENT_RESOLUTION_REQUESTS) {
    await new Promise<void>((resolve) => waitingRequests.push(resolve));
  } else {
    activeRequests++;
  }
  try {
    return await operation();
  } finally {
    const next = waitingRequests.shift();
    if (next) next();
    else activeRequests--;
  }
}

export const ENTITY_RESOLUTION_MAX_CONCURRENCY = MAX_CONCURRENT_RESOLUTION_REQUESTS;
