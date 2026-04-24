import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private toastr: ToastrService) {}

  success(message: string, title: string = 'Success') {
    this.toastr.success(message, title);
  }

  error(message: string, title: string = 'Error') {
    this.toastr.error(message, title);
  }

  warning(message: string, title: string = 'Warning') {
    this.toastr.warning(message, title);
  }

  info(message: string, title: string = 'Info') {
    this.toastr.info(message, title);
  }

  show(message: string, type: ToastType, title?: string) {
    switch (type) {
      case 'success':
        this.success(message, title);
        break;
      case 'error':
        this.error(message, title);
        break;
      case 'warning':
        this.warning(message, title);
        break;
      case 'info':
        this.info(message, title);
        break;
    }
  }
}