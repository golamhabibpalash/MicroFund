import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="user-layout">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [
    `
      .user-layout {
        min-height: 100vh;
      }
    `,
  ],
})
export class UserLayoutComponent {}
