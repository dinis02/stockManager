import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-inv-form',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <form class="inventory-form" (ngSubmit)="save()">
      <div class="form-row">
        <label>Nome do Produto *
          <input name="name" [(ngModel)]="item.name" required placeholder="Nome do produto" />
        </label>
        <label>Marca
          <input name="brand" [(ngModel)]="item.brand" placeholder="Marca" />
        </label>
      </div>

      <div class="form-row">
        <label>Categoria
          <select name="category" [(ngModel)]="item.category"><option>Outros</option><option>Shampoo</option><option>Tratamento</option></select>
        </label>
        <label>Quantidade *
          <input name="quantity" type="number" min="0" [(ngModel)]="item.quantity" required />
        </label>
        <label>Unidade
          <select name="unit" [(ngModel)]="item.unit"><option>un</option><option>ml</option></select>
        </label>
      </div>

      <div class="form-row">
        <label>Data de compra *
          <input name="date" type="date" [(ngModel)]="item.date" required />
        </label>
        <label>Fornecedor
          <input name="supplier" [(ngModel)]="item.supplier" />
        </label>
        <label>Preço unitário (€)
          <input name="price" type="number" step="0.01" [(ngModel)]="item.price" />
        </label>
      </div>

      <label style="width:100%">Observações
        <textarea name="notes" rows="2" [(ngModel)]="item.notes"></textarea>
      </label>

      <div style="display:flex; justify-content:flex-end;">
        <button type="submit" [disabled]="saving">Guardar</button>
      </div>
    </form>
  `
})
export class MyInvFormComponent {
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
    this.http.post('/api/items', this.item).subscribe({
      next: () => {
        this.saving = false;
        this.reset();
        window.dispatchEvent(new Event('itemsChanged'));
      },
      error: () => (this.saving = false)
    });
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
