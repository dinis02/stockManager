import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';

export interface Brand {
  id?: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class BrandService {
  private _brands$ = new BehaviorSubject<Brand[]>([]);
  public brands$ = this._brands$.asObservable();

  constructor(private http: HttpClient) {
    this.loadBrands();
  }

  loadBrands() {
    this.http.get<Brand[]>('/api/brands').subscribe(
      data => this._brands$.next(data || []),
      () => this._brands$.next([])
    );
  }

  addBrand(name: string) {
    return this.http.post<Brand>('/api/brands', { name });
  }

  deleteBrand(id: number) {
    return this.http.delete(`/api/brands/${id}`);
  }
}
