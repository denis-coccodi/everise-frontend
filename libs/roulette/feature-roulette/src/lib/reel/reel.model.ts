export interface ReelItem {
  title: string;
  detail: string;
  // An image shown after the title, e.g. a job icon.
  icon?: string;
  // A small image before the text, e.g. the duty type's icon.
  thumb?: string;
  // An image shown faintly behind the row once it has won, e.g. the duty's
  // banner. Only the winner's is loaded.
  backdrop?: string;
}
