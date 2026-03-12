import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<string | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {}

  private getUserFromStorage(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('stockManagerUser') : null;
  }

  login(username: string): void {
    if (username && username.trim()) {
      localStorage.setItem('stockManagerUser', username);
      this.currentUserSubject.next(username);
    }
  }

  logout(): void {
    localStorage.removeItem('stockManagerUser');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): string | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  }
}
