import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Category {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private API_URL = 'http://localhost:3000/api';
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCategories();
  }

  loadCategories(): void {
    this.http.get<Category[]>(`${this.API_URL}/categories`).subscribe(
      (categories) => this.categoriesSubject.next(categories),
      (err) => console.error('Error loading categories:', err)
    );
  }

  getCategories(): Observable<Category[]> {
    return this.categories$;
  }

  addCategory(name: string): Observable<Category> {
    return this.http.post<Category>(`${this.API_URL}/categories`, { name }).pipe(
      tap(() => this.loadCategories())
    );
  }

  deleteCategory(id: number): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.API_URL}/categories/${id}`).pipe(
      tap(() => this.loadCategories())
    );
  }
}
