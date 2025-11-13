import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { AuthResponse, LoginRequest, RegisterRequest } from './models/auth.models';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let localStorageSpy: { getItem: jasmine.Spy; setItem: jasmine.Spy; removeItem: jasmine.Spy };

  beforeEach(async () => {
    // Create spies for localStorage
    localStorageSpy = {
      getItem: spyOn(localStorage, 'getItem').and.returnValue(null),
      setItem: spyOn(localStorage, 'setItem'),
      removeItem: spyOn(localStorage, 'removeItem')
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    }).compileComponents();

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding HTTP requests
  });

  // ==================== Category 1: Service Initialization ====================

  it('TC-1.1: should create the service', () => {
    expect(service).toBeTruthy();
  });

  it('TC-1.2: should load token from localStorage on initialization', () => {
    localStorageSpy.getItem.and.returnValue('stored-token');
    const newService = new ApiService(TestBed.inject(HttpClientTestingModule) as any);
    expect(newService.getToken()).toBe('stored-token');
  });

  // ==================== Category 2: Token Management ====================

  it('TC-2.1: getToken() should return current token', () => {
    (service as any).storeToken('test-token');
    expect(service.getToken()).toBe('test-token');
  });

  it('TC-2.2: storeToken() should save token to localStorage', () => {
    (service as any).storeToken('test-token');
    expect(localStorageSpy.setItem).toHaveBeenCalledWith('jwt_token', 'test-token');
  });

  it('TC-2.3: storeToken() should update BehaviorSubject', (done) => {
    service.token$.subscribe(token => {
      if (token === 'test-token') {
        expect(token).toBe('test-token');
        done();
      }
    });
    (service as any).storeToken('test-token');
  });

  it('TC-2.4: removeToken() should clear token from localStorage', () => {
    (service as any).removeToken();
    expect(localStorageSpy.removeItem).toHaveBeenCalledWith('jwt_token');
  });

  it('TC-2.5: removeToken() should update BehaviorSubject to null', (done) => {
    (service as any).storeToken('test-token');
    service.token$.subscribe(token => {
      if (token === null) {
        expect(token).toBeNull();
        done();
      }
    });
    (service as any).removeToken();
  });

  it('TC-2.6: isAuthenticated() should return true when token exists', () => {
    (service as any).storeToken('test-token');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('TC-2.7: isAuthenticated() should return false when token does not exist', () => {
    (service as any).removeToken();
    expect(service.isAuthenticated()).toBeFalse();
  });

  // ==================== Category 3: HTTP Headers ====================

  it('TC-3.1: getAuthHeaders() should include Authorization header when token exists', () => {
    (service as any).storeToken('test-token');
    const headers = (service as any).getAuthHeaders();
    expect(headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('TC-3.2: getAuthHeaders() should exclude Authorization header when token does not exist', () => {
    (service as any).removeToken();
    const headers = (service as any).getAuthHeaders();
    expect(headers.get('Authorization')).toBeNull();
  });

  it('TC-3.3: getAuthHeaders() should always include Content-Type header', () => {
    const headers = (service as any).getAuthHeaders();
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  // ==================== Category 4: Authentication Endpoints ====================

  it('TC-4.1: register() should make POST request to correct endpoint', () => {
    const registerRequest: RegisterRequest = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    const authResponse: AuthResponse = { token: 'new-token' };

    service.register(registerRequest).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush(authResponse);
  });

  it('TC-4.2: register() should send correct request body', () => {
    const registerRequest: RegisterRequest = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    const authResponse: AuthResponse = { token: 'new-token' };

    service.register(registerRequest).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/auth/register');
    expect(req.request.body).toEqual(registerRequest);
    req.flush(authResponse);
  });

  it('TC-4.3: register() should store token from response', () => {
    const registerRequest: RegisterRequest = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    const authResponse: AuthResponse = { token: 'new-token' };

    service.register(registerRequest).subscribe(() => {
      expect(service.getToken()).toBe('new-token');
    });

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/auth/register');
    req.flush(authResponse);
  });

  it('TC-4.4: register() should return AuthResponse observable', () => {
    const registerRequest: RegisterRequest = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };
    const authResponse: AuthResponse = { token: 'new-token' };

    service.register(registerRequest).subscribe(response => {
      expect(response).toEqual(authResponse);
    });

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/auth/register');
    req.flush(authResponse);
  });

  it('TC-4.5: login() should make POST request to correct endpoint', () => {
    const loginRequest: LoginRequest = {
      email: 'test@example.com',
      password: 'password123'
    };
    const authResponse: AuthResponse = { token: 'login-token' };

    service.login(loginRequest).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(authResponse);
  });

  it('TC-4.6: login() should send correct request body', () => {
    const loginRequest: LoginRequest = {
      email: 'test@example.com',
      password: 'password123'
    };
    const authResponse: AuthResponse = { token: 'login-token' };

    service.login(loginRequest).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/auth/login');
    expect(req.request.body).toEqual(loginRequest);
    req.flush(authResponse);
  });

  it('TC-4.7: login() should store token from response', () => {
    const loginRequest: LoginRequest = {
      email: 'test@example.com',
      password: 'password123'
    };
    const authResponse: AuthResponse = { token: 'login-token' };

    service.login(loginRequest).subscribe(() => {
      expect(service.getToken()).toBe('login-token');
    });

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/auth/login');
    req.flush(authResponse);
  });

  it('TC-4.8: login() should return AuthResponse observable', () => {
    const loginRequest: LoginRequest = {
      email: 'test@example.com',
      password: 'password123'
    };
    const authResponse: AuthResponse = { token: 'login-token' };

    service.login(loginRequest).subscribe(response => {
      expect(response).toEqual(authResponse);
    });

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/auth/login');
    req.flush(authResponse);
  });

  // ==================== Category 5: Generic HTTP Methods ====================

  it('TC-5.1: get() should make GET request to correct URL', () => {
    service.get('/users').subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('TC-5.2: get() should include auth headers when token exists', () => {
    (service as any).storeToken('test-token');
    service.get('/users').subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('TC-5.3: get() should return typed observable', () => {
    interface User { id: number; name: string; }
    const mockUsers: User[] = [{ id: 1, name: 'Test User' }];

    service.get<User[]>('/users').subscribe(users => {
      expect(users).toEqual(mockUsers);
      expect(users[0].id).toBe(1);
      expect(users[0].name).toBe('Test User');
    });

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    req.flush(mockUsers);
  });

  it('TC-5.4: post() should make POST request with data', () => {
    const userData = { name: 'New User', email: 'new@example.com' };

    service.post('/users', userData).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(userData);
    req.flush({});
  });

  it('TC-5.5: post() should include auth headers when token exists', () => {
    (service as any).storeToken('test-token');
    service.post('/users', {}).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('TC-5.6: put() should make PUT request with data', () => {
    const userData = { name: 'Updated User', email: 'updated@example.com' };

    service.put('/users/1', userData).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users/1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(userData);
    req.flush({});
  });

  it('TC-5.7: put() should include auth headers when token exists', () => {
    (service as any).storeToken('test-token');
    service.put('/users/1', {}).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users/1');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('TC-5.8: delete() should make DELETE request', () => {
    service.delete('/users/1').subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });

  it('TC-5.9: delete() should include auth headers when token exists', () => {
    (service as any).storeToken('test-token');
    service.delete('/users/1').subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users/1');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('TC-5.10: patch() should make PATCH request with data', () => {
    const partialData = { name: 'Patched Name' };

    service.patch('/users/1', partialData).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(partialData);
    req.flush({});
  });

  it('TC-5.11: patch() should include auth headers when token exists', () => {
    (service as any).storeToken('test-token');
    service.patch('/users/1', {}).subscribe();

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users/1');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  // ==================== Category 6: Error Handling ====================

  it('TC-6.1: should handle 400 Bad Request error', () => {
    service.get('/users').subscribe(
      () => fail('should have failed with 400 error'),
      error => {
        expect(error.status).toBe(400);
      }
    );

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
  });

  it('TC-6.2: should handle 401 Unauthorized error', () => {
    service.get('/users').subscribe(
      () => fail('should have failed with 401 error'),
      error => {
        expect(error.status).toBe(401);
      }
    );

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('TC-6.3: should handle 403 Forbidden error', () => {
    service.get('/users').subscribe(
      () => fail('should have failed with 403 error'),
      error => {
        expect(error.status).toBe(403);
      }
    );

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });

  it('TC-6.4: should handle 404 Not Found error', () => {
    service.get('/users').subscribe(
      () => fail('should have failed with 404 error'),
      error => {
        expect(error.status).toBe(404);
      }
    );

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('TC-6.5: should handle 500 Internal Server Error', () => {
    service.get('/users').subscribe(
      () => fail('should have failed with 500 error'),
      error => {
        expect(error.status).toBe(500);
      }
    );

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('TC-6.6: should handle network errors', () => {
    service.get('/users').subscribe(
      () => fail('should have failed with network error'),
      error => {
        expect(error.error).toBeTruthy();
      }
    );

    const req = httpMock.expectOne('https://crescendo.chat/api/v1/users');
    req.error(new ProgressEvent('Network error'));
  });
});
