import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';
import { AuthResponse, LoginRequest, RegisterRequest, RefreshTokenRequest } from './models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'https://api.crescendo.chat/v1';
    // private readonly baseUrl = 'http://localhost:5050/v1';
  private readonly ACCESS_TOKEN_COOKIE_NAME = 'access_token';
  private readonly REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
  private tokenSubject!: BehaviorSubject<string | null>;
  public token$!: Observable<string | null>;

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {
    // Initialize token subject AFTER cookieService is injected
    this.tokenSubject = new BehaviorSubject<string | null>(this.getStoredAccessToken());
    this.token$ = this.tokenSubject.asObservable();
  }

  /**
   * Get the stored access token from cookies
   */
  private getStoredAccessToken(): string | null {
    return this.cookieService.get(this.ACCESS_TOKEN_COOKIE_NAME) || null;
  }

  /**
   * Get the stored refresh token from cookies
   */
  public getStoredRefreshToken(): string | null {
    return this.cookieService.get(this.REFRESH_TOKEN_COOKIE_NAME) || null;
  }

  /**
   * Store access and refresh tokens in cookies
   * Access token expires in 30 minutes, refresh token in 7 days
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    const accessTokenExpiryMinutes = 30 / (24 * 60); // 30 minutes in days
    const refreshTokenExpiryDays = 7;

    this.cookieService.set(
      this.ACCESS_TOKEN_COOKIE_NAME,
      accessToken,
      accessTokenExpiryMinutes,
      '/',
      undefined,
      false, // secure - set to true in production (HTTPS only)
      'Lax' // SameSite policy
    );

    this.cookieService.set(
      this.REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      refreshTokenExpiryDays,
      '/',
      undefined,
      false, // secure - set to true in production (HTTPS only)
      'Lax' // SameSite policy
    );

    this.tokenSubject.next(accessToken);
  }

  /**
   * Remove access and refresh tokens from cookies
   */
  private removeTokens(): void {
    this.cookieService.delete(this.ACCESS_TOKEN_COOKIE_NAME, '/');
    this.cookieService.delete(this.REFRESH_TOKEN_COOKIE_NAME, '/');
    this.tokenSubject.next(null);
  }

  /**
   * Get current token value
   */
  public getToken(): string | null {
    return this.tokenSubject.value;
  }

    /**
   * Refresh access token using refresh token
   */
  public refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const request: RefreshTokenRequest = { refreshToken };
    return this.http.post<AuthResponse>(
      `${this.baseUrl}/Auth/refresh`,
      request
    ).pipe(
      tap(response => {
        if (response.accessToken && response.refreshToken) {
          this.storeTokens(response.accessToken, response.refreshToken);
        }
      })
    );
  }

  /**
   * Revoke refresh token (logout)
   */
  public revokeToken(): Observable<void> {
    const refreshToken = this.getStoredRefreshToken();
    if (!refreshToken) {
      this.removeTokens();
      return new Observable(observer => {
        observer.next();
        observer.complete();
      });
    }

    const request: RefreshTokenRequest = { refreshToken };
    return this.http.post<void>(
      `${this.baseUrl}/Auth/revoke`,
      request
    ).pipe(
      tap(() => {
        this.removeTokens();
      })
    );
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
        if (response.accessToken && response.refreshToken) {
          this.storeTokens(response.accessToken, response.refreshToken);
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
        if (response.accessToken && response.refreshToken) {
          this.storeTokens(response.accessToken, response.refreshToken);
        }
      })
    );
  }

  /**
   * Logout user
   */
  public logout(): void {
    // Remove tokens immediately for instant logout
    this.removeTokens();

    // Then revoke on server (fire and forget)
    this.revokeToken().subscribe({
      next: () => {},
      error: () => {}
    });
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
