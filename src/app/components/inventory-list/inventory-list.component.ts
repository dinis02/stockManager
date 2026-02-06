import { Component, OnInit, OnDestroy, ChangeDetectorRef, ApplicationRef } from '@angular/core';
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
  private _lastOwnUpdateTs: number | null = null;
  private subs: Subscription | null = null;
  // inline edit state
  editingId: any = null;
  editModel: any = null;

  constructor(private itemsService: ItemsService, private http: HttpClient, private cd: ChangeDetectorRef, private appRef: ApplicationRef) {}

  ngOnInit(): void {
    // initial load
    this.load();
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
      // bump render tick for this item to force re-render
      try { this.bumpRenderTickFor(id); } catch (e) {}
      // record our own update timestamp so we can ignore immediate reloads
      this._lastOwnUpdateTs = Date.now();
      this.itemsService.triggerRefresh('inventory-list');
      try { this.load(); } catch (e) {}
      // ensure persisted state is reloaded (small delay to let localStorage settle)
      setTimeout(() => { try { this.load(); } catch (e) {} }, 60);
      return;
    }

    // server-backed item: PUT
    this.http.put(`/api/items/${Number(id)}`, this.editModel).subscribe({ next: () => {
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
      try { this.bumpRenderTickFor(fallbackId); } catch (e) {}
      try { this.cd.detectChanges(); } catch (e) {}
      this._lastOwnUpdateTs = Date.now();
      this.itemsService.triggerRefresh('inventory-list');
      this.cancelEdit();
      try { this.load(); } catch (e) {}
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
        try { this.cd.detectChanges(); } catch (e) {}
        try { this.appRef.tick(); } catch (e) {}
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
        try { this.cd.detectChanges(); } catch (e) {}
        try { this.appRef.tick(); } catch (e) {}
      }
    });
  }

  remove(id: string) {
    // try backend delete; update in-memory list immediately so UI reflects change
    this.http.delete(`/api/items/${id}`).subscribe({ next: () => {
      this.items = this.items.filter(it => String(it.id) !== String(id));
      this.items = [...this.items];
      console.log('[InventoryList] deleted item (backend success), items count=', this.items.length);
      try { this.bumpRenderTickFor(id); } catch (e) {}
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
      this._lastOwnUpdateTs = Date.now();
      this.itemsService.triggerRefresh('inventory-list');
      try { this.load(); } catch (e) {}
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
      try { this.bumpRenderTickFor(id); } catch (e) {}
      try { this.cd.detectChanges(); } catch (e) {}
      this._lastOwnUpdateTs = Date.now();
      this.itemsService.triggerRefresh('inventory-list');
      try { this.load(); } catch (e) {}
    }});
  }


  
}

