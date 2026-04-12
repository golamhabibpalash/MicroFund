import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LogsActivityComponent } from './logs-activity.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild([{
       path: '',
       component: LogsActivityComponent
     }])
  ]
})
export class LogsActivityModule { }