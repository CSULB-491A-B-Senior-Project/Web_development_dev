import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';
import { AuthResponse, LoginRequest, RegisterRequest } from './models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'https://api.crescendo.chat/v1';
  private readonly TOKEN_COOKIE_NAME = 'jwt_token';
  private tokenSubject!: BehaviorSubject<string | null>;
  public token$!: Observable<string | null>;

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {
    // Initialize token subject AFTER cookieService is injected
    this.tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
    this.token$ = this.tokenSubject.asObservable();
  }

  /**
   * Get the stored JWT token from cookies
   */
  private getStoredToken(): string | null {
    return this.cookieService.get(this.TOKEN_COOKIE_NAME) || null;
  }

  /**
   * Store JWT token in cookies
   * Cookie expires in 7 days by default
   */
  private storeToken(token: string): void {
    const expiryDays = 7;
    this.cookieService.set(
      this.TOKEN_COOKIE_NAME,
      token,
      expiryDays,
      '/',
      undefined,
      false, // secure - set to true in production (HTTPS only)
      'Lax' // SameSite policy - Lax is good for development
    );
    this.tokenSubject.next(token);
  }

  /**
   * Remove JWT token from cookies
   */
  private removeToken(): void {
    this.cookieService.delete(this.TOKEN_COOKIE_NAME, '/');
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
      `${this.baseUrl}/Auth/register`,
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
      `${this.baseUrl}/Auth/login`,
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

  // /**
  //  * Generic DELETE request with authentication
  //  */
  // public delete<T>(endpoint: string): Observable<T> {
  //   return this.http.delete<T>(
  //     `${this.baseUrl}${endpoint}`,
  //     { headers: this.getAuthHeaders() }
  //   );
  // }


    /**
   * Generic DELETE request with authentication
   */
  public delete<T>(endpoint: string, body?: any): Observable<T> {
    return this.http.request<T>('delete', `${this.baseUrl}${endpoint}`, {
        body: body,
        headers: this.getAuthHeaders()
    });
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
