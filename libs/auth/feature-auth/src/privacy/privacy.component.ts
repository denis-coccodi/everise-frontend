import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// The privacy policy, linked from the footer and given to Google and
// Facebook for their sign-in apps. Keep it in step with what the backend
// stores (its README's Database section).
@Component({
  selector: 'cdt-privacy',
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyComponent {
  protected readonly contact = 'denis.coccodi@everise.dev';
}
