import { Component, ECS, System, Entity } from "./ECS";
import { createInputEventObservable } from "./mouseEventStream";

// console.clear();

const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

class Positionable extends Component {
  constructor(public x: number, public y: number, public z: number) {
    super();
  }
}
class Velocityable extends Component {
  constructor(public vx: number, public vy: number) {
    super();
  }
}
class BoundingBoxable extends Component {
  constructor(public w: number, public h: number) {
    super();
  }
}
class Drawable extends Component {}
class Selectable extends Component {}
class Selected extends Component {}
class Clickable extends Component {}
class Clicked extends Component {}
class Dragging extends Component {
  constructor(public entityRef: Entity) {
    super();
  }
}

class Transform extends Component {
  constructor(public matrix: DOMMatrix) {
    super();
  }
}

const ecs = new ECS();
const createRect = (x: number, y: number) => {
  const clickable = new Clickable();
  const position = new Positionable(x, y, 1);
  const velocity = new Velocityable(0, 0);
  const box = new BoundingBoxable(20, 20);
  const draw = new Drawable();
  const select = new Selectable();

  const rect = ecs.addEntity();
  ecs.addComponent(rect, clickable);
  ecs.addComponent(rect, position);
  ecs.addComponent(rect, velocity);
  ecs.addComponent(rect, box);
  ecs.addComponent(rect, draw);
  ecs.addComponent(rect, select);
};
class Scrollable extends Component {}
class Scrolled extends Component {
  constructor(public d: number) {
    super();
  }
}
class Pannable extends Component {
  constructor(public x: number, public y: number) {
    super();
  }
}
class Zoomable extends Component {
  constructor(public d: number) {
    super();
  }
}
const createBackground = () => {
  const pan = new Pannable(0, 0);
  const position = new Positionable(0, 0, 0);
  const box = new BoundingBoxable(canvas.width, canvas.height);
  const clickable = new Clickable();
  const zoom = new Zoomable(1);
  const scroll = new Scrollable();

  const background = ecs.addEntity();
  ecs.addComponent(background, position);
  ecs.addComponent(background, box);
  ecs.addComponent(background, pan);
  ecs.addComponent(background, clickable);
  ecs.addComponent(background, zoom);
  ecs.addComponent(background, scroll);
};

createRect(60, 10);
createRect(80, 80);
createRect(50, 40);
createBackground();

class SelectionDragBox extends Component {}

const TRANSFORM = ecs.addEntity();
ecs.addComponent(TRANSFORM, new Transform(new DOMMatrix()));

class KayboardInputSystem extends System {
  componentsRequired = new Set([Selected, Velocityable]);

  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "keyboard")) {
      return;
    }

    const keys = context.event.keys;

    let vy: number | undefined;
    if (keys.has("ArrowUp")) {
      vy = -1;
    } else if (keys.has("ArrowDown")) {
      vy = 1;
    }

    let vx: number | undefined;
    if (keys.has("ArrowRight")) {
      vx = 1;
    } else if (keys.has("ArrowLeft")) {
      vx = -1;
    }

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);

      const velocity = comps.get(Velocityable);
      if (vx === undefined) {
        velocity.vx = 0;
      } else {
        velocity.vx += vx;
      }
      if (vy === undefined) {
        velocity.vy = 0;
      } else {
        velocity.vy += vy;
      }
    }
  }
}

class DoubleClickHandlerSystem extends System {
  constructor(public canvas: HTMLCanvasElement) {
    super();
  }

  private toLocalCoords = (pos: Position, m: DOMMatrix): Position => {
    return new DOMPoint(pos.x, pos.y).matrixTransform(m);
  };

  componentsRequired = new Set([Positionable]);
  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "doubleClick")) {
      return;
    }

    const transform = this.ecs
      .getComponents(TRANSFORM)
      .get(Transform)
      .matrix.inverse();

    const { x, y } = this.toLocalCoords(context.event, transform);

    createRect(x, y);
  }
}

type Position = { x: number; y: number };
class MouseStartSystem extends System {
  constructor(
    public canvas: HTMLCanvasElement,
    public ctx: CanvasRenderingContext2D
  ) {
    super();
  }

  private toLocalCoords = (pos: Position, m: DOMMatrix): Position => {
    return new DOMPoint(pos.x, pos.y).matrixTransform(m);
  };

  private entityHitTest(entities: Iterable<Entity>, point: Position): Entity[] {
    const { x, y } = point;

    const results: Entity[] = [];
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      if (
        x < position.x ||
        x > position.x + box.w ||
        y < position.y ||
        y > position.y + box.h
      ) {
        continue;
      }

      results.push(entity);
    }

    return results;
  }

  private maxByZ = (entities: Entity[]): Entity | undefined => {
    if (entities.length === 0) {
      return undefined;
    }

    return entities
      .map<[number, Entity]>((entity) => [
        this.ecs.getComponents(entity).get(Positionable).z,
        entity
      ])
      .reduce((acc, item) => (item[0] > acc[0] ? item : acc))[1];
  };

  componentsRequired = new Set([Clickable, Positionable, BoundingBoxable]);
  update(entities: Set<Entity>, context) {
    if (!context.event) {
      return;
    }

    const transformMatrix = this.ecs
      .getComponents(TRANSFORM)
      .get(Transform)
      .matrix.inverse();

    switch (context.event.type) {
      case "click": {
        const pos = this.toLocalCoords(context.event, transformMatrix);
        const entity = this.maxByZ(this.entityHitTest(entities, pos));

        if (entity !== undefined) {
          this.ecs.addComponent(entity, new Clicked());
        }
        break;
      }
      case "dragstart": {
        const pos = this.toLocalCoords(context.event, transformMatrix);
        const entity = this.maxByZ(this.entityHitTest(entities, pos));
        const canDragEntityWithLeftMouseButton =
          entity !== undefined && this.ecs.getComponents(entity).has(Drawable);

        if (context.event.button === 0 && !canDragEntityWithLeftMouseButton) {
          const dragRect = this.ecs.addEntity();
          this.ecs.addComponent(
            dragRect,
            new Positionable(context.event.x, context.event.y, 2)
          );
          this.ecs.addComponent(dragRect, new BoundingBoxable(0, 0));
          this.ecs.addComponent(dragRect, new SelectionDragBox());
          // this.ecs.addComponent(dragRect, new Drawable());
          console.log(dragRect);
          return;
        }

        if (entity !== undefined) {
          const dragEl = this.ecs.addEntity();
          const positionable = this.ecs.getComponents(entity).get(Positionable);

          this.ecs.addComponent(entity, new Dragging(dragEl));
          this.ecs.addComponent(
            dragEl,
            new Positionable(positionable.x, positionable.y, 2)
          );
        }

        break;
      }
    }
  }
}

class MouseScrollSystem extends System {
  componentsRequired = new Set([Scrollable]);
  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "wheel")) {
      return;
    }

    for (const entity of entities) {
      this.ecs.addComponent(entity, new Scrolled(context.event.d));
    }
  }
}

class HandleScrollZoomSystem extends System {
  constructor(
    public canvas: HTMLCanvasElement,
    public ctx: CanvasRenderingContext2D
  ) {
    super();
  }

  componentsRequired = new Set([Scrollable, Zoomable]);
  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "wheel")) {
      return;
    }

    let scaleFactor = context.event.d <= 0 ? 1.2 : 1 / 1.2;

    for (const entity of entities) {
      const transform = this.ecs.getComponents(TRANSFORM).get(Transform);
      const matrix = transform.matrix;
      transform.matrix = matrix.scale(scaleFactor, scaleFactor);
    }
  }
}

class DragHandlerSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([Dragging]);
  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "dragmove")) {
      return;
    }

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const originalPosition = comps.get(Positionable);
      const dragEl = comps.get(Dragging).entityRef;

      const dragPosition = this.ecs.getComponents(dragEl).get(Positionable);

      const mouseToCanvas = this.ecs
        .getComponents(TRANSFORM)
        .get(Transform)
        .matrix.inverse();

      dragPosition.x = originalPosition.x + mouseToCanvas.a * context.event.dx;
      dragPosition.y = originalPosition.y + mouseToCanvas.a * context.event.dy;
    }
  }
}

class DragSelectionHandlerSystem extends System {
  componentsRequired = new Set([
    SelectionDragBox,
    Positionable,
    BoundingBoxable
  ]);
  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "dragmove")) {
      return;
    }

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      box.w = context.event.dx;
      box.h = context.event.dy;
    }
  }
}

class DragEndHandlerSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([Drawable, Dragging]);
  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "dragend")) {
      return;
    }

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const dragEl = comps.get(Dragging).entityRef;

      const originalPosition = this.ecs.getComponents(entity).get(Positionable);

      this.ecs.removeComponent(entity, Dragging);
      this.ecs.removeEntity(dragEl);

      const mouseToCanvas = this.ecs
        .getComponents(TRANSFORM)
        .get(Transform)
        .matrix.inverse();

      originalPosition.x += mouseToCanvas.a * context.event.dx;
      originalPosition.y += mouseToCanvas.a * context.event.dy;
    }
  }
}

class DragSelectionEndHandlerSystem extends System {
  componentsRequired = new Set([SelectionDragBox]);
  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "dragend")) {
      return;
    }

    for (const entity of entities) {
      this.ecs.removeComponent(entity, SelectionDragBox);
      this.ecs.removeEntity(entity);
    }
  }
}

class PanDragHandlerSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }
  componentsRequired = new Set([Pannable, Dragging]);
  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "dragmove")) {
      return;
    }

    for (const entity of entities) {
      const pan = this.ecs.getComponents(entity).get(Pannable);
      const transform = this.ecs.getComponents(TRANSFORM).get(Transform);
      const currentMatrix = transform.matrix;

      currentMatrix.e = pan.x + context.event.dx;
      currentMatrix.f = pan.y + context.event.dy;
    }
  }
}

class PanDragEndHandlerSystem extends System {
  componentsRequired = new Set([
    Positionable,
    Pannable,
    Dragging,
    BoundingBoxable
  ]);

  update(entities: Set<Entity>, context) {
    if (!(context.event && context.event.type === "dragend")) {
      return;
    }

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const dragEl = comps.get(Dragging).entityRef;

      const pan = comps.get(Pannable);
      pan.x += context.event.dx;
      pan.y += context.event.dy;

      this.ecs.removeComponent(entity, Dragging);
      this.ecs.removeEntity(dragEl);
    }
  }
}

class PanSyncSystem extends System {
  constructor(public canvas: HTMLCanvasElement) {
    super();
  }
  componentsRequired = new Set([Positionable, Pannable, BoundingBoxable]);

  update(entities: Set<Entity>) {
    for (const entity of entities) {
      const transform = this.ecs
        .getComponents(TRANSFORM)
        .get(Transform)
        .matrix.inverse();
      const comps = this.ecs.getComponents(entity);

      const position = comps.get(Positionable);
      position.x = transform.e;
      position.y = transform.f;

      const box = comps.get(BoundingBoxable);
      box.w = transform.a * this.canvas.width;
      box.h = transform.a * this.canvas.height;
    }
  }
}

class SelectionSystem extends System {
  componentsRequired = new Set([Selectable, Clicked]);
  update(entities: Set<Entity>) {
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const selected = comps.has(Selected);

      if (selected) {
        this.ecs.removeComponent(entity, Selected);
      } else {
        this.ecs.addComponent(entity, new Selected());
      }
    }
  }
}

class CleanupClickedSystem extends System {
  componentsRequired = new Set([Clicked]);
  update(entities: Set<Entity>) {
    for (const entity of entities) {
      this.ecs.removeComponent(entity, Clicked);
    }
  }
}

class CleanupScrolledSystem extends System {
  componentsRequired = new Set([Scrolled]);
  update(entities: Set<Entity>) {
    for (const entity of entities) {
      this.ecs.removeComponent(entity, Scrolled);
    }
  }
}

class MovementSystem extends System {
  componentsRequired = new Set([Positionable, Velocityable]);
  update(entities: Set<Entity>) {
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const velocity = comps.get(Velocityable);

      position.x += velocity.vx;
      position.y += velocity.vy;
    }
  }
}

class RenderSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([Positionable, Drawable, BoundingBoxable]);
  update(entities: Set<Entity>) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ctx.save();
    ctx.setTransform(this.ecs.getComponents(TRANSFORM).get(Transform).matrix);
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      this.ctx.fillStyle = comps.has(Selected) ? "red" : "black";
      this.ctx.fillRect(position.x, position.y, box.w, box.h);
    }
    ctx.restore();
  }
}

class RenderDebugSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([Positionable, Pannable, BoundingBoxable]);
  update(entities: Set<Entity>) {
    const matrix = this.ecs.getComponents(TRANSFORM).get(Transform).matrix;
    ctx.save();
    ctx.setTransform(matrix);

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);
      const pan = comps.get(Pannable);

      ctx.save();
      ctx.resetTransform();
      this.ctx.fillText(`Pan: ${pan.x},${pan.y}`, 5, 12);
      this.ctx.fillText(`Zoom: ${matrix.a},${matrix.d}`, 5, 24);

      ctx.restore();

      this.ctx.globalAlpha = 0.1;
      this.ctx.fillRect(position.x, position.y, box.w, box.h);
      this.ctx.globalAlpha = 1;
      break;
    }
    ctx.restore();
  }
}

class RenderDragSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([
    Positionable,
    Dragging,
    BoundingBoxable,
    Drawable
  ]);
  update(entities: Set<Entity>) {
    ctx.save();
    ctx.setTransform(this.ecs.getComponents(TRANSFORM).get(Transform).matrix);
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const box = comps.get(BoundingBoxable);
      const dragEl = comps.get(Dragging).entityRef;

      const dragPosition = this.ecs.getComponents(dragEl).get(Positionable);
      this.ctx.globalAlpha = 0.2;
      this.ctx.fillRect(dragPosition.x, dragPosition.y, box.w, box.h);
      this.ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

class RenderDragSelectionSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([
    Positionable,
    BoundingBoxable,
    SelectionDragBox
  ]);

  update(entities: Set<Entity>, context) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      this.ctx.fillRect(position.x, position.y, box.w, box.h);
    }
    ctx.restore();
  }
}

ecs.addSystem(new KayboardInputSystem());
ecs.addSystem(new MouseStartSystem(canvas, ctx));
ecs.addSystem(new MouseScrollSystem());
ecs.addSystem(new DoubleClickHandlerSystem(canvas));

ecs.addSystem(new PanDragHandlerSystem(ctx));
ecs.addSystem(new DragHandlerSystem(ctx));
ecs.addSystem(new DragSelectionHandlerSystem());

ecs.addSystem(new HandleScrollZoomSystem(canvas, ctx));

ecs.addSystem(new PanDragEndHandlerSystem());
ecs.addSystem(new DragEndHandlerSystem(ctx));
ecs.addSystem(new DragSelectionEndHandlerSystem());

ecs.addSystem(new SelectionSystem());

ecs.addSystem(new MovementSystem());

ecs.addSystem(new PanSyncSystem(canvas));

ecs.addSystem(new RenderSystem(ctx));
ecs.addSystem(new RenderDragSystem(ctx));
ecs.addSystem(new RenderDebugSystem(ctx));
ecs.addSystem(new RenderDragSelectionSystem(ctx));

ecs.addSystem(new CleanupClickedSystem());
ecs.addSystem(new CleanupScrolledSystem());

const go = () => {
  const obs = createInputEventObservable(canvas);
  const rect = canvas.getBoundingClientRect();

  ecs.update({ event: undefined });
  obs.subscribe((ev) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    ecs.update({
      event:
        "x" in ev && "y" in ev
          ? { ...ev, x: ev.x - rect.left, y: ev.y - rect.top }
          : ev
    });
  });
};

go();
