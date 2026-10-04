import { Directive, input } from '@angular/core';

// A themed tag pill on a link, list item or span: <a cdtTag>raids</a>, or
// <li cdtTag="outline">raids</li> for the quieter outlined version. The look
// lives in theme/_controls.scss (.tag-default, .tag-outline).
@Directive({
  selector: '[cdtTag]',
  host: {
    class: 'tag-default tag-pill',
    '[class.tag-outline]': "cdtTag() === 'outline'",
  },
})
export class TagDirective {
  readonly cdtTag = input<'outline' | ''>('');
}
