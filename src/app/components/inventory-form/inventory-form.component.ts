import { Component, Input } from '@angular/core';
import { ItemsService } from '../../services/items.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-inventory-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './inventory-form.component.html',
  styleUrls: ['./inventory-form.component.scss']
})
export class InventoryFormComponent {
  item: any = {
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

  saving = false;
  // no UI messages — items should just appear in the list

  @Input()
  set editItem(value: any) {
    if (value) {
      // populate form with a shallow copy
      this.item = { ...value };
    }
  }

  constructor(private http: HttpClient, private itemsService: ItemsService) {}

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
        this.reset();
        this.itemsService.triggerRefresh();
        return;
      } else {
        // attempt PUT to backend for existing server item
        const id = Number(this.item.id);
        this.http.put(`/api/items/${id}`, this.item).subscribe({ next: () => {
          this.saving = false;
          this.reset();
          this.itemsService.triggerRefresh();
        }, error: (err) => {
          // log the error for debugging and fallback to local save
          console.error('PUT /api/items/' + id + ' failed', err);
          // do NOT automatically POST (that would create a duplicate). Save locally as a safe fallback.
          this.saveToLocal();
          this.saving = false;
          this.reset();
          this.itemsService.triggerRefresh();
        }});
        return;
      }
    }

    // no id -> create new
    this.http.post('/api/items', this.item).subscribe({
      next: () => {
        this.saving = false;
        this.reset();
        this.itemsService.triggerRefresh();
      },
      error: () => {
        // fallback: save locally
        this.saveToLocal();
        this.saving = false;
        this.reset();
        this.itemsService.triggerRefresh();
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
