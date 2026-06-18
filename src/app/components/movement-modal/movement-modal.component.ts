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
          <div>
            <div class="modal-eyebrow">Movimentacao</div>
            <h3>{{ item?.name || 'Produto' }}</h3>
          </div>
          <button class="btn btn--icon-circle" type="button" (click)="close()" aria-label="Fechar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="info-section">
            <div class="info-row">
              <span>Stock atual</span>
              <strong>{{ item?.quantity || 0 }} {{ item?.unit || 'un' }}</strong>
            </div>
            <div class="info-row">
              <span>Stock minimo</span>
              <strong>{{ item?.min_quantity || 0 }} {{ item?.unit || 'un' }}</strong>
            </div>
            <p *ngIf="(item?.quantity || 0) < (item?.min_quantity || 0)" class="low-stock-warning">
              Stock baixo
            </p>
          </div>

          <div class="movement-section">
            <div class="movement-tabs">
              <button
                type="button"
                [class.active]="movementType === 'entry'"
                (click)="movementType = 'entry'"
                class="tab-btn tab-entry"
              >
                + Entrada
              </button>
              <button
                type="button"
                [class.active]="movementType === 'exit'"
                (click)="movementType = 'exit'"
                class="tab-btn tab-exit"
              >
                - Saida
              </button>
            </div>

            <div class="form-group">
              <label>Quantidade</label>
              <input
                [(ngModel)]="quantity"
                type="number"
                min="1"
                placeholder="0"
              />
            </div>

            <div class="form-group">
              <label>Observacoes (opcional)</label>
              <input
                [(ngModel)]="notes"
                type="text"
                placeholder="Deixar nota..."
              />
            </div>

            <button
              type="button"
              class="submit-btn"
              [class.exit]="movementType === 'exit'"
              (click)="saveMovement()"
              [disabled]="!quantity || quantity <= 0"
            >
              {{ movementType === 'entry' ? 'Registar Entrada' : 'Registar Saida' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(27, 23, 20, 0.34);
    }

    .modal-content {
      width: min(92vw, 460px);
      max-height: 86vh;
      overflow-y: auto;
      background: var(--admin-surface);
      border: 1px solid var(--admin-border);
      border-radius: 3px;
      box-shadow: 0 18px 50px rgba(60, 42, 28, 0.16);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      padding: 24px;
      border-bottom: 1px solid var(--admin-border);
    }

    .modal-eyebrow {
      color: var(--admin-muted);
      font-size: 9px;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      font-weight: 300;
    }

    .modal-header h3 {
      margin: 4px 0 0;
      color: var(--admin-text);
      font-family: 'Cormorant Garamond', serif;
      font-size: 26px;
      line-height: 1.15;
      font-weight: 400;
    }

    .modal-body {
      padding: 24px;
    }

    .info-section {
      display: grid;
      gap: 9px;
      margin-bottom: 20px;
      padding: 14px 16px;
      background: var(--admin-surface-soft);
      border: 1px solid var(--admin-border-soft);
      border-radius: 4px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--admin-muted);
      font-size: 11px;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

    .info-row strong {
      color: var(--admin-text-soft);
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0;
      text-transform: none;
    }

    .low-stock-warning {
      margin: 4px 0 0;
      color: var(--admin-danger);
      font-size: 11px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .movement-section {
      display: grid;
      gap: 15px;
    }

    .movement-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .tab-btn {
      min-height: 48px;
      border: 1px solid var(--admin-border-soft);
      background: rgba(127, 93, 64, 0.05);
      border-radius: 4px;
      color: var(--admin-text-soft);
      font-size: 12px;
      font-weight: 400;
      letter-spacing: 0.5px;
      transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
    }

    .tab-entry.active {
      border-color: var(--admin-success);
      color: var(--admin-success);
      background: rgba(63, 122, 85, 0.08);
    }

    .tab-exit.active {
      border-color: var(--admin-danger);
      color: var(--admin-danger);
      background: rgba(160, 48, 48, 0.08);
    }

    .form-group {
      display: grid;
      gap: 7px;
    }

    .form-group label {
      font-size: 9px;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      color: var(--admin-muted);
      font-weight: 300;
    }

    .form-group input {
      padding: 9px 12px;
      border: 1px solid var(--admin-border-soft);
      border-radius: 4px;
      background: var(--admin-surface-soft);
      color: var(--admin-text-soft);
      font-size: 12px;
    }

    .submit-btn {
      min-height: 38px;
      border: 1px solid var(--admin-success);
      border-radius: 5px;
      background: var(--admin-success);
      color: #fffdfc;
      font-size: 11px;
      font-weight: 400;
      letter-spacing: 0.7px;
      transition: opacity 160ms ease;
    }

    .submit-btn.exit {
      border-color: var(--admin-danger);
      background: var(--admin-danger);
    }

    .submit-btn:hover:not(:disabled) {
      opacity: 0.9;
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      this.notificationService.show('Quantidade invalida', 'error');
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
          `${this.movementType === 'entry' ? 'Entrada' : 'Saida'} registada com sucesso`,
          'success'
        );
        this.movementAdded.emit();
        this.close();
      },
      (err) => {
        const message = err?.error?.error;
        if (message === 'product not found') {
          this.notificationService.show('Produto nao encontrado no backend. Crie novamente o produto.', 'error');
        } else if (message === 'insufficient stock') {
          this.notificationService.show('Stock insuficiente para registar saida', 'error');
        } else {
          this.notificationService.show('Erro ao registar movimentacao', 'error');
        }
      }
    );
  }
}
