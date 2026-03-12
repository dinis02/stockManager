import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MovementService } from '../../services/movement.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-movement-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ item?.name }} - Movimentação de Stock</h3>
          <button class="btn btn--icon-circle btn--sm" (click)="close()" aria-label="Fechar">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.71 2.88 18.3 9.18 12 2.88 5.71 4.29 4.3 10.59 10.59 16.88 4.3z"/></svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="info-section">
            <p><strong>Stock atual:</strong> {{ item?.quantity || 0 }} {{ item?.unit }}</p>
            <p><strong>Stock mínimo:</strong> {{ item?.min_quantity || 0 }} {{ item?.unit }}</p>
            <p *ngIf="(item?.quantity || 0) < (item?.min_quantity || 0)" class="low-stock-warning">
              ⚠️ Stock baixo!
            </p>
          </div>

          <div class="movement-section">
            <div class="movement-tabs">
              <button 
                [class.active]="movementType === 'entry'" 
                (click)="movementType = 'entry'"
                class="tab-btn tab-entry"
              >
                + Entrada
              </button>
              <button 
                [class.active]="movementType === 'exit'" 
                (click)="movementType = 'exit'"
                class="tab-btn tab-exit"
              >
                - Saída
              </button>
            </div>

            <div class="form-group">
              <label>Quantidade:</label>
              <input 
                [(ngModel)]="quantity" 
                type="number" 
                min="1" 
                placeholder="0"
              />
            </div>

            <div class="form-group">
              <label>Observações (opcional):</label>
              <input 
                [(ngModel)]="notes" 
                type="text" 
                placeholder="Deixar nota..."
              />
            </div>

            <button 
              class="btn" 
              [ngClass]="movementType === 'entry' ? 'btn--success' : 'btn--warning'"
              (click)="saveMovement()"
              [disabled]="!quantity || quantity <= 0"
            >
              {{ movementType === 'entry' ? 'Registar Entrada' : 'Registar Saída' }}
            </button>
          </div>
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
      max-width: 400px;
      width: 90%;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .modal-body {
      padding: 20px;
    }

    .info-section {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .info-section p {
      margin: 8px 0;
    }

    .low-stock-warning {
      color: #d32f2f;
      font-weight: 600;
    }

    .movement-section {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .movement-tabs {
      display: flex;
      gap: 10px;
    }

    .tab-btn {
      flex: 1;
      padding: 12px;
      border: 2px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s;
    }

    .tab-btn.active {
      border-color: #333;
      background: #f5f5f5;
    }

    .tab-entry.active {
      border-color: #2e7d32;
      background: #e8f5e9;
    }

    .tab-exit.active {
      border-color: #c62828;
      background: #ffebee;
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
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .btn--success {
      background: #2e7d32;
      color: white;
    }

    .btn--success:hover:not(:disabled) {
      background: #1b5e20;
    }

    .btn--warning {
      background: #f57c00;
      color: white;
    }

    .btn--warning:hover:not(:disabled) {
      background: #e65100;
    }
  `]
})
export class MovementModalComponent {
  @Input() item: any;
  @Output() movementAdded = new EventEmitter<void>();

  isOpen = false;
  movementType: 'entry' | 'exit' = 'entry';
  quantity = 0;
  notes = '';

  constructor(
    private movementService: MovementService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  open(): void {
    this.isOpen = true;
    this.resetForm();
  }

  close(): void {
    this.isOpen = false;
    this.resetForm();
  }

  resetForm(): void {
    this.quantity = 0;
    this.notes = '';
    this.movementType = 'entry';
  }

  saveMovement(): void {
    if (!this.quantity || this.quantity <= 0) {
      this.notificationService.show('Quantidade inválida', 'error');
      return;
    }

    const username = this.authService.getCurrentUser();
    this.movementService.addMovement(
      this.item.id,
      this.movementType,
      this.quantity,
      username,
      this.notes || undefined
    ).subscribe(
      () => {
        this.notificationService.show(
          `${this.movementType === 'entry' ? 'Entrada' : 'Saída'} registada com sucesso`,
          'success'
        );
        this.movementAdded.emit();
        this.close();
      },
      () => {
        this.notificationService.show('Erro ao registar movimentação', 'error');
      }
    );
  }
}
