import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { InventoryFormComponent } from './components/inventory-form/inventory-form.component';
import { InventoryListComponent } from './components/inventory-list/inventory-list.component';
import { CategoriesModalComponent } from './components/categories-modal/categories-modal.component';
import { MovementModalComponent } from './components/movement-modal/movement-modal.component';
import { HistoryViewComponent } from './components/history-view/history-view.component';
import { AuthPageComponent } from './components/auth-page/auth-page.component';
import { ProfilePageComponent } from './components/profile-page/profile-page.component';
import { ItemsService } from './services/items.service';
import { NotificationService } from './services/notification.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    InventoryFormComponent,
    InventoryListComponent,
    CategoriesModalComponent,
    MovementModalComponent,
    HistoryViewComponent,
    AuthPageComponent,
    ProfilePageComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild(CategoriesModalComponent) categoriesModal!: CategoriesModalComponent;
  @ViewChild(MovementModalComponent) movementModal!: MovementModalComponent;

  title = 'stockManager';
  view: 'add' | 'table' | 'history' | 'profile' = 'add';
  selectedItemForMovement: any = null;

  select(view: 'add' | 'table' | 'history' | 'profile') {
    this.view = view;
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    if (view === 'table') {
      this.itemsService.triggerRefresh('app');
      setTimeout(() => this.itemsService.triggerRefresh('app'), 180);
    }
  }

  currentEdit: any = null;

  get notifications$() {
    return this.notificationService.notifications$;
  }

  get currentUser$() {
    return this.authService.currentUser$;
  }

  constructor(
    private itemsService: ItemsService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {
    this.itemsService.edit$.subscribe(item => {
      this.currentEdit = item || null;
      if (item) this.select('add');
    });
    this.itemsService.refresh$.subscribe(() => {
      this.currentEdit = null;
    });
  }

  showCategoriesModal(): void {
    this.categoriesModal?.open();
  }

  logout(): void {
    this.authService.logout();
  }

  openMovement(item: any): void {
    this.selectedItemForMovement = item;
    this.movementModal?.open();
  }
}
