import { fromEvent, merge, of, interval, from } from "rxjs";
import {
  map,
  filter,
  throttleTime,
  scan,
  mergeMap,
  buffer,
  throttle
} from "rxjs/operators"; // iterable construct - iterable in that it represents a collection which may be infinite

const createClickDragStateMachine = () => {
  const dist = (xy: [number, number], xy2: [number, number]): number => {
    return (xy[0] - xy2[0]) ** 2 + (xy[1] - xy2[1]) ** 2;
  };
  let downCoordinate: [number, number] | undefined;
  let button: number | undefined;

  const stateMachine = {
    up: (e: MouseEvent) => {
      switch (e.type) {
        case "mousemove": {
          return [stateMachine["up"]];
        }
        case "mousedown": {
          downCoordinate = [e.clientX, e.clientY];
          button = e.button;
          return [stateMachine["down"]];
        }
        default: {
          return [stateMachine["up"]];
        }
      }
    },
    down: (e: MouseEvent) => {
      switch (e.type) {
        case "mousemove": {
          if (dist([e.clientX, e.clientY], downCoordinate!) > 5) {
            return [
              stateMachine["dragging"],
              {
                type: "dragstart",
                button: button!,
                x: downCoordinate![0],
                y: downCoordinate![1]
              }
            ];
          } else {
            return [stateMachine["down"]];
          }
        }
        case "mouseup": {
          downCoordinate = undefined;
          return [
            stateMachine["up"],
            { type: "click", x: e.clientX, y: e.clientY }
          ];
        }
        default: {
          return [stateMachine["down"]];
        }
      }
    },
    dragging: (e: MouseEvent) => {
      switch (e.type) {
        case "mousemove": {
          const [sx, sy] = downCoordinate!;
          return [
            stateMachine["dragging"],
            {
              type: "dragmove",
              sx: e.clientX,
              sy: e.clientY,
              dx: e.clientX - sx,
              dy: e.clientY - sy
            }
          ];
        }
        case "mouseup": {
          const [sx, sy] = downCoordinate!;
          downCoordinate = undefined;
          button = undefined;
          return [
            stateMachine["up"],
            {
              type: "dragend",
              x: e.clientX,
              y: e.clientY,
              dx: e.clientX - sx,
              dy: e.clientY - sy
            }
          ];
        }
        default: {
          return [stateMachine["dragging"]];
        }
      }
    }
  };

  return stateMachine["up"];
};

export const createDragClickObservable = (element: HTMLElement | Document) => {
  const downEvents = fromEvent<MouseEvent>(element, "mousedown");
  const moveEvents = fromEvent<MouseEvent>(element, "mousemove").pipe(
    throttleTime(16)
  );
  const upEvents = fromEvent<MouseEvent>(element, "mouseup");

  const raw = merge(downEvents, moveEvents, upEvents).pipe(
    scan<MouseEvent, null | [any, { type: string }]>(
      (state, event) =>
        state === null
          ? [createClickDragStateMachine()][0](event)
          : state[0](event),
      null
    ),
    filter((e): e is [any, { type: string }] => !!e?.[1]),
    map((pair) => pair[1])
  );

  const withDoubleClicks = raw.pipe(
    buffer(
      raw.pipe(
        throttle((v) => (v.type === "click" ? interval(150) : of(1)), {
          trailing: true
        })
      )
    ),
    filter((v) => !!v.length),
    mergeMap((v) =>
      v.length === 2 && v.every((e) => e.type === "click")
        ? of({
            type: "doubleClick",
            x: v[v.length - 1].x,
            y: v[v.length - 1].y
          })
        : from(v)
    )
  );

  return withDoubleClicks;
};

export const createWheelObservable = (element: HTMLElement | Document) => {
  const wheelEvents = fromEvent<WheelEvent>(element, "wheel").pipe(
    map((event) => ({
      type: "wheel",
      d: event.deltaY,
      x: event.clientX,
      y: event.clientY
    }))
  );

  return wheelEvents;
};




