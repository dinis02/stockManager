import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Brand, BrandService } from '../../services/brand.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-brands-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <div class="modal-eyebrow">Gestao</div>
            <h3>Marcas</h3>
          </div>
          <button class="btn btn--icon-circle" type="button" (click)="close()" aria-label="Fechar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="modal-body">
          <div class="add-section">
            <input
              [(ngModel)]="newBrandName"
              type="text"
              placeholder="Nova marca"
              (keyup.enter)="addBrand()"
            />
            <button class="btn btn-primary" type="button" (click)="addBrand()" [disabled]="!newBrandName?.trim()">
              Adicionar
            </button>
          </div>

          <div class="items-list">
            <div class="table-title">Marcas existentes</div>

            <div class="brand-item" *ngFor="let brand of brands">
              <ng-container *ngIf="editingId !== brand.id; else editTpl">
                <span>{{ brand.name }}</span>
                <div class="row-actions">
                  <button class="btn btn--icon-circle" type="button" (click)="startEdit(brand)" aria-label="Editar" title="Editar">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>
                  </button>
                  <button class="btn btn--icon-circle btn--danger" type="button" (click)="deleteBrand(brand.id)" aria-label="Apagar" title="Apagar">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </ng-container>

              <ng-template #editTpl>
                <input [(ngModel)]="editName" type="text" (keyup.enter)="saveEdit(brand.id)" />
                <div class="row-actions">
                  <button class="btn btn--icon-circle btn--primary" type="button" (click)="saveEdit(brand.id)" aria-label="Guardar" title="Guardar">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20 6-11 11-5-5"/></svg>
                  </button>
                  <button class="btn btn--icon-circle btn--ghost" type="button" (click)="cancelEdit()" aria-label="Cancelar" title="Cancelar">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </ng-template>
            </div>

            <div class="empty-state" *ngIf="!brands.length">Ainda nao existem marcas.</div>
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
      background: rgba(27, 23, 20, 0.28);
      padding: 18px;
    }

    .modal-content {
      width: min(92vw, 520px);
      max-height: 86vh;
      overflow-y: auto;
      background: var(--admin-surface);
      border: 1px solid var(--admin-border);
      border-radius: 3px;
      box-shadow: 0 18px 50px rgba(60, 42, 28, 0.16);
    }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 24px;
      border-bottom: 1px solid var(--admin-border);
    }

    .modal-eyebrow,
    .table-title {
      color: var(--admin-muted);
      font-size: 9px;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      font-weight: 300;
    }

    h3 {
      margin: 4px 0 0;
      font-family: 'Cormorant Garamond', serif;
      font-size: 26px;
      font-weight: 400;
      color: var(--admin-text);
    }

    .modal-body {
      padding: 24px;
    }

    .add-section {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      margin-bottom: 24px;
    }

    .items-list {
      display: grid;
      gap: 8px;
    }

    .table-title {
      margin-bottom: 6px;
    }

    .brand-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 10px 12px;
      background: var(--admin-surface-soft);
      border: 1px solid var(--admin-border-soft);
      border-radius: 4px;
      color: var(--admin-text-soft);
      font-size: 12px;
    }

    .row-actions {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .empty-state {
      padding: 22px;
      text-align: center;
      color: var(--admin-muted);
      font-size: 12px;
    }

    @media (max-width: 520px) {
      .add-section,
      .brand-item {
        grid-template-columns: 1fr;
      }

      .row-actions {
        justify-content: flex-end;
      }
    }
  `]
})
export class BrandsModalComponent implements OnInit {
  isOpen = false;
  brands: Brand[] = [];
  newBrandName = '';
  editingId: number | null = null;
  editName = '';

  constructor(
    private brandService: BrandService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.brandService.brands$.subscribe(brands => {
      this.brands = brands;
    });
  }

  open(): void {
    this.brandService.loadBrands();
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
    this.newBrandName = '';
    this.cancelEdit();
  }

  addBrand(): void {
    const name = this.newBrandName.trim();
    if (!name) return;
    this.brandService.addBrand(name).subscribe(
      () => {
        this.notificationService.show('Marca adicionada com sucesso', 'success');
        this.newBrandName = '';
      },
      (err) => {
        if (err.status === 409) {
          this.notificationService.show('Marca ja existe', 'error');
        } else {
          this.notificationService.show('Erro ao adicionar marca', 'error');
        }
      }
    );
  }

  startEdit(brand: Brand): void {
    if (!brand.id) return;
    this.editingId = brand.id;
    this.editName = brand.name;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editName = '';
  }

  saveEdit(id?: number): void {
    if (!id) return;
    const name = this.editName.trim();
    if (!name) return;
    this.brandService.updateBrand(id, name).subscribe(
      () => {
        this.notificationService.show('Marca atualizada com sucesso', 'success');
        this.cancelEdit();
      },
      (err) => {
        if (err.status === 409) {
          this.notificationService.show('Marca ja existe', 'error');
        } else {
          this.notificationService.show('Erro ao atualizar marca', 'error');
        }
      }
    );
  }

  deleteBrand(id?: number): void {
    if (!id) return;
    if (confirm('Tem a certeza que quer apagar esta marca?')) {
      this.brandService.deleteBrand(id).subscribe(
        () => {
          this.notificationService.show('Marca apagada com sucesso', 'success');
          if (this.editingId === id) this.cancelEdit();
        },
        () => {
          this.notificationService.show('Erro ao apagar marca', 'error');
        }
      );
    }
  }
}
