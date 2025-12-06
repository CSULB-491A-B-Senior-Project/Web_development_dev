import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { UserAccount } from '../../models/account.models';
import { ApiService } from '../../api.service';
import { SidebarComponent } from '../../ui/sidebar/sidebar';

@Component({
  selector: 'app-settings-account',
  templateUrl: './settings-account.html',
  styleUrls: ['./settings-account.scss'],
  imports: [
    CommonModule,
    // RouterLink,
    ReactiveFormsModule,
    SidebarComponent
  ],
  standalone: true,
})
export class SettingsAccount implements OnInit {
  // CURRENT ACCOUNT
  currentAccount!: UserAccount;

  // USER PROFILE DATA
  firstName = signal('');
  lastName = signal('');
  email = signal('');
  username = signal('');

  // USER PASSWORD DATA
  oldPassword: string = '';
  newPassword: string = '';
  confirmNewPassword: string = '';

  // ACCOUNT FORM ERRORS
  atLeastOneRequiredError = false;
  invalidEmailError = false;
  usernameTakenError = false;
  accountUpdateSuccess = false;
  accountUpdateError = false;

  // FORM GROUPS
  accountForm: FormGroup;
  passwordForm: FormGroup;

  // PASSWORD FORM ERRORS
  passwordMatchError = false;
  passwordncorrectError = false;
  passwordUpdateSuccess = false;
  show = false;
  minRequirement = false;
  maxRequirement = false;
  numberRequirement = false;
  specialCharRequirement = false;

  constructor(
    private fb: FormBuilder,
    private accountService: AccountService,
    private apiService: ApiService,
    private router: Router
  ) {
    // ACCOUNT FORM GROUP
    this.accountForm = this.fb.group({
      firstName: [''],
      lastName: [''],
      email: ['', Validators.email],
      username: [''],
    });

    // PASSWORD FORM GROUP
    this.passwordForm = this.fb.group({
      oldPassword: ['', Validators.required],
      newPassword: ['', 
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(25),
          Validators.pattern(/^(?=.*[0-9])(?=.*[!@#$%^&*])/),
        ],],
      confirmNewPassword: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.accountService.getAccount().subscribe((account:UserAccount) => {
      this.currentAccount = account;

      this.firstName.set(account.firstName);
      this.lastName.set(account.lastName);
      this.email.set(account.email);
      this.username.set(account.username);
    });

    this.passwordForm.get('newPassword')?.valueChanges.subscribe(value => {
      if (!value){
        this.minRequirement = false;
        this.maxRequirement = false;
        this.numberRequirement = false;
        this.specialCharRequirement = false;
        return;
      }
      this.minRequirement = value.length >= 8;
      this.maxRequirement = value.length <= 25;
      this.numberRequirement = /[0-9]/.test(value);
      this.specialCharRequirement = /[!@#$%^&*]/.test(value);
    });
  }

  // FUNCTION: LOGOUT USER
  onLogout(): void {
    this.apiService.logout();
    this.router.navigate(['/login']);
  }

  // FUNCTION: UPDATE USER PROFILE
  updateUserProfile() {
    const { firstName, lastName, email, username } = this.accountForm.value;
    const emailControl = this.accountForm.get('email');

    // CHECK: AT LEAST ONE REQUIRED
    if (!firstName && !lastName && !email && !username) {
      this.atLeastOneRequiredError = true;
      return;
    }
    this.atLeastOneRequiredError = false;

    // CHECK: VALID EMAIL
    if (email && emailControl?.invalid) {
      this.invalidEmailError = true;
      return;
    }
    this.invalidEmailError = false;

    const payload: Partial<UserAccount> = {};
    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;
    if (email) payload.email = email;
    if (username) payload.username = username;
    const updatedAccount: UserAccount = {
      ...this.currentAccount,
      ...payload
    };

    // UPDATE ACCOUNT WITH API
    this.accountService.updateAccount(updatedAccount).subscribe({
      next: (updated: UserAccount) => {
        this.accountUpdateSuccess = true;
        this.atLeastOneRequiredError = false;
        this.invalidEmailError = false;
        this.usernameTakenError = false;
        this.accountUpdateError = false;
        console.log('Account successfully updated.');

        this.firstName.set(updated.firstName);
        this.lastName.set(updated.lastName);
        this.email.set(updated.email);
        this.username.set(updated.username);

        this.accountForm.reset();
        this.accountForm.markAsPristine();
      },
      error: (err) => {
        if (err.status === 409) {
          this.usernameTakenError = true;
          console.error('Username is already taken:', err);
          return;
        } else {
          this.accountUpdateError = true;
          console.error('Account update failed:', err);
        }
      }
    });
    this.accountForm.reset();
  }

  // FUNCTION: UPDATE USER PASSWORD
  updateUserPassword() {
    const { oldPassword, newPassword, confirmNewPassword } = this.passwordForm.value;
    
    // CHECK: PASSWORDS MATCH
    if (newPassword !== confirmNewPassword) {
      this.passwordMatchError = true;
      return;
    }
    this.passwordMatchError = false;
    
    // UPDATE PASSWORD WITH API
    this.accountService.changePassword(oldPassword, newPassword).subscribe({
      next: () => {
        this.passwordUpdateSuccess = true;
        this.passwordncorrectError = false;
        console.log('Password successfully updated.');
        this.passwordForm.reset();
      },
      error: (err) => {
        if (err.status === 400) {
          this.passwordncorrectError = true;
          console.error('Current password is incorrect:', err);
        } else {
          console.error('Password update failed:', err);
        }
      }
    });
    this.passwordForm.reset();
  }

  // FUNCTION: TOGGLE PASSWORD VISIBILITY
  togglePasswordVisibility() {
    this.show = !this.show;
  }
}
