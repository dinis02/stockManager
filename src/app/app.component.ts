import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { InventoryFormComponent } from './components/inventory-form/inventory-form.component';
import { InventoryListComponent } from './components/inventory-list/inventory-list.component';
import { CategoriesModalComponent } from './components/categories-modal/categories-modal.component';
import { BrandsModalComponent } from './components/brands-modal/brands-modal.component';
import { MovementModalComponent } from './components/movement-modal/movement-modal.component';
import { HistoryViewComponent } from './components/history-view/history-view.component';
import { AuthPageComponent } from './components/auth-page/auth-page.component';
import { ProfilePageComponent } from './components/profile-page/profile-page.component';
import { ItemsService } from './services/items.service';
import { NotificationService } from './services/notification.service';
import { AuthService } from './services/auth.service';
import { MovementService, Movement } from './services/movement.service';
import { API_BASE } from './api-base';

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
    BrandsModalComponent,
    MovementModalComponent,
    HistoryViewComponent,
    AuthPageComponent,
    ProfilePageComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly API_URL = API_BASE;
  @ViewChild(CategoriesModalComponent) categoriesModal!: CategoriesModalComponent;
  @ViewChild(BrandsModalComponent) brandsModal!: BrandsModalComponent;
  @ViewChild(MovementModalComponent) movementModal!: MovementModalComponent;
  @ViewChild(HistoryViewComponent) historyView!: HistoryViewComponent;

  title = 'stockManager';
  view: 'dashboard' | 'add' | 'table' | 'history' | 'profile' = 'dashboard';
  selectedItemForMovement: any = null;
  mobileSidebarOpen = false;
  globalSearch = '';
  dashboardItems: any[] = [];
  dashboardMovements: Movement[] = [];
  dashboardLoading = false;

  select(view: 'dashboard' | 'add' | 'table' | 'history' | 'profile') {
    this.view = view;
    this.mobileSidebarOpen = false;
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    if (view === 'table') {
      this.itemsService.triggerRefresh('app');
      setTimeout(() => this.itemsService.triggerRefresh('app'), 180);
    }
    if (view === 'dashboard') {
      this.loadDashboard();
    }
    if (view === 'history') {
      setTimeout(() => this.historyView?.loadEvents(), 0);
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
    private authService: AuthService,
    private http: HttpClient,
    private movementService: MovementService
  ) {
    this.itemsService.edit$.subscribe(item => {
      this.currentEdit = item || null;
      if (item) this.select('add');
    });
    this.itemsService.refresh$.subscribe(() => {
      this.currentEdit = null;
      this.loadDashboard();
    });
    this.loadDashboard();
  }

  get activeTitle(): string {
    const titles = {
      dashboard: 'Dashboard',
      add: this.currentEdit ? 'Editar produto' : 'Adicionar produto',
      table: 'Produtos',
      history: 'Historico',
      profile: 'Perfil'
    };
    return titles[this.view];
  }

  get totalProducts(): number {
    return this.dashboardItems.length;
  }

  get totalUnits(): number {
    return this.dashboardItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  get lowStockCount(): number {
    return this.dashboardItems.filter(item => Number(item.min_quantity || 0) > 0 && Number(item.quantity || 0) < Number(item.min_quantity || 0)).length;
  }

  get inventoryValue(): number {
    return this.dashboardItems.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0)), 0);
  }

  get recentItems(): any[] {
    return [...this.dashboardItems]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 5);
  }

  get recentMovements(): Movement[] {
    return [...this.dashboardMovements]
      .sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0))
      .slice(0, 5);
  }

  get currentUserInitial(): string {
    const user = this.authService.getCurrentUser() || 'D';
    return user.trim().charAt(0).toUpperCase();
  }

  loadDashboard(): void {
    this.dashboardLoading = true;
    this.http.get<any[]>(`${this.API_URL}/items`).subscribe({
      next: items => {
        this.dashboardItems = items || [];
        this.dashboardLoading = false;
      },
      error: () => {
        this.dashboardItems = [];
        this.dashboardLoading = false;
      }
    });
    this.movementService.getMovements().subscribe({
      next: movements => this.dashboardMovements = movements || [],
      error: () => this.dashboardMovements = []
    });
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  }

  formatMovementDate(timestamp: number): string {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleDateString('pt-PT');
  }

  showCategoriesModal(): void {
    this.categoriesModal?.open();
  }

  showBrandsModal(): void {
    this.brandsModal?.open();
  }

  logout(): void {
    this.authService.logout();
  }

  openMovement(item: any): void {
    this.selectedItemForMovement = item;
    this.movementModal?.open();
  }

  onMovementAdded(): void {
    this.itemsService.triggerRefresh('movement-modal');
    this.loadDashboard();
    this.historyView?.loadEvents();
  }
}
