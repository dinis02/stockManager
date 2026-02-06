import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ItemsService } from '../../services/items.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inventory-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './inventory-list.component.html',
  styleUrls: ['./inventory-list.component.scss']
})
export class InventoryListComponent implements OnInit, OnDestroy {
  items: any[] = [];
  loading = false;
  private subs: Subscription | null = null;
  // inline edit state
  editingId: any = null;
  editModel: any = null;

  constructor(private itemsService: ItemsService, private http: HttpClient, private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    // initial load
    this.load();
    // subscribe to the shared ItemsService refresh observable
    // ignore refresh events that originate from this list (source === 'from-list')
    this.subs = this.itemsService.refresh$.subscribe((payload: any) => {
      if (payload === 'from-list') return;
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
      try {
        const raw = localStorage.getItem('items');
        const list = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex((it: any) => String(it.id) === String(id));
        if (idx >= 0) {
          list[idx] = { ...this.editModel };
          localStorage.setItem('items', JSON.stringify(list));
        }
      } catch (e) {
        console.error('Failed updating local item', e);
      }
      this.cancelEdit();
      // update in-memory list so UI updates immediately
      this.items = this.items.map(it => String(it.id) === String(id) ? { ...this.editModel } : it);
      // use an immutable replacement so Angular change detection updates the view
      this.items = [...this.items];
      console.log('[InventoryList] saved local edit, updated items count=', this.items.length);
      try { this.cd.detectChanges(); } catch (e) {}
      // notify other components that items changed (mark source so this list ignores it)
      this.itemsService.triggerRefresh('from-list');
      return;
    }

    // server-backed item: PUT
    this.http.put(`/api/items/${Number(id)}`, this.editModel).subscribe({ next: () => {
      // replace the item locally so the table updates instantly
      this.items = this.items.map(it => String(it.id) === String(id) ? { ...this.editModel } : it);
      // notify other components (mark source so this list ignores it)
      // ensure the list reflects the backend state
      // immutable update to trigger change detection
      this.items = [...this.items];
      console.log('[InventoryList] saved server edit, updated items count=', this.items.length);
      try { this.cd.detectChanges(); } catch (e) {}
      this.itemsService.triggerRefresh('from-list');
      this.cancelEdit();
    }, error: (err) => {
      console.error('Failed PUT during saveEdit', err);
      // fallback: update locally to avoid data loss
      try {
        const raw = localStorage.getItem('items');
        const list = raw ? JSON.parse(raw) : [];
        const toSave = { ...this.editModel, id: `local-${Date.now()}` };
        list.unshift(toSave);
        localStorage.setItem('items', JSON.stringify(list));
      } catch (e) {
        console.error('Failed to fallback-save locally', e);
      }
      // reflect fallback in-memory and notify
      const fallbackId = `local-${Date.now()}`;
      this.items.unshift({ ...this.editModel, id: fallbackId });
      // persist fallback id to localStorage already done above; ensure view reflects it
      // immutable replacement to notify Angular
      this.items = [...this.items];
      console.log('[InventoryList] fallback saved locally after PUT error, items count=', this.items.length);
      try { this.cd.detectChanges(); } catch (e) {}
      this.itemsService.triggerRefresh('from-list');
      this.cancelEdit();
    }});
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
    // try backend delete; update in-memory list immediately so UI reflects change
    this.http.delete(`/api/items/${id}`).subscribe({ next: () => {
      this.items = this.items.filter(it => String(it.id) !== String(id));
      this.items = [...this.items];
      console.log('[InventoryList] deleted item (backend success), items count=', this.items.length);
      try { this.cd.detectChanges(); } catch (e) {}
      // also remove from localStorage (safe to do)
      try {
        const raw = localStorage.getItem('items');
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((it: any) => String(it.id) !== String(id));
        localStorage.setItem('items', JSON.stringify(filtered));
      } catch (e) {
        console.error('Failed to remove local item', e);
      }
      this.itemsService.triggerRefresh('from-list');
    }, error: () => {
      // backend error -> remove from localStorage and update view
      try {
        const raw = localStorage.getItem('items');
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter((it: any) => String(it.id) !== String(id));
        localStorage.setItem('items', JSON.stringify(filtered));
      } catch (e) {
        console.error('Failed to remove local item', e);
      }
      this.items = this.items.filter(it => String(it.id) !== String(id));
      this.items = [...this.items];
      console.log('[InventoryList] deleted item (backend error fallback), items count=', this.items.length);
      try { this.cd.detectChanges(); } catch (e) {}
      this.itemsService.triggerRefresh('from-list');
    }});
  }


  
}

