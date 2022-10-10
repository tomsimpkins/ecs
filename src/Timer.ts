export class Timer {
  constructor(interval: number = 5000) {
    setInterval(() => {
      const byName = performance
        .getEntriesByType("measure")
        .filter((p) => p.duration !== 0)
        .reduce<Record<string, [number, number]>>((o, p) => {
          o[p.name] ??= [0, 0];
          o[p.name][0] += p.duration;
          o[p.name][1]++;

          return o;
        }, {});

      const averages = Object.fromEntries(
        Object.entries(byName)
          .map<[string, number]>(([k, [sum, cnt]]) => [k, sum / cnt])
          .sort((a, b) => b[1] - a[1])
      );
      console.log(averages);

      performance.clearMarks();
      performance.clearMeasures();
    }, interval);
  }

  time = (key: string) => {
    performance.mark(key);
  };
  timeEnd = (key: string) => {
    performance.measure(key, key);
  };
}
