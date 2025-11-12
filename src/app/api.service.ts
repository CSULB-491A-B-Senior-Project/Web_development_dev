import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthResponse, LoginRequest, RegisterRequest } from './models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'https://crescendo.chat/api/v1';
  private tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get the stored JWT token from localStorage
   */
  private getStoredToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  /**
   * Store JWT token in localStorage
   */
  private storeToken(token: string): void {
    localStorage.setItem('jwt_token', token);
    this.tokenSubject.next(token);
  }

  /**
   * Remove JWT token from localStorage
   */
  private removeToken(): void {
    localStorage.removeItem('jwt_token');
    this.tokenSubject.next(null);
  }

  /**
   * Get current token value
   */
  public getToken(): string | null {
    return this.tokenSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get HTTP headers with authorization token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  /**
   * Register a new user
   */
  public register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/register`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        if (response.token) {
          this.storeToken(response.token);
        }
      })
    );
  }

  /**
   * Login user
   */
  public login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/auth/login`,
      data,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => {
        if (response.token) {
          this.storeToken(response.token);
        }
      })
    );
  }

  /**
   * Logout user
   */
  public logout(): void {
    this.removeToken();
  }

  /**
   * Generic GET request with authentication
   */
  public get<T>(endpoint: string): Observable<T> {
    return this.http.get<T>(
      `${this.baseUrl}${endpoint}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Generic POST request with authentication
   */
  public post<T>(endpoint: string, data: any): Observable<T> {
    return this.http.post<T>(
      `${this.baseUrl}${endpoint}`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Generic PUT request with authentication
   */
  public put<T>(endpoint: string, data: any): Observable<T> {
    return this.http.put<T>(
      `${this.baseUrl}${endpoint}`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Generic DELETE request with authentication
   */
  public delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(
      `${this.baseUrl}${endpoint}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Generic PATCH request with authentication
   */
  public patch<T>(endpoint: string, data: any): Observable<T> {
    return this.http.patch<T>(
      `${this.baseUrl}${endpoint}`,
      data,
      { headers: this.getAuthHeaders() }
    );
  }
}
