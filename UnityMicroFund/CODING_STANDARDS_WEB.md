# UnityMicroFund Web - Coding Standards

## Table of Contents

1. [Project Structure](#project-structure)
2. [Naming Conventions](#naming-conventions)
3. [Component Guidelines](#component-guidelines)
4. [Service Guidelines](#service-guidelines)
5. [State Management](#state-management)
6. [Routing](#routing)
7. [Forms & Validation](#forms--validation)
8. [Styling & SCSS](#styling--scss)
9. [HTTP & API](#http--api)
10. [Error Handling](#error-handling)
11. [Performance](#performance)
12. [Testing](#testing)
13. [Code Style](#code-style)

---

## Project Structure

```
unitymicrofund_web/
├── src/
│   ├── app/
│   │   ├── core/                 # Singleton services, guards, interceptors
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── models/
│   │   │   └── services/
│   │   ├── shared/               # Reusable components, pipes, directives
│   │   │   ├── components/
│   │   │   ├── pipes/
│   │   │   └── directives/
│   │   ├── features/             # Feature modules (lazy loaded)
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── users/
│   │   │   └── ...
│   │   ├── layout/               # Layout components
│   │   ├── app.component.ts
│   │   ├── app.routes.ts
│   │   └── app.module.ts
│   ├── assets/                   # Static assets
│   ├── environments/             # Environment configs
│   └── styles.scss               # Global styles
├── angular.json
├── package.json
└── tsconfig.json
```

### Rules

- Use **feature-based** organization (lazy loaded modules)
- Core services: singleton, app-wide scope
- Shared: reusable components, pipes, directives
- Keep components small and focused

---

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Component | `.component.ts` | `login.component.ts` |
| Service | `.service.ts` | `auth.service.ts` |
| Guard | `.guard.ts` | `auth.guard.ts` |
| Interceptor | `.interceptor.ts` | `auth.interceptor.ts` |
| Model | `.model.ts` | `user.model.ts` |
| Pipe | `.pipe.ts` | `bdt-currency.pipe.ts` |

### Classes & Interfaces

```typescript
// Components
export class LoginComponent implements OnInit { }
export class DashboardComponent { }

// Services
export class AuthService { }
export class UserService { }

// Interfaces
export interface User { }
export interface AuthResponse { }

// Types
export type UserRole = 'Admin' | 'Manager' | 'User';
```

### Variables & Methods

```typescript
export class LoginComponent {
  // Public properties
  isLoading = false;
  error: string = '';

  // Private properties
  private readonly storageKey = 'token';

  // Methods (camelCase)
  login(): void {
    this.validateForm();
  }

  private validateForm(): boolean {
    return this.form.valid;
  }
}
```

---

## Component Guidelines

### Standalone Components (Preferred)

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {}

  login(): void {
    if (this.form.valid) {
      // Handle login
    }
  }
}
```

### Component Structure

```typescript
// 1. Imports (alphabetical by package)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// 2. Decorator
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})

// 3. Class
export class ExampleComponent implements OnInit, OnDestroy {
  // Properties
  form!: FormGroup;
  isLoading = false;

  // Private
  private destroy$ = new Subject<void>();

  // Constructor
  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.initForm();
  }

  // Lifecycle
  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Methods
  private initForm(): void {
    this.form = this.fb.group({
      // form controls
    });
  }
}
```

### Template Guidelines

```html
<!-- Use semantic HTML -->
<div class="container">
  <header class="header">
    <h1>Dashboard</h1>
  </header>

  <main class="content">
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label for="email">Email</label>
        <input
          id="email"
          type="email"
          formControlName="email"
          [class.error]="isFieldInvalid('email')"
        >
        <span class="error-text" *ngIf="isFieldInvalid('email')">
          Email is required
        </span>
      </div>

      <button type="submit" [disabled]="form.invalid || isLoading">
        {{ isLoading ? 'Loading...' : 'Submit' }}
      </button>
    </form>
  </main>
</div>
```

### SCSS Structure

```scss
// Variables
$primary-color: #1976d2;
$error-color: #f44336;

// Mixins
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

// Component styles
:host {
  display: block;
}

.container {
  @include flex-center;
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;

    &.error {
      border-color: $error-color;
    }
  }
}
```

---

## Service Guidelines

### HTTP Services

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requiresApproval: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An error occurred';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error?.message || errorMessage;
    }
    return throwError(() => new Error(errorMessage));
  }
}
```

### Service Patterns

```typescript
@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users`)
      .pipe(
        catchError(err => {
          this.toastService.error('Failed to load users');
          return throwError(() => err);
        })
      );
  }
}
```

---

## State Management

### Simple State (Component-Level)

```typescript
export class DashboardComponent {
  users: User[] = [];
  isLoading = false;

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
```

### Service-Based State

```typescript
@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  setUser(user: User): void {
    this.userSubject.next(user);
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  logout(): void {
    this.userSubject.next(null);
  }
}
```

---

## Routing

### App Routes

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/user-layout.component').then(m => m.UserLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent) },
    ]
  },
  {
    path: 'auth',
    loadComponent: () => import('./auth/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent) },
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
```

### Route Guards

```typescript
// auth.guard.ts
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};

// usage in routes
{ path: 'dashboard', loadComponent: () => import('./dashboard.component'), canActivate: [authGuard] }
```

---

## Forms & Validation

### Reactive Forms

```typescript
export class ProfileComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^\d{11}$/)]]
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.form.valid) {
      // Submit form
    } else {
      this.form.markAllAsTouched();
    }
  }
}
```

### Template Validation

```html
<div class="form-group">
  <label for="email">Email</label>
  <input
    id="email"
    type="email"
    formControlName="email"
    [class.is-invalid]="isFieldInvalid('email')"
  >
  <div *ngIf="isFieldInvalid('email')" class="error-message">
    <small *ngIf="form.get('email')?.errors?.['required']">Email is required</small>
    <small *ngIf="form.get('email')?.errors?.['email']">Invalid email format</small>
  </div>
</div>
```

---

## Styling & SCSS

### Guidelines

- Use SCSS variables for colors, spacing, typography
- Follow BEM naming for complex components
- Use Angular Material when possible
- Keep component-specific styles in component SCSS file
- Use global styles for common patterns

### Variables & Mixins

```scss
// _variables.scss
$primary: #1976d2;
$secondary: #424242;
$success: #4caf50;
$error: #f44336;
$warning: #ff9800;

$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

// _mixins.scss
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin button-base {
  padding: $spacing-sm $spacing-md;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}
```

---

## HTTP & API

### Environment Configuration

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',
  googleClientId: 'your-client-id.apps.googleusercontent.com'
};

// environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api',
  googleClientId: 'your-production-client-id'
};
```

### Interceptors

```typescript
// auth.interceptor.ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('token');

    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(req);
  }
}
```

---

## Error Handling

### Service-Level

```typescript
private handleError(error: HttpErrorResponse): Observable<never> {
  let message = 'An unexpected error occurred';

  if (error.status === 401) {
    message = 'Please log in to continue';
    // Optionally redirect to login
  } else if (error.status === 403) {
    message = 'You do not have permission to perform this action';
  } else if (error.status === 404) {
    message = 'Resource not found';
  } else if (error.status >= 500) {
    message = 'Server error. Please try again later';
  } else if (error.error?.message) {
    message = error.error.message;
  }

  return throwError(() => new Error(message));
}
```

### Component-Level

```typescript
this.authService.login(credentials).subscribe({
  next: (response) => {
    // Handle success
  },
  error: (err) => {
    this.error = err.message || 'Login failed';
    this.toastService.error(this.error);
  }
});
```

---

## Performance

### Lazy Loading

```typescript
// Routes - already lazy loaded (see Routing section)
```

### OnPush Change Detection

```typescript
@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PureComponent {
  // Use observables with async pipe in template
}
```

### Unsubscribe Pattern

```typescript
export class Component implements OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.data = data);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## Testing

### Component Tests

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('AuthService', ['login']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [{ provide: AuthService, useValue: spy }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call login service on submit', () => {
    component.form.setValue({ email: 'test@test.com', password: 'password' });
    authService.login.and.returnValue(of({}));

    component.login();

    expect(authService.login).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password'
    });
  });
});
```

### Service Tests

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should return auth response on login', () => {
    const mockResponse = { accessToken: 'token', user: {} };

    service.login({ email: 'test@test.com', password: 'password' }).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
```

---

## Code Style

### TypeScript

```typescript
// Use strict typing
const userId: string = 'abc123';
const count: number = 10;
const isActive: boolean = true;

// Use interfaces for objects
interface User {
  id: string;
  email: string;
  name: string;
}

// Use readonly for immutable data
interface Config {
  readonly apiUrl: string;
  readonly maxRetries: number;
}

// Arrow functions for callbacks
users.filter((user: User) => user.isActive);

// Use optional chaining
const city = user?.address?.city;

// Use nullish coalescing
const name = user.name ?? 'Unknown';

// Use const for enums
const UserRole = {
  Admin: 'Admin',
  User: 'User',
} as const;
```

### Import Order

```typescript
// 1. Angular
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

// 2. RxJS
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// 3. Third-party
import { MatButtonModule } from '@angular/material/button';

// 4. Project
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

// 5. Relative
import { LoginFormComponent } from './login-form.component';
```

### Prettier Configuration (Already configured)

```json
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

---

## Summary Checklist

- [ ] Standalone components (preferred)
- [ ] Feature-based folder structure
- [ ] Proper naming conventions
- [ ] Async/await or Observables for async operations
- [ ] Proper unsubscription (takeUntil pattern)
- [ ] OnPush change detection where appropriate
- [ ] Reactive forms with validation
- [ ] Environment-based API URLs
- [ ] Error handling at service level
- [ ] Lazy loading for routes
- [ ] SCSS variables and mixins
- [ ] Unit tests for services and components

---

*Last Updated: 2026-05-02*