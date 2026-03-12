import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Login</h3>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>Utilizador:</label>
            <input 
              [(ngModel)]="username" 
              type="text" 
              placeholder="Digite o seu nome"
              (keyup.enter)="login()"
            />
          </div>

          <button 
            class="btn btn--primary btn--block" 
            (click)="login()"
            [disabled]="!username?.trim()"
          >
            Entrar
          </button>

          <p class="note">Este é um acesso simplificado. Pode utilizar qualquer nome.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 350px;
      width: 90%;
    }

    .modal-header {
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 20px;
    }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
    }

    .form-group input {
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .btn--block {
      width: 100%;
    }

    .note {
      font-size: 12px;
      color: #999;
      margin: 0;
      text-align: center;
    }
  `]
})
export class LoginModalComponent {
  isOpen = false;
  username = '';

  constructor(private authService: AuthService) {}

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  login(): void {
    if (!this.username?.trim()) return;
    this.authService.login(this.username);
    this.username = '';
    this.close();
  }
}
