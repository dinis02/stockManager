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
  loginEmail = '';
  loginPassword = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  login(): void {
    if (!this.loginEmail?.trim()) {
      this.notificationService.show('Email e obrigatorio', 'error');
      return;
    }
    if (!this.loginPassword?.trim()) {
      this.notificationService.show('Palavra-passe e obrigatoria', 'error');
      return;
    }

    this.loading = true;
    setTimeout(() => {
      const username = this.loginEmail.split('@')[0];
      this.authService.login(username);
      this.notificationService.show('Login realizado com sucesso!', 'success');
      this.loading = false;
    }, 500);
  }
}
