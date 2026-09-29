interface DonutSlice {
  share: number;
}

export type DonutArc<T extends DonutSlice> = T & { length: number; offset: number };

export function donutArcs<T extends DonutSlice>(slices: readonly T[], circumference: number): DonutArc<T>[] {
  return slices.map((slice, index) => ({
    ...slice,
    length: slice.share * circumference,
    offset: slices.slice(0, index).reduce((sum, previous) => sum + previous.share * circumference, 0),
  }));
}
