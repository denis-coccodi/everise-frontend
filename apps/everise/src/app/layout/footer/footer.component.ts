import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommunityLinksComponent } from '@everise/ui/components';

@Component({
  selector: 'cdt-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  imports: [CommunityLinksComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
