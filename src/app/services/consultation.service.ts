import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface ConsultationRequest {
  id?: string;
  name: string;
  email: string;
  phone?: string | null;
  service: string;
  message: string;
  status?: 'pending' | 'reviewed' | 'contacted' | 'closed';
  created_at?: string;
}

export interface SubmissionResult {
  success: boolean;
  referenceId?: string;
  error?: string;
  isMock?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ConsultationService {
  private platformId = inject(PLATFORM_ID);
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.initSupabase();
  }

  private getCleanConfig(): { url: string; anonKey: string } | null {
    let { url, anonKey } = environment.supabase;
    if (!url || !anonKey) return null;

    url = url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    anonKey = anonKey.trim().replace(/_SUPABASE_ANON_KEY$/, '');

    if (url.includes('YOUR_PROJECT_REF') || anonKey === 'YOUR_SUPABASE_ANON_KEY') {
      return null;
    }

    return { url, anonKey };
  }

  private isConfigured(): boolean {
    return this.getCleanConfig() !== null;
  }

  private initSupabase(): void {
    const config = this.getCleanConfig();
    if (config) {
      try {
        this.supabase = createClient(
          config.url,
          config.anonKey,
          {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
            },
          }
        );
      } catch (err) {
        console.error('[ConsultationService] Error initializing Supabase client:', err);
      }
    }
  }

  /**
   * Submit a consultation request to Supabase
   */
  async submitConsultation(
    payload: Omit<ConsultationRequest, 'id' | 'created_at' | 'status'>
  ): Promise<SubmissionResult> {
    // If Supabase credentials are not configured yet, simulate a smooth demo response
    if (!this.isConfigured() || !this.supabase) {
      console.warn(
        '[ConsultationService] Supabase credentials are not configured in `src/environments/environment.ts`.\n' +
        'Simulating consultation submission for testing...'
      );

      // Simulate network latency
      await new Promise((resolve) => setTimeout(resolve, 900));

      const mockReferenceId = 'SPA-' + Math.floor(100000 + Math.random() * 900000);

      // Store in localStorage if running in browser for dev inspection
      if (isPlatformBrowser(this.platformId)) {
        try {
          const stored = JSON.parse(localStorage.getItem('spa_consultations') || '[]');
          stored.unshift({
            id: mockReferenceId,
            ...payload,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
          localStorage.setItem('spa_consultations', JSON.stringify(stored));
        } catch {
          // ignore localStorage errors in private mode
        }
      }

      return {
        success: true,
        referenceId: mockReferenceId,
        isMock: true,
      };
    }

    try {
      const referenceId = 'SPA-' + Math.floor(100000 + Math.random() * 900000);
      const formattedMessage = `[Ref: ${referenceId}]\n\n${payload.message.trim()}`;

      const { error } = await this.supabase
        .from('consultations')
        .insert([
          {
            name: payload.name.trim(),
            email: payload.email.trim().toLowerCase(),
            phone: payload.phone ? payload.phone.trim() : null,
            service: payload.service,
            message: formattedMessage,
            status: 'pending',
          },
        ]);

      if (error) {
        console.error('[ConsultationService] Supabase insert error:', error);
        return {
          success: false,
          error: error.message || 'Unable to submit your request. Please try again.',
        };
      }

      return {
        success: true,
        referenceId,
        isMock: false,
      };
    } catch (err: any) {
      console.error('[ConsultationService] Unexpected error during submission:', err);
      return {
        success: false,
        error: err?.message || 'A network error occurred while submitting your consultation request.',
      };
    }
  }

  /**
   * Check if real Supabase backend connection is configured
   */
  get hasActiveBackend(): boolean {
    return this.isConfigured();
  }
}
