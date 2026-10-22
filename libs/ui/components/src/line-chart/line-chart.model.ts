export interface Tick {
  value: number;
  label: string;
}

// A value axis: its ends and its marks.
export interface ValueAxis {
  min: number;
  max: number;
  scale: ChartScale;
  ticks: Tick[];
}

export type ChartScale = 'linear' | 'log';

export interface ChartPoint {
  // When (ms; a UTC day's start).
  at: number;
  value: number;
  // More about the point, read after its value ("5 sales").
  detail?: string;
}

export interface ChartLine {
  name: string;
  points: ChartPoint[];
}
