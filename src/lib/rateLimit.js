const requestMap = new Map();

function cleanExpiredEntries(now, windowMs) {
  for (const [key, data] of requestMap.entries()) {
    const cutoff = now - windowMs;
    data.timestamps = data.timestamps.filter(ts => ts > cutoff);
    if (data.timestamps.length === 0) {
      requestMap.delete(key);
    }
  }
}

export function checkRateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Clean expired entries periodically
  cleanExpiredEntries(now, windowMs);

  if (!requestMap.has(key)) {
    requestMap.set(key, { timestamps: [] });
  }

  const data = requestMap.get(key);

  // Filter to only timestamps within the current window
  data.timestamps = data.timestamps.filter(ts => ts > cutoff);

  const count = data.timestamps.length;

  if (count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  data.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxRequests - data.timestamps.length,
  };
}

// 10 requests per hour per userId
export function checkGenerateLimit(userId) {
  const key = `generate:${userId}`;
  return checkRateLimit(key, 10, 60 * 60 * 1000);
}

// 20 requests per hour per accountId
export function checkInviteLimit(accountId) {
  const key = `invite:${accountId}`;
  return checkRateLimit(key, 20, 60 * 60 * 1000);
}