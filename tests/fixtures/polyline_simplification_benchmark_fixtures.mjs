function createWavePolyline({ count, longitudeStep, latitudeBase = 0, amplitude, frequency }) {
  return Array.from({ length: count }, (_value, index) => [
    Number((index * longitudeStep).toFixed(6)),
    Number((latitudeBase + Math.sin(index / frequency) * amplitude).toFixed(6)),
  ]);
}

export const POLYLINE_SIMPLIFICATION_BENCHMARK_FIXTURES = [
  {
    name: "messy-coastline-input",
    baseEpsilon: 0.08,
    areaThreshold: 0.015,
    points: [
      [-4, 50],
      [-4, 50],
      ["-3.5", "50.08"],
      null,
      [-3, 50],
      [Number.NaN, 50.1],
      [-2.5, 50.22],
      [-2, 50.02],
      [-1.5, 50.18],
      [-1, Infinity],
      [-1, 50],
      [-0.5, 50.04],
      [0, 50],
    ],
  },
  {
    name: "mid-latitude-wave",
    baseEpsilon: 0.06,
    areaThreshold: 0.006,
    points: createWavePolyline({
      count: 180,
      longitudeStep: 0.04,
      latitudeBase: 38,
      amplitude: 0.18,
      frequency: 4.5,
    }),
  },
  {
    name: "high-latitude-wave",
    baseEpsilon: 0.04,
    areaThreshold: 0.004,
    points: createWavePolyline({
      count: 160,
      longitudeStep: 0.035,
      latitudeBase: 78,
      amplitude: 0.1,
      frequency: 4,
    }),
  },
];
