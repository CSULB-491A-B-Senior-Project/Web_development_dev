import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../api.service';

@Component({
  standalone: true,
  selector: 'app-signup',
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
})
export class Signup {
  signupForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private router: Router
  ) {
    // Password regex from backend: must have digit and special char, 8-25 chars
    const passwordPattern = /^(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>?/\\|`~])[A-Za-z\d!@#$%^&*()_\-+=\[\]{};:'",.<>?/\\|`~]{8,25}$/;

    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.maxLength(50), Validators.minLength(1)]],
      lastName: ['', [Validators.required, Validators.maxLength(50), Validators.minLength(1)]],
      username: ['', [Validators.required, Validators.maxLength(24), Validators.minLength(1)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(25),
        Validators.pattern(passwordPattern)
      ]]
    });
  }

  onSignup(): void {
    if (this.signupForm.invalid) {
      Object.keys(this.signupForm.controls).forEach(key => {
        this.signupForm.get(key)?.markAsTouched();
      });
      this.errorMessage = 'Please fill in all fields correctly';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const registerData = {
      firstName: this.signupForm.value.firstName,
      lastName: this.signupForm.value.lastName,
      username: this.signupForm.value.username,
      email: this.signupForm.value.email,
      password: this.signupForm.value.password
    };

    this.apiService.register(registerData).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Registration successful!', response);
        this.router.navigate(['/explore']);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 409) {
          this.errorMessage = error.error?.message || 'Username or email already taken';
        } else {
          this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
        }
        console.error('Registration error:', error);
      }
    });
  }

  hasError(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getErrorMessage(fieldName: string): string {
    const field = this.signupForm.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return `${fieldName} is required`;
    if (field.errors['email']) return 'Invalid email format';
    if (field.errors['minlength']) {
      if (fieldName === 'password') return 'Password must be at least 8 characters';
      return `${fieldName} is too short`;
    }
    if (field.errors['maxlength']) {
      if (fieldName === 'password') return 'Password must be no more than 25 characters';
      return `${fieldName} is too long`;
    }
    if (field.errors['pattern'] && fieldName === 'password') {
      return 'Password must contain at least 1 digit and 1 special character';
    }

    return '';
  }
}
