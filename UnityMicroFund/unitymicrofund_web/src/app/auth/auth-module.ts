import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing-module';
import { Login } from './login/login';
import { Register } from './register/register';
import { ForgotPassword } from './forgot-password/forgot-password';

@NgModule({
  declarations: [Login, Register, ForgotPassword],
  imports: [CommonModule, AuthRoutingModule],
})
export class AuthModule {}
