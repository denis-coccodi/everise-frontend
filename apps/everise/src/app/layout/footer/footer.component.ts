import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'cdt-footer',
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
