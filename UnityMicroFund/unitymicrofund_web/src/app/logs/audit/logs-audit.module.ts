import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogsAuditComponent } from './logs-audit.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([{
       path: '',
       component: LogsAuditComponent
     }])
  ]
})
export class LogsAuditModule { }