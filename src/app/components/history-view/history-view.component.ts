import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HistoryEvent, MovementService } from '../../services/movement.service';

@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="history-container">
      <div class="table-toolbar">
        <span class="table-title">Historico geral</span>
        <div class="table-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            type="text"
            placeholder="Pesquisar historico..."
            [(ngModel)]="searchTerm"
            (ngModelChange)="filterEvents()"
          />
        </div>
      </div>

      <table class="history-table" *ngIf="filteredEvents.length > 0; else noEvents">
        <thead>
          <tr>
            <th>Data</th>
            <th>Evento</th>
            <th>Tipo</th>
            <th>Detalhes</th>
            <th>Utilizador</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let event of filteredEvents">
            <td>{{ formatDate(event.timestamp) }}</td>
            <td>{{ event.title }}</td>
            <td>
              <span class="badge" [class]="badgeClass(event)">
                {{ labelFor(event) }}
              </span>
            </td>
            <td>{{ event.details || '-' }}</td>
            <td>{{ event.username || '-' }}</td>
          </tr>
        </tbody>
      </table>

      <ng-template #noEvents>
        <div class="no-data">Sem historico registado</div>
      </ng-template>
    </div>
  `,
  styles: [`
    .history-container {
      min-width: 900px;
    }

    .table-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--admin-border-soft);
      flex-wrap: wrap;
    }

    .table-title {
      color: var(--admin-muted);
      font-size: 9px;
      letter-spacing: 2.5px;
      text-transform: uppercase;
    }

    .table-search {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 260px;
      padding: 6px 11px;
      border-radius: 4px;
      background: var(--admin-surface-soft);
      border: 1px solid var(--admin-border-soft);
      color: var(--admin-muted);
    }

    .table-search svg {
      width: 12px;
      height: 12px;
    }

    .table-search input {
      padding: 0;
      border: 0;
      background: transparent;
      font-size: 11px;
    }

    tbody tr:hover {
      background: rgba(127, 93, 64, 0.04);
    }

    .badge {
      display: inline-flex;
      padding: 3px 9px;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 400;
      letter-spacing: 0.5px;
      white-space: nowrap;
      background: rgba(127, 93, 64, 0.08);
      color: var(--admin-muted);
    }

    .badge-create,
    .badge-entry {
      background: rgba(63, 122, 85, 0.1);
      color: var(--admin-success);
    }

    .badge-update {
      background: rgba(184, 125, 84, 0.12);
      color: var(--admin-accent);
    }

    .badge-delete,
    .badge-exit {
      background: rgba(160, 48, 48, 0.12);
      color: var(--admin-danger);
    }

    .no-data {
      padding: 38px;
      text-align: center;
      color: var(--admin-muted);
      font-size: 12px;
    }
  `]
})
export class HistoryViewComponent implements OnInit {
  events: HistoryEvent[] = [];
  filteredEvents: HistoryEvent[] = [];
  searchTerm = '';

  constructor(private movementService: MovementService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.movementService.getHistory().subscribe(
      (data) => {
        this.events = data || [];
        this.filterEvents();
      },
      (err) => console.error('Error loading history:', err)
    );
  }

  filterEvents(): void {
    if (!this.searchTerm.trim()) {
      this.filteredEvents = this.events;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredEvents = this.events.filter(event =>
      event.title?.toLowerCase().includes(term) ||
      event.details?.toLowerCase().includes(term) ||
      event.entityType?.toLowerCase().includes(term) ||
      event.action?.toLowerCase().includes(term) ||
      event.username?.toLowerCase().includes(term)
    );
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('pt-PT');
  }

  badgeClass(event: HistoryEvent): string {
    if (event.action === 'entry') return 'badge-entry';
    if (event.action === 'exit') return 'badge-exit';
    if (event.action === 'create') return 'badge-create';
    if (event.action === 'update') return 'badge-update';
    if (event.action === 'delete') return 'badge-delete';
    return '';
  }

  labelFor(event: HistoryEvent): string {
    const labels: Record<string, string> = {
      entry: 'Entrada',
      exit: 'Saida',
      create: 'Criado',
      update: 'Editado',
      delete: 'Apagado'
    };
    return labels[event.action] || event.action;
  }
}
