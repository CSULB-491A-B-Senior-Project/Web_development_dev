/**
 * Authentication Models for Crescendo API
 */

export interface RegisterRequest {
  firstName: string;  // maxLength: 50, minLength: 1
  lastName: string;   // maxLength: 50, minLength: 1
  username: string;   // maxLength: 24, minLength: 1
  email: string;      // maxLength: 254, minLength: 1, pattern: email regex
  password: string;   // minLength: 1, pattern: password regex
}

export interface LoginRequest {
  usernameOrEmail: string;  // maxLength: 254, minLength: 1
  password: string;          // minLength: 1
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expires (1800 = 30 minutes)
  username: string;
  email: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
}

export interface ErrorResponse {
  message: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
