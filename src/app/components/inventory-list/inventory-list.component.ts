import { Component, OnInit, OnDestroy, ChangeDetectorRef, ApplicationRef, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ItemsService } from '../../services/items.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../services/categories.service';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss']
})
export class InventoryListComponent implements OnInit, OnDestroy {
  private readonly API_URL = 'http://localhost:3000/api';
  items: any[] = [];
  filteredItems: any[] = [];
  loading = false;
  private _lastOwnUpdateTs: number | null = null;
  private subs: Subscription | null = null;
  // inline edit state
  editingId: any = null;
  editModel: any = null;

  // Filter and search
  searchQuery = '';
  selectedCategory = 'Todos';
  selectedSupplier = 'Todos';
  categories: string[] = ['Todos'];
  brands: string[] = [];
  suppliers: string[] = [];
  
  // Sorting
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  // Movement modal integration
  @Output() openMovementModal = new EventEmitter<any>();

  constructor(
    private itemsService: ItemsService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private appRef: ApplicationRef,
    private categoryService: CategoryService,
    private brandService: BrandService
  ) {}

  ngOnInit(): void {
    // initial load
    this.load();
    this.categoryService.categories$.subscribe(categories => {
      this.categories = ['Todos', ...categories.map(category => category.name)];
      if (!this.categories.includes(this.selectedCategory)) {
        this.selectedCategory = 'Todos';
      }
      this.updateFilteredItems();
    });
    this.categoryService.loadCategories();
    this.brandService.brands$.subscribe(brands => {
      this.brands = brands.map(brand => brand.name);
    });
    this.brandService.loadBrands();
    // subscribe to the shared ItemsService refresh observable
    // ignore refresh events that originate from this list (source === 'from-list')
    this.subs = this.itemsService.refresh$.subscribe((payload: any) => {
      // payload is { source?: string | null, ts: number } or null
      if (!payload) return;
      if (payload.source === 'inventory-list') return;
      // ignore refreshes that come immediately after our own update (within 250ms)
      if (payload.ts && this._lastOwnUpdateTs && Math.abs(payload.ts - this._lastOwnUpdateTs) < 250) return;
      this.load();
    });
    // if the list is still empty shortly after init, attempt another load (guard against timing)
    setTimeout(() => {
      if (!this.items || this.items.length === 0) {
        console.log('[InventoryList] empty after init, forcing additional load');
        this.load();
      }
    }, 220);
  }

  ngOnDestroy(): void {
    try {
      if (this.subs) this.subs.unsubscribe();
    } catch (e) {}
  }

  // start inline editing for a row
  edit(item: any) {
    this.editingId = item.id;
    // shallow copy to edit safely
    this.editModel = { ...item };
  }

  trackById(index: number, item: any) {
    // include a small render tick so we can force re-render of a row
    return `${item?.id}::${item?._tick || 0}`;
  }

  private bumpRenderTickFor(id: any) {
    const idx = this.items.findIndex(it => String(it.id) === String(id));
    if (idx >= 0) {
      const it = { ...this.items[idx] };
      it._tick = (it._tick || 0) + 1;
      this.items[idx] = it;
      // immutable replacement
      this.items = [...this.items];
      try { this.cd.detectChanges(); } catch (e) {}
    }
  }

  // cancel inline edit
  cancelEdit() {
    this.editingId = null;
    this.editModel = null;
  }

  // save inline edit (PUT to server or update localStorage)
  saveEdit() {
    if (!this.editModel) return;
    const id = this.editModel.id;
    const isLocal = String(id).startsWith('local-');
    if (isLocal) {
      console.error('Cannot edit local-only item. Recreate it so it exists in the backend.');
      this.cancelEdit();
      return;
    }

    // server-backed item: PUT
    this.http.put(`${this.API_URL}/items/${Number(id)}`, this.editModel).subscribe({ next: () => {
      // replace the item locally so the table updates instantly
      this.items = this.items.map(it => String(it.id) === String(id) ? { ...this.editModel } : it);
      // immutable update to trigger change detection
      this.items = [...this.items];
      console.log('[InventoryList] saved server edit, updated items count=', this.items.length);
      try { this.bumpRenderTickFor(id); } catch (e) {}
      try { this.cd.detectChanges(); } catch (e) {}
      this._lastOwnUpdateTs = Date.now();
      this.itemsService.triggerRefresh('inventory-list');
      this.cancelEdit();
      try { this.load(); } catch (e) {}
    }, error: (err) => {
      console.error('Failed PUT during saveEdit', err);
      this.cancelEdit();
    }});
  }

  load() {
    console.log('[InventoryList] load() start');
    this.loading = true;
    // try backend first, fallback to localStorage if unavailable
    this.http.get<any[]>(`${this.API_URL}/items`).subscribe({
      next: data => {
        this.items = data || [];
        this.updateSuppliersList();
        this.updateFilteredItems();
        this.loading = false;
        console.log('[InventoryList] load() got', this.items.length, 'items from backend');
        try { this.cd.detectChanges(); } catch (e) {}
        try { this.appRef.tick(); } catch (e) {}
      },
      error: () => {
        this.items = [];
        this.updateSuppliersList();
        this.updateFilteredItems();
        this.loading = false;
        console.error('[InventoryList] failed to load backend items');
        try { this.cd.detectChanges(); } catch (e) {}
        try { this.appRef.tick(); } catch (e) {}
      }
    });
  }

  remove(id: string) {
    // try backend delete; update in-memory list immediately so UI reflects change
    this.http.delete(`${this.API_URL}/items/${id}`).subscribe({ next: () => {
      this.items = this.items.filter(it => String(it.id) !== String(id));
      this.items = [...this.items];
      console.log('[InventoryList] deleted item (backend success), items count=', this.items.length);
      try { this.bumpRenderTickFor(id); } catch (e) {}
      try { this.cd.detectChanges(); } catch (e) {}
      this._lastOwnUpdateTs = Date.now();
      this.itemsService.triggerRefresh('inventory-list');
      try { this.load(); } catch (e) {}
    }, error: () => {
      console.error('[InventoryList] failed to delete backend item');
    }});
  }

  // Filter and search methods
  onSearchChange(): void {
    this.updateFilteredItems();
  }

  onCategoryChange(): void {
    this.updateFilteredItems();
  }

  onSupplierChange(): void {
    this.updateFilteredItems();
  }

  setSortBy(field: string): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.updateFilteredItems();
  }

  private updateFilteredItems(): void {
    let result = [...this.items];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query) ||
        item.supplier?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (this.selectedCategory !== 'Todos') {
      result = result.filter(item => item.category === this.selectedCategory);
    }

    // Apply supplier filter
    if (this.selectedSupplier !== 'Todos') {
      result = result.filter(item => item.supplier === this.selectedSupplier);
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[this.sortBy] || '';
      let bVal = b[this.sortBy] || '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      else if (aVal > bVal) comparison = 1;

      return this.sortOrder === 'asc' ? comparison : -comparison;
    });

    this.filteredItems = result;
    try { this.cd.detectChanges(); } catch (e) {}
  }

  isLowStock(item: any): boolean {
    return item.min_quantity && item.quantity < item.min_quantity;
  }

  showMovementModal(item: any): void {
    this.openMovementModal.emit(item);
  }

  private updateSuppliersList(): void {
    const suppliers = new Set<string>();
    suppliers.add('Todos');
    this.items.forEach(item => {
      if (item.supplier) {
        suppliers.add(item.supplier);
      }
    });
    this.suppliers = Array.from(suppliers).sort();
  }

  
}

