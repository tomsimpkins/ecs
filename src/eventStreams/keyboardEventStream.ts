import { fromEvent, merge } from "rxjs";
import {
  map,
  filter,
  scan,
} from "rxjs/operators"; // iterable construct - iterable in that it represents a collection which may be infinite


export const createKeyboardObservable = (element: HTMLElement | Document) => {
    const allowedKeys = new Set([
      "ArrowRight",
      "ArrowLeft",
      "ArrowUp",
      "ArrowDown"
    ]);
  
    const keyDowns = fromEvent<KeyboardEvent>(element, "keydown");
    const keyUps = fromEvent<KeyboardEvent>(element, "keyup");
  
    return merge(keyDowns, keyUps).pipe(
      filter((k) => allowedKeys.has(k.key)),
      scan((acc, ev) => {
        const nextAcc = new Set(acc);
  
        switch (ev.type) {
          case "keydown": {
            nextAcc.add(ev.key);
            break;
          }
          case "keyup": {
            nextAcc.delete(ev.key);
            break;
          }
        }
  
        return nextAcc;
      }, new Set()),
      map((v) => ({ type: "keyboard", keys: v }))
    );
  };