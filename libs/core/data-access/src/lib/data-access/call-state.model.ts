import type { Signal } from '@angular/core';

export type CallState = 'init' | 'loading' | 'loaded' | { error: string };

export type NamedCallStateSlice<Collection extends string> = {
  [K in Collection as `${K}CallState`]: CallState;
};

export type CallStateSlice = {
  callState: CallState;
};

export type NamedCallStateSignals<Prop extends string> = {
  [K in Prop as `${K}Loading`]: Signal<boolean>;
} & {
  [K in Prop as `${K}Loaded`]: Signal<boolean>;
} & {
  [K in Prop as `${K}Error`]: Signal<string | null>;
};

export type CallStateSignals = {
  loading: Signal<boolean>;
  loaded: Signal<boolean>;
  error: Signal<string | null>;
};
