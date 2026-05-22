import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type MemberProfileStatus = 'none' | 'pending' | 'active';

export interface MemberProfileStatusResponse {
  status: MemberProfileStatus;
  memberId?: string;
  name?: string;
}

export interface CompleteProfilePayload {
  name: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  address: string;
  occupation: string;
  employerName?: string;
  monthlyAmount: number;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  nomineeName: string;
  nomineePhone?: string;
  nomineeRelation?: string;
  emergencyContactName?: string;
  emergencyContactPhone: string;
  emergencyContactRelation?: string;
  acceptTerms: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MemberProfileService {
  private readonly apiUrl = '/api/members';

  constructor(private http: HttpClient) {}

  getStatus(): Observable<MemberProfileStatusResponse> {
    return this.http.get<MemberProfileStatusResponse>(`${this.apiUrl}/profile-status`);
  }

  completeProfile(payload: CompleteProfilePayload): Observable<{ memberId: string; status: string; message: string }> {
    return this.http.post<{ memberId: string; status: string; message: string }>(
      `${this.apiUrl}/complete-profile`,
      payload,
    );
  }
}
