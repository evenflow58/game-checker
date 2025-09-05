// src/app/core/service/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment.js';

export interface TestResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class TestApiService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Call a test endpoint
   */
  getTest(): Observable<TestResponse> {
    return this.http.get<TestResponse>(`${this.baseUrl}/v1/test`);
  }
}
