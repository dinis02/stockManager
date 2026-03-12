import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Movement, MovementService } from '../../services/movement.service';

@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="history-container">
      <h2>Histórico de Movimentações</h2>
      
      <div class="filters">
        <input 
          type="text" 
          placeholder="Pesquisar..." 
          [(ngModel)]="searchTerm"
          (ngModelChange)="filterMovements()"
        />
      </div>

      <table class="movements-table" *ngIf="filteredMovements.length > 0; else noMovements">
        <thead>
          <tr>
            <th>Data & Hora</th>
            <th>Produto</th>
            <th>Marca</th>
            <th>Tipo</th>
            <th>Quantidade</th>
            <th>Utilizador</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let mov of filteredMovements">
            <td>{{ formatDate(mov.timestamp) }}</td>
            <td>{{ mov.name }}</td>
            <td>{{ mov.brand || '-' }}</td>
            <td>
              <span [class.badge-entry]="mov.type === 'entry'" [class.badge-exit]="mov.type === 'exit'" class="badge">
                {{ mov.type === 'entry' ? 'Entrada' : 'Saída' }}
              </span>
            </td>
            <td>{{ mov.quantity }}</td>
            <td>{{ mov.username || '-' }}</td>
            <td>{{ mov.notes || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <ng-template #noMovements>
        <div class="no-data">Sem histórico de movimentações</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .history-container {
      padding: 20px;
    }

    h2 {
      margin-bottom: 20px;
      font-size: 24px;
    }

    .filters {
      margin-bottom: 20px;
    }

    .filters input {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      width: 100%;
      max-width: 300px;
      font-size: 14px;
    }

    .movements-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .movements-table th {
      background: #f5f5f5;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 1px solid #ddd;
      font-size: 13px;
    }

    .movements-table td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 13px;
    }

    .movements-table tr:hover {
      background: #f9f9f9;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-entry {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .badge-exit {
      background: #ffebee;
      color: #c62828;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    @media (max-width: 768px) {
      .movements-table {
        font-size: 12px;
      }

      .movements-table th,
      .movements-table td {
        padding: 8px;
      }
    }
  `]
})
export class HistoryViewComponent implements OnInit {
  movements: Movement[] = [];
  filteredMovements: Movement[] = [];
  searchTerm = '';

  constructor(private movementService: MovementService) {}

  ngOnInit(): void {
    this.loadMovements();
  }

  loadMovements(): void {
    this.movementService.getMovements().subscribe(
      (data) => {
        this.movements = data;
        this.filterMovements();
      },
      (err) => console.error('Error loading movements:', err)
    );
  }

  filterMovements(): void {
    if (!this.searchTerm) {
      this.filteredMovements = this.movements;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredMovements = this.movements.filter(m =>
        m.name.toLowerCase().includes(term) ||
        (m.brand && m.brand.toLowerCase().includes(term)) ||
        (m.username && m.username.toLowerCase().includes(term))
      );
    }
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('pt-PT');
  }
}
