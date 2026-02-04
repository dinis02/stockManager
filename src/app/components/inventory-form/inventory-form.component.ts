import { Component } from '@angular/core';
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

  constructor(private http: HttpClient) {}

  save() {
    if (!this.item.name || !this.item.quantity) return;
    this.saving = true;
    // try to save to backend; if it fails, persist to localStorage as fallback
    this.http.post('/api/items', this.item).subscribe({
      next: () => {
        this.saving = false;
        this.reset();
        window.dispatchEvent(new Event('itemsChanged'));
      },
      error: () => {
        // fallback: save locally
        this.saveToLocal();
        this.saving = false;
        this.reset();
        window.dispatchEvent(new Event('itemsChanged'));
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
