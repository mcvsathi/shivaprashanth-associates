import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConsultationService } from '../../services/consultation.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  private fb = inject(FormBuilder);
  private consultationService = inject(ConsultationService);

  consultationForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.pattern(/^[0-9+\s\-()]{7,20}$/)]],
    service: ['', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  isSubmitting = signal<boolean>(false);
  submitSuccess = signal<boolean>(false);
  submitError = signal<string | null>(null);
  referenceId = signal<string>('');
  isMock = signal<boolean>(false);

  // Helper getters for validation
  get f() {
    return this.consultationForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.consultationForm.get(fieldName);
    return Boolean(control && control.invalid && (control.dirty || control.touched));
  }

  async onSubmit(): Promise<void> {
    if (this.consultationForm.invalid) {
      this.consultationForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const formValues = this.consultationForm.value;

    const result = await this.consultationService.submitConsultation({
      name: formValues.name,
      email: formValues.email,
      phone: formValues.phone || null,
      service: formValues.service,
      message: formValues.message,
    });

    this.isSubmitting.set(false);

    if (result.success) {
      this.submitSuccess.set(true);
      this.referenceId.set(result.referenceId || '');
      this.isMock.set(Boolean(result.isMock));
      this.consultationForm.reset({
        name: '',
        email: '',
        phone: '',
        service: '',
        message: '',
      });
    } else {
      this.submitError.set(
        result.error || 'An unexpected error occurred. Please try again or reach out to us directly.'
      );
    }
  }

  resetStatus(): void {
    this.submitSuccess.set(false);
    this.submitError.set(null);
    this.referenceId.set('');
  }
}
