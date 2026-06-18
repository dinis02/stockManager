import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE } from '../api-base';

export interface Brand {
  id?: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private API_URL = API_BASE;
  private _brands$ = new BehaviorSubject<Brand[]>([]);
  public brands$ = this._brands$.asObservable();

  constructor(private http: HttpClient) {
    this.loadBrands();
  }

  loadBrands() {
    this.http.get<Brand[]>(`${this.API_URL}/brands`).subscribe(
      data => this._brands$.next(data || []),
      () => this._brands$.next([])
    );
  }

  addBrand(name: string): Observable<Brand> {
    return this.http.post<Brand>(`${this.API_URL}/brands`, { name }).pipe(
      tap(() => this.loadBrands())
    );
  }

  updateBrand(id: number, name: string): Observable<Brand> {
    return this.http.put<Brand>(`${this.API_URL}/brands/${id}`, { name }).pipe(
      tap(() => this.loadBrands())
    );
  }

  deleteBrand(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.API_URL}/brands/${id}`).pipe(
      tap(() => this.loadBrands())
    );
  }
}
