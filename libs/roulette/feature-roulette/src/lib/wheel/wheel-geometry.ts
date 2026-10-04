// Geometry for an SVG wheel of equal segments, centred on (0, 0). Angles are
// in degrees, clockwise from the top, where the pointer sits.

export interface WheelSegment {
  label: string;
  path: string;
  // Rotation that lays the label along the segment's middle radius.
  labelTransform: string;
}

function point(radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return `${(radius * Math.sin(radians)).toFixed(2)} ${(-radius * Math.cos(radians)).toFixed(2)}`;
}

export function wheelSegments(labels: string[], radius: number, maxLabelLength: number): WheelSegment[] {
  const span = 360 / labels.length;

  return labels.map((label, i) => {
    const start = i * span;
    const end = start + span;
    const largeArc = span > 180 ? 1 : 0;
    const centre = start + span / 2;

    return {
      label: label.length > maxLabelLength ? `${label.slice(0, maxLabelLength - 1)}…` : label,
      // A single segment is the whole disc, drawn by the template as a circle.
      path:
        labels.length === 1
          ? ''
          : `M 0 0 L ${point(radius, start)} A ${radius} ${radius} 0 ${largeArc} 1 ${point(radius, end)} Z`,
      // Labels on the left half are turned round so none reads upside down.
      labelTransform:
        centre > 180
          ? `rotate(${centre + 90}) translate(${-radius * 0.58} 0)`
          : `rotate(${centre - 90}) translate(${radius * 0.58} 0)`,
    };
  });
}

// The wheel rotation, from `current`, that brings segment `index` of `count`
// under the pointer after at least `turns` full turns. `offset` (-0.5..0.5)
// moves the stop within the segment, away from the dividers.
export function targetRotation(current: number, index: number, count: number, turns: number, offset = 0) {
  const span = 360 / count;
  const centre = (index + 0.5 + offset * 0.7) * span;
  const remainder = (((-centre - current) % 360) + 360) % 360;
  return current + turns * 360 + remainder;
}

// The segment under the pointer at a rotation; the inverse of targetRotation.
export function segmentAt(rotation: number, count: number) {
  const angle = (((-rotation % 360) + 360) % 360) / (360 / count);
  return Math.floor(angle) % count;
}
