import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.scss']
})
export class ProfilePageComponent {
  editName = '';
  editEmail = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;

  get currentUser$() {
    return this.authService.currentUser$;
  }

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    // Initialize with current user
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.editName = user;
        this.editEmail = `${user}@example.com`; // Simulated email
      }
    });
  }

  updateProfile(): void {
    if (!this.editName?.trim()) {
      this.notificationService.show('Nome é obrigatório', 'error');
      return;
    }
    if (!this.editEmail?.trim()) {
      this.notificationService.show('Email é obrigatório', 'error');
      return;
    }

    this.loading = true;
    setTimeout(() => {
      this.authService.login(this.editName);
      this.notificationService.show('Perfil atualizado com sucesso!', 'success');
      this.loading = false;
    }, 500);
  }

  updatePassword(): void {
    if (!this.currentPassword?.trim()) {
      this.notificationService.show('Palavra-passe atual é obrigatória', 'error');
      return;
    }
    if (!this.newPassword?.trim()) {
      this.notificationService.show('Nova palavra-passe é obrigatória', 'error');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.notificationService.show('As palavras-passe não coincidem', 'error');
      return;
    }
    if (this.newPassword.length < 6) {
      this.notificationService.show('Palavra-passe deve ter pelo menos 6 caracteres', 'error');
      return;
    }

    this.loading = true;
    setTimeout(() => {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.notificationService.show('Palavra-passe alterada com sucesso!', 'success');
      this.loading = false;
    }, 500);
  }
}
