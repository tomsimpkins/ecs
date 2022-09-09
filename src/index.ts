import { Transform } from "./components/index";
import { ECS } from "./ECS";
import { createInputEventObservable } from "./eventStreams";
import { createBackground } from "./init/utils";
import {
  DoubleClickHandlerSystem,
  KeyboardInputSystem,
  MouseScrollSystem,
  MouseStartSystem,
  MovementSystem,
  RenderDebugSystem,
  RenderDragSelectionSystem,
  RenderDragSystem,
  RenderSystem,
  SelectionByAreaSystem,
  SelectionSystem,
  ZoomSystem
} from "./systems";
import { AnimationSystem, LayoutSystem, RenderSystem2 } from "./systems/index";

const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
canvas.width = window.innerWidth - 16;
canvas.height = window.innerHeight - 16;
const ctx = canvas.getContext("2d")!;

const ecs = new ECS();

const TRANSFORM = ecs.addEntity(); // corresponds to TRANSFORM_ELEMENT in constants
ecs.addComponent(TRANSFORM, new Transform(new DOMMatrix()));

createBackground(ecs);

// add all the systems, which subscribe to the appropriate events
ecs.addSystem(new KeyboardInputSystem(), ["keyboard"]);
ecs.addSystem(new MouseStartSystem(canvas, ctx), ["click", "dragstart"]);
ecs.addSystem(new MouseScrollSystem(), ["wheel"]);
ecs.addSystem(new DoubleClickHandlerSystem(canvas), ["doubleClick"]);

ecs.addSystem(new ZoomSystem(canvas, ctx), ["zoom"]);

ecs.addSystem(new SelectionByAreaSystem(), ["selectArea"]);
ecs.addSystem(new SelectionSystem(), ["selectEntity"]);

ecs.addSystem(new LayoutSystem(), ["drawLayout"]);

ecs.addSystem(new MovementSystem(), ["frame"]);
ecs.addSystem(new AnimationSystem(), ["frame"]);

ecs.addSystem(new RenderSystem(canvas, ctx), "frame");
ecs.addSystem(new RenderDragSystem(ctx), "frame");
ecs.addSystem(new RenderDebugSystem(canvas, ctx), "frame");
ecs.addSystem(new RenderDragSelectionSystem(ctx), "frame");
ecs.addSystem(new RenderSystem2(canvas, ctx), ["frame"]);

const go = () => {
  const obs = createInputEventObservable(canvas);
  const rect = canvas.getBoundingClientRect();

  ecs.update({ type: "init" });
  obs.subscribe((ev) => {
    // clear the canvas, then fire the events
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ecs.update(
      "x" in ev && "y" in ev
        ? { ...ev, x: ev.x - rect.left, y: ev.y - rect.top }
        : ev
    );
  });
};

go();

const multiSelect = document.getElementById("BucketsSelector") as HTMLSelectElement
multiSelect?.addEventListener("change", function handleClick(event) {
  ecs.update({ type: "drawLayout", groupBy: event.currentTarget.value });
})