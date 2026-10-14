#!/bin/sh
# The theme's rules that grep can check (see the theme skill's "Rules").
# Run from the repo root; prints what breaks a rule and exits 1, or prints
# "Theme: ok". The `theme-color` meta in index.html is a marked exception.
cd "$(git rev-parse --show-toplevel)" || exit 2
found=0

report() {
  if [ -n "$2" ]; then
    echo "== $1"
    echo "$2"
    found=1
  fi
}

report "Raw colours, gradients or font families outside the theme (use role tokens)" "$(
  grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|gradient\(|font-family:\s*'" apps libs \
    --include=*.css --include=*.scss --include=*.html --include=*.ts |
    grep -v "libs/ui/components/src/theme/" | grep -v node_modules |
    grep -vE 'href="#|routerLink="#' | grep -v 'name="theme-color"'
)"

report "Raw shadows outside the theme (use --shadow-* or --glow-*)" "$(
  grep -rnE "(box|text)-shadow:[[:space:]]*[^v;[:space:]]" apps libs --include=*.scss |
    grep -v "libs/ui/components/src/theme/" | grep -vE "shadow:[[:space:]]*(none|var[(])"
)"

report "Palette tokens outside the theme (use a role)" "$(
  grep -rn -- "--palette-" apps libs | grep -v "libs/ui/components/src/theme/"
)"

# A class on a <cdt-…> component is its parent's styling hook, not a hand-made control.
report "Hand-made controls or old classes (use the UI building blocks)" "$(
  grep -rnE 'type="checkbox"|class="([^"]* )?(btn|form-control|xiv-(panel|title-bar|chip|cta|check|dialog|backdrop)|nav-pills|tag-default|tag-pill|card|card-footer|banner|form-group|error-messages)( [^"]*)?"' \
    libs apps --include=*.html | grep -vE "libs/ui/components/|libs/core/forms/" |
    grep -v "<cdt-"
)"

report "styles.scss does more than load the theme" "$(
  grep -vE '^\s*(//.*)?$' apps/everise/src/styles.scss |
    grep -v "@use '../../../libs/ui/components/src/theme'"
)"

report "ng-deep or ViewEncapsulation.None" "$(
  grep -rn "ng-deep\|ViewEncapsulation.None" apps libs --include=*.ts --include=*.scss | grep -v node_modules
)"

report "Raw width media queries (use bp.up)" "$(
  grep -rnE "@media \((min|max)-width" apps libs --include=*.scss | grep -v "theme/_breakpoints.scss"
)"

report "Hand-styled avatars (use cdt-avatar)" "$(
  grep -rnE "<img [^>]*class=\"(avatar|portrait|user-img)" apps libs --include=*.html
)"

[ "$found" = 0 ] && echo "Theme: ok"
exit "$found"
