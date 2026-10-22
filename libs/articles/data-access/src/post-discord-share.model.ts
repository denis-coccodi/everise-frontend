export interface PostDiscordShareState {
  status: 'idle' | 'sending' | 'shared' | 'error';
  error: string | null;
}
