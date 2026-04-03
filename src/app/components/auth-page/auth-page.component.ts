import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrls: ['./auth-page.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AuthPageComponent {
  // Landing page panel state
  panelOpen = false;
  activeTab: 'login' | 'register' = 'login';

  togglePanel(): void {
    this.panelOpen = !this.panelOpen;
  }

  // Register form
  registerName = '';
  registerEmail = '';
  registerPassword = '';
  registerPassword2 = '';

  // Login form
  loginEmail = '';
  loginPassword = '';

  loading = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  register(): void {
    if (!this.registerName?.trim()) {
      this.notificationService.show('Nome é obrigatório', 'error');
      return;
    }
    if (!this.registerEmail?.trim()) {
      this.notificationService.show('Email é obrigatório', 'error');
      return;
    }
    if (!this.registerPassword?.trim()) {
      this.notificationService.show('Palavra-passe é obrigatória', 'error');
      return;
    }
    if (this.registerPassword !== this.registerPassword2) {
      this.notificationService.show('As palavras-passe não coincidem', 'error');
      return;
    }

    this.loading = true;
    // Simulate registration (in real app, would call backend)
    setTimeout(() => {
      this.authService.login(this.registerName);
      this.notificationService.show('Registado com sucesso!', 'success');
      this.loading = false;
    }, 500);
  }

  login(): void {
    if (!this.loginEmail?.trim()) {
      this.notificationService.show('Email é obrigatório', 'error');
      return;
    }
    if (!this.loginPassword?.trim()) {
      this.notificationService.show('Palavra-passe é obrigatória', 'error');
      return;
    }

    this.loading = true;
    // Simulate login (in real app, would call backend)
    setTimeout(() => {
      const username = this.loginEmail.split('@')[0];
      this.authService.login(username);
      this.notificationService.show('Login realizado com sucesso!', 'success');
      this.loading = false;
    }, 500);
  }
}
