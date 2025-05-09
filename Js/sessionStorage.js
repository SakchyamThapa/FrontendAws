// sessionStorage.js - Enhanced JWT authentication module

/**
 * Get JWT token from session storage with validation
 * @returns {string|null} The JWT token or null if not found/invalid
 */
export function getToken() {
  const token = sessionStorage.getItem("jwt_token");
  if (!token) {
    console.warn("No JWT token found in session storage");
    return null;
  }

  if (!validateTokenFormat(token)) {
    console.error("Invalid token format detected");
    return null;
  }

  return token;
}

/**
 * Check if token has correct JWT format
 * @param {string} token The JWT token to validate
 * @returns {boolean} True if token has valid format
 */
function validateTokenFormat(token) {
  const parts = token.split('.');
  return parts.length === 3; // Header.payload.signature
}

/**
 * Check if user is authenticated with enhanced token validation
 * @returns {boolean} True if authenticated with valid token
 */
export function isAuthenticated() {
  const token = getToken();
  if (!token) {
    console.warn("Authentication check failed: No token found");
    return false;
  }

  if (isTokenExpired(token)) {
    console.warn("Token is expired");
    clearToken(); // Clear expired token
    return false;
  }

  return true; // Token is valid
}

/**
 * Check if the token is expired
 * @param {string} token The JWT token
 * @returns {boolean} True if token is expired
 */
export function isTokenExpired(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    const expiration = decoded.exp;  // Expiration timestamp in seconds
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    
    if (!expiration) {
      console.error("Token has no expiration claim");
      return true;
    }
    
    // Debug expiration timing
    console.log(`Token expires: ${new Date(expiration * 1000).toLocaleString()}`);
    console.log(`Current time: ${new Date(currentTime * 1000).toLocaleString()}`);
    console.log(`Seconds until expiration: ${expiration - currentTime}`);
    
    return currentTime >= expiration;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // If decoding fails, assume expired or invalid token
  }
}

/**
 * Debug token information
 * @param {string} token The JWT token to debug
 */
export function debugToken(token) {
  if (!token) {
    console.error("No token provided for debugging");
    return;
  }
  
  try {
    const [header, payload, signature] = token.split('.');
    const decodedHeader = JSON.parse(atob(header));
    const decodedPayload = JSON.parse(atob(payload));
    
    console.group("Token Debug Information");
    console.log("Token header:", decodedHeader);
    console.log("Token payload:", decodedPayload);
    console.log("Token signature (first 10 chars):", signature.substring(0, 10));
    
    if (decodedPayload.exp) {
      const expTime = new Date(decodedPayload.exp * 1000);
      const nowTime = new Date();
      console.log("Expiration:", expTime.toLocaleString());
      console.log("Current time:", nowTime.toLocaleString());
      console.log("Expired:", expTime <= nowTime);
      console.log("Time left:", Math.floor((expTime - nowTime) / 1000), "seconds");
    } else {
      console.warn("No expiration claim found in token");
    }
    console.groupEnd();
  } catch (err) {
    console.error("Failed to decode token for debugging:", err);
  }
}

/**
 * Store JWT token in session storage with validation
 * @param {string} token The JWT token to store
 * @returns {boolean} True if token was stored successfully
 */
export function storeToken(token) {
  if (!token) {
    console.error("Cannot store empty token");
    return false;
  }

  if (!validateTokenFormat(token)) {
    console.error("Invalid token format - not storing");
    return false;
  }

  try {
    // Debug the token before storing
    debugToken(token);
    
    sessionStorage.setItem("jwt_token", token);
    console.log("Token stored successfully");
    return true;
  } catch (err) {
    console.error("Failed to store token:", err);
    return false;
  }
}

/**
 * Clear authentication token from session storage
 */
export function clearToken() {
  sessionStorage.removeItem("jwt_token");
  console.log("Authentication token cleared");
}

/**
 * Get user role from the JWT token
 * @returns {string|string[]|null} The user's role(s) or null if not found
 */
export function getUserRole() {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const decodedPayload = atob(payload);
    const userData = JSON.parse(decodedPayload);

    // Look for standard or custom role claim names
    const roles =
      userData.role ||
      userData.roles ||
      userData["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

    if (!roles) return null;

    // Always return as array
    return Array.isArray(roles) ? roles : [roles];
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

/**
 * Check if user has required role
 * @param {string|string[]} requiredRoles Role(s) to check against
 * @returns {boolean} True if user has any of the required roles
 */
export function hasRole(requiredRoles) {
  const userRoles = getUserRole();
  if (!userRoles) return false;

  // Ensure requiredRoles is always an array
  const requiredRolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  // Check if the user has any of the required roles
  return requiredRolesArray.some(role => 
    userRoles.some(userRole => userRole === role)
  );
}

/**
 * Get specific claim from token payload
 * @param {string} claimName Name of the claim to retrieve
 * @returns {any} The claim value or null if not found
 */
export function getTokenClaim(claimName) {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const decodedPayload = atob(payload);
    const userData = JSON.parse(decodedPayload);
    
    return userData[claimName] || null;
  } catch (error) {
    console.error(`Error retrieving claim '${claimName}':`, error);
    return null;
  }
}
// Add to your auth.js file
export function setupTokenRefresh() {
  const token = getToken();
  if (!token) return;
  
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    
    if (!decoded.exp) return;
    
    // Calculate time until token expires (in seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - currentTime;
    
    // Refresh when 5 minutes left (adjust as needed)
    const refreshTime = Math.max(timeUntilExpiry - 300, 0) * 1000;
    
    if (refreshTime > 0) {
      console.log(`Token refresh scheduled in ${refreshTime/1000} seconds`);
      setTimeout(refreshToken, refreshTime);
    }
  } catch (err) {
    console.error("Error setting up token refresh:", err);
  }
}

async function refreshToken() {
  try {
    const currentToken = getToken();
    if (!currentToken) return;
    
    const response = await fetch('https://localhost:7146/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      storeToken(data.token);
      setupTokenRefresh(); // Schedule next refresh
      console.log("Token refreshed successfully");
    } else {
      console.error("Failed to refresh token");
      // Don't clear token here - let normal expiration handle it
    }
  } catch (err) {
    console.error("Token refresh error:", err);
  }
}