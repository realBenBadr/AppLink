import { jwtVerify, SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key"
);

export interface UserSession {
  id: string;
  email: string;
  name: string;
}

// Store token in localStorage
export const storeToken = (token: string) => {
  localStorage.setItem("auth_token", token);
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem("auth_token");
};

// Remove token from localStorage
export const removeToken = () => {
  localStorage.removeItem("auth_token");
};

// Store user session
export const storeUser = (user: UserSession) => {
  localStorage.setItem("user", JSON.stringify(user));
};

// Get user session
export const getUser = (): UserSession | null => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

// Remove user session
export const removeUser = () => {
  localStorage.removeItem("user");
};

// Verify JWT token
export const verifyToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
};

// Sign out user
export const signOut = () => {
  removeToken();
  removeUser();
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getToken();
  const user = getUser();
  return !!(token && user);
}; 