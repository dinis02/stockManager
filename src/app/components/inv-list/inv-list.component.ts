import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-inv-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <div class="list-content">
      <table class="full-width-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Produto</th>
            <th>Marca</th>
            <th>Categoria</th>
            <th>Qt.</th>
            <th>Un.</th>
            <th>Fornecedor</th>
            <th>Preço un. (€)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let i of items">
            <td>{{ i.date }}</td>
            <td>{{ i.name }}</td>
            <td>{{ i.brand }}</td>
            <td>{{ i.category }}</td>
            <td>{{ i.quantity }}</td>
            <td>{{ i.unit }}</td>
            <td>{{ i.supplier }}</td>
            <td>{{ i.price }}</td>
            <td><button (click)="remove(i.id)">Apagar</button></td>
          </tr>
          <tr *ngIf="!items || items.length === 0">
            <td colspan="9">Sem itens</td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class MyInvListComponent implements OnInit {
  items: any[] = [];
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.load();
    window.addEventListener('itemsChanged', () => this.load());
  }

  load() {
    this.loading = true;
    this.http.get<any[]>('/api/items').subscribe({ next: data => { this.items = data || []; this.loading = false; }, error: () => (this.loading = false) });
  }

  remove(id: string) {
    this.http.delete(`/api/items/${id}`).subscribe(() => this.load());
  }
}
