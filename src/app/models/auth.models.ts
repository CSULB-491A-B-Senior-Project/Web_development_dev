/**
 * Authentication Models for Crescendo API
 */

export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user?: User;
  message?: string;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
