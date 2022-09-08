import { defer, animationFrameScheduler, interval } from "rxjs";
import { map } from "rxjs/operators"; // iterable construct - iterable in that it represents a collection which may be infinite

export const animationFrameObservable = defer(() => {
  // using interval but not using the default scheduler
  return interval(0, animationFrameScheduler).pipe(
    // modify output to return elapsed time and time diff from last frame
    map(() => {
      const currentTime = animationFrameScheduler.now();

      return { type: "frame", t: currentTime };
    })
  );
});
