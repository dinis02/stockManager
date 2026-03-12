import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService, Category } from '../../services/categories.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-categories-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="isOpen" (click)="close()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Gerenciar Categorias</h3>
          <button class="btn btn--icon-circle btn--sm" (click)="close()" aria-label="Fechar">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.71 2.88 18.3 9.18 12 2.88 5.71 4.29 4.3 10.59 10.59 16.88 4.3z"/></svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="add-category-section">
            <input 
              [(ngModel)]="newCategoryName" 
              type="text" 
              placeholder="Nova categoria" 
              (keyup.enter)="addCategory()"
            />
            <button class="btn btn--primary" (click)="addCategory()" [disabled]="!newCategoryName?.trim()">
              Adicionar
            </button>
          </div>

          <div class="categories-list">
            <h4>Categorias existentes:</h4>
            <div class="category-item" *ngFor="let cat of categories">
              <span>{{ cat.name }}</span>
              <button class="btn btn--icon-circle btn--sm btn--danger" (click)="deleteCategory(cat.id)" aria-label="Apagar">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
              </button>
            </div>
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
      max-height: 80vh;
      overflow-y: auto;
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

    .add-category-section {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .add-category-section input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .categories-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .categories-list h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
    }

    .category-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
      gap: 10px;
    }

    .category-item span {
      flex: 1;
    }
  `]
})
export class CategoriesModalComponent implements OnInit {
  isOpen = false;
  categories: Category[] = [];
  newCategoryName = '';

  constructor(
    private categoryService: CategoryService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.categoryService.categories$.subscribe(cats => {
      this.categories = cats;
    });
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
    this.newCategoryName = '';
  }

  addCategory(): void {
    if (!this.newCategoryName?.trim()) return;
    this.categoryService.addCategory(this.newCategoryName).subscribe(
      () => {
        this.notificationService.show('Categoria adicionada com sucesso', 'success');
        this.newCategoryName = '';
      },
      (err) => {
        if (err.status === 409) {
          this.notificationService.show('Categoria já existe', 'error');
        } else {
          this.notificationService.show('Erro ao adicionar categoria', 'error');
        }
      }
    );
  }

  deleteCategory(id: number): void {
    if (confirm('Tem a certeza que quer apagar esta categoria?')) {
      this.categoryService.deleteCategory(id).subscribe(
        () => {
          this.notificationService.show('Categoria apagada com sucesso', 'success');
        },
        () => {
          this.notificationService.show('Erro ao apagar categoria', 'error');
        }
      );
    }
  }
}
