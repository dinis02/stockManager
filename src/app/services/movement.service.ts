import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Movement {
  id: number;
  subproduct_id: number;
  name: string;
  brand: string;
  type: 'entry' | 'exit';
  quantity: number;
  username: string | null;
  timestamp: number;
  notes: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MovementService {
  private API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getMovements(): Observable<Movement[]> {
    return this.http.get<Movement[]>(`${this.API_URL}/movements`);
  }

  getMovementsByProduct(subproductId: number): Observable<Movement[]> {
    return this.http.get<Movement[]>(`${this.API_URL}/movements/${subproductId}`);
  }

  addMovement(subproductId: number, type: 'entry' | 'exit', quantity: number, username: string | null, notes?: string): Observable<{ id: number; ok: boolean }> {
    return this.http.post<{ id: number; ok: boolean }>(`${this.API_URL}/movements`, {
      subproduct_id: subproductId,
      type,
      quantity,
      username,
      notes
    });
  }
}
