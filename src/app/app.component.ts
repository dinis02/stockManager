import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { InventoryFormComponent } from './components/inventory-form/inventory-form.component';
import { InventoryListComponent } from './components/inventory-list/inventory-list.component';
import { ItemsService } from './services/items.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, InventoryFormComponent, InventoryListComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'stockManager';
  view: 'add' | 'table' = 'add';

  select(view: 'add' | 'table') {
    this.view = view;
    // small UX: scroll to top of main content when switching
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    // when switching to the table view, trigger a reload via ItemsService so the list refreshes reliably
    if (view === 'table') {
      // trigger immediately and again after a short delay to avoid race conditions
      this.itemsService.triggerRefresh('app');
      setTimeout(() => this.itemsService.triggerRefresh('app'), 180);
    }
  }
  currentEdit: any = null;

  // expose notifications observable for template toast host
  get notifications$() {
    return this.notificationService.notifications$;
  }
  constructor(private itemsService: ItemsService, private notificationService: NotificationService) {
    // subscribe to edits from ItemsService
    this.itemsService.edit$.subscribe(item => {
      this.currentEdit = item || null;
      if (item) this.select('add');
    });
    // clear edit when a refresh occurs
    this.itemsService.refresh$.subscribe(() => {
      this.currentEdit = null;
    });
  }
}
