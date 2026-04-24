import { Component, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('unitymicrofund_web');

  ngOnInit() {
    console.log('=== APP INITIALIZED ===');
    console.log('LocalStorage keys:', Object.keys(localStorage));
    const token = localStorage.getItem('access_token');
    console.log('Token on app init:', !!token);
    if (token) {
      console.log('Token preview:', token.substring(0, 30) + '...');
    }
  }
}
