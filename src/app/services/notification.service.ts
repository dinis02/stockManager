import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notification {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private counter = 1;
  private _notifications = new BehaviorSubject<Notification[]>([]);
  notifications$ = this._notifications.asObservable();

  show(message: string, type: 'success' | 'error' | 'info' = 'success', ttl = 2200) {
    // avoid duplicate notifications with same message+type immediately repeated
    const current = this._notifications.getValue();
    const last = current.length ? current[current.length - 1] : null;
    if (last && last.message === message && last.type === type) {
      return; // skip duplicate
    }
    const id = this.counter++;
    const next = [...current, { id, message, type }];
    this._notifications.next(next);
    if (ttl > 0) setTimeout(() => this.dismiss(id), ttl);
  }

  dismiss(id: number) {
    const next = this._notifications.getValue().filter(n => n.id !== id);
    this._notifications.next(next);
  }
}
