// Cache utilities for the application

export const CACHE_KEYS = {
  LANDING_PAGE: 'landingPageCache',
  USER_PREFERENCES: 'userPreferences',
  QUIZ_DATA: 'quizDataCache'
};

export const CACHE_EXPIRY = {
  SHORT: 2 * 60 * 1000,      // 2 minutes
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 30 * 60 * 1000,      // 30 minutes
  SESSION: 24 * 60 * 60 * 1000 // 24 hours
};

// Generic cache utilities
export const getCachedData = (key, expiry = CACHE_EXPIRY.MEDIUM) => {
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    const now = Date.now();
    
    if (now - data.timestamp > expiry) {
      sessionStorage.removeItem(key);
      return null;
    }
    
    return data.value;
  } catch (error) {
    console.error(`Error reading cache for key ${key}:`, error);
    return null;
  }
};

export const setCachedData = (key, value) => {
  try {
    const data = {
      value,
      timestamp: Date.now()
    };
    sessionStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
};

export const clearCache = (key) => {
  try {
    if (key) {
      sessionStorage.removeItem(key);
      console.log(`🗑️ Cache cleared for key: ${key}`);
    } else {
      sessionStorage.clear();
      console.log('🗑️ All cache cleared');
    }
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

export const getCacheInfo = () => {
  const info = {};
  
  Object.values(CACHE_KEYS).forEach(key => {
    try {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;
        info[key] = {
          exists: true,
          age: Math.round(age / 1000), // in seconds
          size: new Blob([cached]).size // in bytes
        };
      } else {
        info[key] = { exists: false };
      }
    } catch (error) {
      info[key] = { exists: false, error: error.message };
    }
  });
  
  return info;
};

// Development helper
export const logCacheStatus = () => {
  if (process.env.NODE_ENV === 'development') {
    console.table(getCacheInfo());
  }
};

// Cache warming - preload data
export const warmCache = async (dataFetchers) => {
  const promises = Object.entries(dataFetchers).map(async ([key, fetcher]) => {
    try {
      const data = await fetcher();
      setCachedData(key, data);
      return { key, success: true };
    } catch (error) {
      console.error(`Failed to warm cache for ${key}:`, error);
      return { key, success: false, error };
    }
  });
  
  return Promise.allSettled(promises);
};
