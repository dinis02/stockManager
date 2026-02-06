
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  // use a BehaviorSubject so new subscribers immediately receive latest value
  // refresh payload is an object with { source?: string, ts: number }
  private _refresh$ = new BehaviorSubject<{ source?: string | null; ts: number } | null>(null);
  private _edit$ = new BehaviorSubject<any | null>(null);

  get refresh$(): Observable<{ source?: string | null; ts: number } | null> {
    return this._refresh$.asObservable();
  }

  get edit$(): Observable<any | null> {
    return this._edit$.asObservable();
  }

  /**
   * Trigger a refresh event. Optional `source` can be used by subscribers
   * to ignore events originating from a specific component.
   */
  triggerRefresh(source?: string) {
    this._refresh$.next({ source: source || null, ts: Date.now() });
  }

  triggerEdit(item: any) {
    this._edit$.next(item);
  }

  clearEdit() {
    this._edit$.next(null);
  }
}
