
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  // use a BehaviorSubject so new subscribers immediately receive latest value
  private _refresh$ = new BehaviorSubject<number | null>(null);
  private _edit$ = new BehaviorSubject<any | null>(null);

  get refresh$(): Observable<number | null> {
    return this._refresh$.asObservable();
  }

  get edit$(): Observable<any | null> {
    return this._edit$.asObservable();
  }

  triggerRefresh() {
    this._refresh$.next(Date.now());
  }

  triggerEdit(item: any) {
    this._edit$.next(item);
  }

  clearEdit() {
    this._edit$.next(null);
  }
}
