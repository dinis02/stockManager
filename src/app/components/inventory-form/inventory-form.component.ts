import { Component, Input } from '@angular/core';
import { ItemsService } from '../../services/items.service';
import { NotificationService } from '../../services/notification.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { Category, CategoryService } from '../../services/categories.service';
import { Brand, BrandService } from '../../services/brand.service';
import { API_BASE } from '../../api-base';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './inventory-form.component.html',
  styleUrls: ['./inventory-form.component.scss']
})
export class InventoryFormComponent {
  private readonly API_URL = API_BASE;
  categories: Category[] = [];
  brands: Brand[] = [];

  item: any = {
    date: new Date().toISOString().slice(0, 10),
    name: '',
    brand: '',
    category: 'Outros',
    quantity: 1,
    min_quantity: 0,
    unit: 'un',
    supplier: '',
    price: null,
    notes: ''
  };

  saving = false;

  @Input()
  set editItem(value: any) {
    if (value) {
      // populate form with a shallow copy
      this.item = { ...value };
    }
  }

  constructor(
    private http: HttpClient,
    private itemsService: ItemsService,
    private notificationService: NotificationService,
    private categoryService: CategoryService,
    private brandService: BrandService
  ) {
    this.categoryService.categories$.subscribe(categories => {
      this.categories = categories;
      if (!this.item.category && categories.length) {
        this.item.category = categories[0].name;
      }
    });
    this.categoryService.loadCategories();
    this.brandService.brands$.subscribe(brands => {
      this.brands = brands;
    });
    this.brandService.loadBrands();
  }

  save() {
    // basic client-side validation
    if (!this.item.name || !this.item.quantity) {
      // keep a minimal client-side guard; do not show messages
      return;
    }

    console.log('Saving item', this.item);
    this.saving = true;
    // if item has an id, attempt to update (PUT) on backend or update localStorage
    if (this.item.id) {
      const isLocal = String(this.item.id).startsWith('local-');
      if (isLocal) {
        // update localStorage entry
        try {
          const raw = localStorage.getItem('items');
          const list = raw ? JSON.parse(raw) : [];
          const idx = list.findIndex((it: any) => String(it.id) === String(this.item.id));
          if (idx >= 0) {
            list[idx] = { ...this.item };
            localStorage.setItem('items', JSON.stringify(list));
          } else {
            list.unshift({ ...this.item });
            localStorage.setItem('items', JSON.stringify(list));
          }
        } catch (e) {
          console.error('Failed updating local item', e);
        }
        this.saving = false;
        this.notificationService.show('Guardado com sucesso', 'success');
        this.reset();
        this.itemsService.triggerRefresh('inventory-form');
        return;
      } else {
        // attempt PUT to backend for existing server item
        const id = Number(this.item.id);
        this.http.put(`${this.API_URL}/items/${id}`, this.item).subscribe({ next: () => {
          this.saving = false;
            this.notificationService.show('Guardado com sucesso', 'success');
          this.reset();
          this.itemsService.triggerRefresh('inventory-form');
        }, error: (err) => {
          console.error('PUT /api/items/' + id + ' failed', err);
          this.saving = false;
          this.notificationService.show('Erro ao guardar produto', 'error');
        }});
        return;
      }
    }

    // no id -> create new
    this.http.post(`${this.API_URL}/items`, this.item).subscribe({
      next: () => {
        this.saving = false;
        this.notificationService.show('Guardado com sucesso', 'success');
        this.reset();
        this.itemsService.triggerRefresh('inventory-form');
      },
      error: () => {
        this.saving = false;
        this.notificationService.show('Erro ao guardar produto', 'error');
      }
    });
  }

  private saveToLocal() {
    try {
      const raw = localStorage.getItem('items');
      const list = raw ? JSON.parse(raw) : [];
      const toSave = { ...this.item, id: `local-${Date.now()}` };
      list.unshift(toSave);
      localStorage.setItem('items', JSON.stringify(list));
    } catch (e) {
      console.error('Failed saving item locally', e);
    }
  }

  

  reset() {
    this.item = {
      date: new Date().toISOString().slice(0, 10),
      name: '',
      brand: '',
      category: 'Outros',
      quantity: 1,
      unit: 'un',
      supplier: '',
      price: null,
      notes: ''
    };
  }
}
