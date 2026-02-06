import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ItemsService } from '../../services/items.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss']
})
export class InventoryListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  loading = false;
  private subs: Subscription | null = null;

  constructor(private itemsService: ItemsService, private http: HttpClient) {}

  ngOnInit(): void {
    // initial load
    this.load();
    // subscribe to the shared ItemsService refresh observable
    this.subs = this.itemsService.refresh$.subscribe(() => this.load());
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

  load() {
    console.log('[InventoryList] load() start');
    this.loading = true;
    // try backend first, fallback to localStorage if unavailable
    this.http.get<any[]>('/api/items').subscribe({
      next: data => {
        this.items = data || [];
        this.loading = false;
        console.log('[InventoryList] load() got', this.items.length, 'items from backend');
      },
      error: () => {
        // backend unavailable -> load from localStorage
        try {
          const raw = localStorage.getItem('items');
          this.items = raw ? JSON.parse(raw) : [];
        } catch (e) {
          console.error('Failed to read local items', e);
          this.items = [];
        }
        this.loading = false;
        console.log('[InventoryList] load() fallback to localStorage,', this.items.length, 'items');
      }
    });
  }

  remove(id: string) {
    // try backend delete, otherwise remove from localStorage
    this.http.delete(`/api/items/${id}`).subscribe({ next: () => this.load(), error: () => {
      try {
        const raw = localStorage.getItem('items');
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((it: any) => it.id !== id && !(String(it.id) === String(id)));
        localStorage.setItem('items', JSON.stringify(filtered));
      } catch (e) {
        console.error('Failed to remove local item', e);
      }
      this.load();
    }});
  }

  edit(item: any) {
    // use the shared service to signal an edit (reliable across lifecycle)
    this.itemsService.triggerEdit(item);
  }
}

