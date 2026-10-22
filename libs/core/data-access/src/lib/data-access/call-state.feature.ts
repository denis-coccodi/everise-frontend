/* eslint-disable */
import { Signal, computed } from '@angular/core';
import { SignalStoreFeature, signalStoreFeature, withComputed, withState } from '@ngrx/signals';
import type {
  CallState,
  NamedCallStateSlice,
  CallStateSlice,
  NamedCallStateSignals,
  CallStateSignals,
} from './call-state.model';

export function getCallStateKeys(config?: { collection?: string }) {
  const prop = config?.collection;
  return {
    callStateKey: prop ? `${config.collection}CallState` : 'callState',
    loadingKey: prop ? `${config.collection}Loading` : 'loading',
    loadedKey: prop ? `${config.collection}Loaded` : 'loaded',
    errorKey: prop ? `${config.collection}Error` : 'error',
  };
}

export function withCallState<Collection extends string>(config: {
  collection: Collection;
}): SignalStoreFeature<
  { state: {}; props: {}; methods: {} },
  {
    state: NamedCallStateSlice<Collection>;
    props: NamedCallStateSignals<Collection>;
    methods: {};
  }
>;
export function withCallState(): SignalStoreFeature<
  { state: {}; props: {}; methods: {} },
  {
    state: CallStateSlice;
    props: CallStateSignals;
    methods: {};
  }
>;
export function withCallState<Collection extends string>(config?: { collection: Collection }): SignalStoreFeature {
  const { callStateKey, errorKey, loadedKey, loadingKey } = getCallStateKeys(config);

  return signalStoreFeature(
    withState({ [callStateKey]: 'init' }),
    withComputed((state: Record<string, Signal<unknown>>) => {
      const callState = state[callStateKey] as Signal<CallState>;

      return {
        [loadingKey]: computed(() => callState() === 'loading'),
        [loadedKey]: computed(() => callState() === 'loaded'),
        [errorKey]: computed(() => {
          const v = callState();
          return typeof v === 'object' ? v.error : null;
        }),
      };
    }),
  );
}

export function setLoading<Prop extends string>(prop?: Prop): NamedCallStateSlice<Prop> | CallStateSlice {
  if (prop) {
    return { [`${prop}CallState`]: 'loading' } as NamedCallStateSlice<Prop>;
  }

  return { callState: 'loading' };
}

export function setLoaded<Prop extends string>(prop?: Prop): NamedCallStateSlice<Prop> | CallStateSlice {
  if (prop) {
    return { [`${prop}CallState`]: 'loaded' } as NamedCallStateSlice<Prop>;
  } else {
    return { callState: 'loaded' };
  }
}

export function setError<Prop extends string>(error: string, prop?: Prop): NamedCallStateSlice<Prop> | CallStateSlice {
  if (prop) {
    return { [`${prop}CallState`]: { error } } as NamedCallStateSlice<Prop>;
  } else {
    return { callState: { error } };
  }
}
