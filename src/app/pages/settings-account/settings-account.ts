import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-settings-account',
  templateUrl: './settings-account.html',
  styleUrls: ['./settings-account.scss'],
  imports: [RouterLink, ReactiveFormsModule, CommonModule],
})
export class SettingsAccount {
  // USER PROFILE DATA
  firstName: string = 'First';
  lastName: string = 'Last';
  email: string = 'email@email.com';
  username: string = 'username';

  // USER PASSWORD DATA
  oldPassword: string = '';
  newPassword: string = '';
  confirmNewPassword: string = '';

  // ERROR HANDLING
  atLeastOneRequiredError = false;
  invalidEmailError = false;
  passwordMatchError = false;
  show = false;

  // FORM GROUPS
  accountForm: FormGroup;
  passwordForm: FormGroup;

  constructor(private fb: FormBuilder) {
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

  // FUNCTION: UPDATE USER PROFILE
  updateUserProfile() {
    const { firstName, lastName, email, username } = this.accountForm.value;
    const emailControl = this.accountForm.controls['email'];

    if (!firstName && !lastName && !email && !username) {
      this.atLeastOneRequiredError = true;
      return;
    }
    if (email && emailControl.invalid) {
      this.invalidEmailError = true;
      emailControl.markAsTouched();
      return;
    }

    this.atLeastOneRequiredError = false;
    this.invalidEmailError = false;


    if (firstName) this.firstName = firstName;
    if (lastName) this.lastName = lastName;
    if (email) this.email = email;
    if (username) this.username = username;

    this.accountForm.reset();
  }

  // FUNCTION: UPDATE USER PASSWORD
  updateUserPassword() {
    const { newPassword, confirmNewPassword } = this.passwordForm.value;
    if (newPassword !== confirmNewPassword) {
      this.passwordMatchError = true;
      return;
    }
    this.passwordMatchError = false;
    if (newPassword == confirmNewPassword) {
      this.newPassword = newPassword;
    }

    this.passwordForm.reset();
  }

  // FUNCTION: TOGGLE PASSWORD VISIBILITY
  togglePasswordVisibility() {
    this.show = !this.show;
  }

  // FUNCTIONS: PASSWORD REQUIREMENTS
  minRequirement = false;
  maxRequirement = false;
  numberRequirement = false;
  specialCharRequirement = false;

  ngOnInit() {
    this.passwordForm.get('newPassword')?.valueChanges.subscribe(value => {
      this.minRequirement = value.length >= 8;
      this.maxRequirement = value.length <= 25;
      this.numberRequirement = /[0-9]/.test(value);
      this.specialCharRequirement = /[!@#$%^&*]/.test(value);
    });
  }
}
