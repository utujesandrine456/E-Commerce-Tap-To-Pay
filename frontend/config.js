// Configuration for different environments
const config = {
  // Automatically detect if running locally or on production
  getBackendUrl: function() {
    // Check if running in React Native/Expo environment
    if (typeof window === 'undefined' || !window.location) {
      // Mobile app - use production VPS server
      return 'http://157.173.101.159:8208';
    }
    
    const hostname = window.location.hostname;
    
    // If running on localhost, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8208';
    }
    
    // If running on production VPS
    return 'http://157.173.101.159:8208';
  }
};

// Export the backend URL
const BACKEND_URL = config.getBackendUrl();
console.log('🔗 Backend URL:', BACKEND_URL);
