import { merge} from "rxjs";

import {createWheelObservable, createDragClickObservable } from "./mouseEventStream"
import {createKeyboardObservable } from "./keyboardEventStream"


export const createInputEventObservable = (element: HTMLElement | Document) => {
    return merge(
      createDragClickObservable(element),
      createWheelObservable(element),
      createKeyboardObservable(element)
    );
  };