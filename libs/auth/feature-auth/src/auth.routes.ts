import { Routes } from '@angular/router';
import { ConfirmEmailComponent } from './confirm-email/confirm-email.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { LoginComponent } from './login/login.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { RegisterComponent } from './register/register.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';

// Signing in and up, the email links, and the privacy policy: each at the
// site's top level (/login, /register...).
export const AUTH_ROUTES: Routes = [
  { path: 'login', title: 'Sign in', component: LoginComponent },
  { path: 'register', title: 'Sign up', component: RegisterComponent },
  // The link in a confirmation email.
  { path: 'confirm-email', title: 'Confirm your email', component: ConfirmEmailComponent },
  { path: 'forgot-password', title: 'Forgot your password?', component: ForgotPasswordComponent },
  // The link in a password reset email (?code=…), or the code typed.
  { path: 'reset-password', title: 'Choose a new password', component: ResetPasswordComponent },
  { path: 'privacy', title: 'Privacy policy', component: PrivacyComponent },
];
