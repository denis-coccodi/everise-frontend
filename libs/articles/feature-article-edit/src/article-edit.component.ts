import { InputErrorsComponent, ListErrorsComponent } from '@realworld/core/forms';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ArticleStore } from '@realworld/articles/data-access';
import { ButtonComponent, FieldComponent, InputComponent } from '@realworld/ui/components';

@Component({
  selector: 'cdt-article-edit',
  templateUrl: './article-edit.component.html',
  imports: [
    FieldComponent,
    ButtonComponent,
    InputComponent,
    ListErrorsComponent,
    ReactiveFormsModule,
    InputErrorsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArticleEditComponent implements OnDestroy {
  private readonly articleStore = inject(ArticleStore);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute).snapshot;

  // /editor/:slug edits an article; /editor writes a new one.
  protected readonly editing = () => this.route.paramMap.has('slug') || !!this.route.firstChild?.paramMap.has('slug');

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]],
    body: ['', [Validators.required]],
    tagList: [''],
  });

  readonly setArticleDataToForm = effect(() => {
    const articleLoaded = this.articleStore.getArticleLoaded();
    if (articleLoaded) {
      this.form.patchValue({
        title: this.articleStore.data.title(),
        description: this.articleStore.data.description(),
        body: this.articleStore.data.body(),
        tagList: this.articleStore.data.tagList().join(', '),
      });
    }
  });

  onSubmit() {
    const article = {
      article: { ...this.form.getRawValue(), tagList: this.form.controls.tagList.value.split(',') },
    };
    if (this.articleStore.data.slug()) {
      this.articleStore.editArticle({ editArticle: article, slug: this.articleStore.data.slug() });
    } else {
      this.articleStore.publishArticle(article);
    }
  }

  ngOnDestroy() {
    this.form.reset();
  }
}
