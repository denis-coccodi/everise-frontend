import { ChangeDetectionStrategy, Component, SecurityContext, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { marked } from 'marked';
import { YouTubeEmbedComponent } from '../youtube-embed/youtube-embed.component';
import { RichTextPart, splitRichText } from './rich-text';

// A post or comment: Markdown (with images and GIFs), and YouTube videos
// for links alone on a line. `compact` is the comments' smaller text, where
// a single line break also breaks the line, as in chat.
@Component({
  selector: 'cdt-rich-text',
  templateUrl: './rich-text.component.html',
  imports: [YouTubeEmbedComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly text = input.required<string>();
  readonly compact = input(false);

  protected readonly parts = computed(() =>
    splitRichText(this.text() ?? '').map((part) =>
      part.kind === 'markdown' ? { ...part, html: this.toHtml(part) } : part,
    ),
  );

  private toHtml(part: Extract<RichTextPart, { kind: 'markdown' }>) {
    const dirty = marked.parse(part.text, {
      mangle: false,
      headerIds: false,
      breaks: this.compact(),
    }) as string;
    // Angular's sanitizer keeps images and links but removes scripts, event
    // handlers and anything else that could run, and with them the loading
    // attribute. Adding fixed attributes to the sanitized HTML keeps it safe,
    // and images then load only when scrolled to.
    const clean = this.sanitizer.sanitize(SecurityContext.HTML, dirty) ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(clean.replace(/<img /g, '<img loading="lazy" decoding="async" '));
  }
}
