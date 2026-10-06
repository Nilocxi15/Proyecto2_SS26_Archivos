import { Component, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Validador para asegurar que la nueva contraseña y su confirmación coincidan
 */
export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const newPassword = control.get('newPassword');
  const confirmPassword = control.get('confirmPassword');

  if (!newPassword || !confirmPassword) {
    return null;
  }

  if (confirmPassword.value && newPassword.value !== confirmPassword.value) {
    return { passwordMismatch: true };
  }

  return null;
};

type RecoveryStep = 'request' | 'verify' | 'success';

@Component({
  selector: 'app-recover-password',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './recover-password.html',
  styleUrl: './recover-password.css',
})
export class RecoverPassword {
  // Estado actual del flujo
  protected readonly currentStep = signal<RecoveryStep>('request');

  // Correo almacenado temporalmente durante el proceso
  protected readonly temporaryEmail = signal<string>('');

  // Estados de carga y visibilidad de contraseñas
  protected readonly isLoading = signal<boolean>(false);
  protected readonly hideNewPassword = signal<boolean>(true);
  protected readonly hideConfirmPassword = signal<boolean>(true);

  // Formulario Paso 1: Solicitud de código mediante correo
  protected readonly emailForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  // Formulario Paso 2: Código de verificación y nueva contraseña
  protected readonly resetForm = new FormGroup(
    {
      code: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordMatchValidator }
  );

  /**
   * Paso 1: Enviar correo para solicitar código de recuperación
   */
  requestRecoveryCode(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    const emailEntered = this.emailForm.controls.email.value.trim();

    // Guardar correo temporalmente y simular despacho de código
    setTimeout(() => {
      this.temporaryEmail.set(emailEntered);
      this.isLoading.set(false);
      this.currentStep.set('verify');
    }, 1000);
  }

  /**
   * Paso 2: Enviar código de verificación y nueva contraseña al backend
   */
  submitPasswordReset(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);

    // Simulación de envío al backend (incluye temporaryEmail(), code, newPassword)
    setTimeout(() => {
      this.isLoading.set(false);
      this.currentStep.set('success');
    }, 1200);
  }

  /**
   * Regresar al paso inicial para probar con otro correo.
   * Limpia el correo almacenado temporalmente y restablece los formularios.
   */
  changeEmail(): void {
    this.temporaryEmail.set('');
    this.emailForm.reset();
    this.resetForm.reset();
    this.hideNewPassword.set(true);
    this.hideConfirmPassword.set(true);
    this.currentStep.set('request');
  }

  toggleNewPasswordVisibility(): void {
    this.hideNewPassword.update((val) => !val);
  }

  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.update((val) => !val);
  }
}
