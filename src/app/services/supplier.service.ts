import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export interface Supplier {
  id?: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private _suppliers$ = new BehaviorSubject<Supplier[]>([]);
  public suppliers$ = this._suppliers$.asObservable();

  constructor(private http: HttpClient) {
    this.loadSuppliers();
  }

  loadSuppliers() {
    this.http.get<Supplier[]>('/api/suppliers').subscribe(
      data => this._suppliers$.next(data || []),
      () => this._suppliers$.next([])
    );
  }

  addSupplier(name: string) {
    return this.http.post<Supplier>('/api/suppliers', { name });
  }

  deleteSupplier(id: number) {
    return this.http.delete(`/api/suppliers/${id}`);
  }
}
