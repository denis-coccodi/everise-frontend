import { InputErrorsComponent, ListErrorsComponent } from '@realworld/core/forms';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthStore } from '@realworld/auth/data-access';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent, FieldComponent, InputComponent } from '@realworld/ui/components';

@Component({
  selector: 'cdt-register',
  templateUrl: './register.component.html',
  imports: [
    FieldComponent,
    ButtonComponent,
    InputComponent,
    ListErrorsComponent,
    RouterModule,
    ReactiveFormsModule,
    InputErrorsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit() {
    this.authStore.register(this.form.getRawValue());
    // Keep the name and email, so a problem only needs that field fixed.
    this.form.controls.password.reset();
  }
}
