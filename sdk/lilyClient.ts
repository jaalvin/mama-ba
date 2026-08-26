import {
  ApiResponse,
  HerbalSafetyRequest,
  HerbalSafetyResponse,
  TriageRequest,
  TriageResult,
  ANCScheduleRequest,
  ANCScheduleItem,
  ImmunizationScheduleRequest,
  ImmunizationScheduleItem,
  VitalsEntryRequest,
  VitalsEvaluationResult,
  HealthJournalEntryRequest,
  ChatQueryRequest,
  ChatQueryResponse,
  PresetPromptCard,
  UserProfile,
  SyncPayload
} from './types';

export class LilyApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000/api/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network request failed. Is the device offline or backend server down?'
      };
    }
  }

  // 1. Herbal & Food Safety Checker
  async checkHerbalSafety(params: HerbalSafetyRequest): Promise<ApiResponse<HerbalSafetyResponse>> {
    return this.request<HerbalSafetyResponse>('/herbal-safety/check', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getHerbalMatrix(): Promise<ApiResponse<HerbalSafetyResponse[]>> {
    return this.request<HerbalSafetyResponse[]>('/herbal-safety/matrix', { method: 'GET' });
  }

  // 2. Symptom Triage & Red-Flag Alerts
  async evaluateTriage(params: TriageRequest): Promise<ApiResponse<TriageResult>> {
    return this.request<TriageResult>('/triage/evaluate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getTriageRules(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/triage/rules', { method: 'GET' });
  }

  // 3. Maternal Care & Immunization Tracker
  async getANCSchedule(params: ANCScheduleRequest): Promise<ApiResponse<ANCScheduleItem[]>> {
    return this.request<ANCScheduleItem[]>('/maternal/anc-schedule', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getImmunizationSchedule(params: ImmunizationScheduleRequest): Promise<ApiResponse<ImmunizationScheduleItem[]>> {
    return this.request<ImmunizationScheduleItem[]>('/maternal/immunization-schedule', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // 4. Vitals Checking & Health Journal
  async logVitals(params: VitalsEntryRequest): Promise<ApiResponse<VitalsEvaluationResult>> {
    return this.request<VitalsEvaluationResult>('/vitals/log', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getVitalsHistory(userId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/vitals/history/${encodeURIComponent(userId)}`, { method: 'GET' });
  }

  async saveHealthJournal(params: HealthJournalEntryRequest): Promise<ApiResponse<{ id: string; entryDate: string; status: string }>> {
    return this.request<{ id: string; entryDate: string; status: string }>('/vitals/journal', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  // 5. RAG Chatbot & Healthcare Q&A
  async askChatbot(params: ChatQueryRequest): Promise<ApiResponse<ChatQueryResponse>> {
    return this.request<ChatQueryResponse>('/chat/query', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getPresetPromptCards(): Promise<ApiResponse<PresetPromptCard[]>> {
    return this.request<PresetPromptCard[]>('/chat/preset-cards', { method: 'GET' });
  }

  // 6. User Profile
  async getProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>(`/auth/profile/${encodeURIComponent(userId)}`, { method: 'GET' });
  }

  async updateProfile(profile: Partial<UserProfile> & { userId: string }): Promise<ApiResponse<{ message: string; userId: string }>> {
    return this.request<{ message: string; userId: string }>('/auth/profile', {
      method: 'POST',
      body: JSON.stringify(profile)
    });
  }

  // 7. Offline Database Sync
  async getOfflineBundle(): Promise<ApiResponse<any>> {
    return this.request<any>('/sync/bundle', { method: 'GET' });
  }

  async uploadSyncQueue(payload: SyncPayload): Promise<ApiResponse<{ status: string; itemsProcessed: number }>> {
    return this.request<{ status: string; itemsProcessed: number }>('/sync/upload', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}

export default LilyApiClient;
