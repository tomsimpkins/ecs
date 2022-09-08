import { Component, ECS, System, Entity } from "./ECS";
import { createInputEventObservable } from "./mouseEventStream";

// console.clear();

const canvas = document.getElementById("myCanvas") as HTMLCanvasElement;
canvas.width = window.innerWidth - 16;
canvas.height = window.innerHeight - 16;
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
  const clickable = new Clickable();
  const zoom = new Zoomable(1);
  const scroll = new Scrollable();

  const background = ecs.addEntity();
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

  update(entities: Set<Entity>, event) {
    const keys = event.keys;

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
  update(entities: Set<Entity>, event) {
    const transform = this.ecs
      .getComponents(TRANSFORM)
      .get(Transform)
      .matrix.inverse();

    const { x, y } = this.toLocalCoords(event, transform);

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

  private entityHitTest(
    entities: Iterable<Entity>,
    point: Position,
    dims: { w: number; h: number } = { w: 0, h: 0 }
  ): Entity[] {
    const { x, y } = point;
    const { w, h } = dims;

    const results: Entity[] = [];
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      if (
        x + w < position.x ||
        x > position.x + box.w ||
        y + h < position.y ||
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
        entity,
      ])
      .reduce((acc, item) => (item[0] > acc[0] ? item : acc))[1];
  };

  componentsRequired = new Set([Clickable, Positionable, BoundingBoxable]);
  update(entities: Set<Entity>, event) {
    const transformMatrix = this.ecs
      .getComponents(TRANSFORM)
      .get(Transform)
      .matrix.inverse();

    switch (event.type) {
      case "click": {
        const pos = this.toLocalCoords(event, transformMatrix);
        const entity = this.maxByZ(this.entityHitTest(entities, pos));

        if (entity !== undefined) {
          this.ecs.enqueueEvent({ type: "selectEntity", entity });
        }
        break;
      }
      case "dragstart": {
        const pos = this.toLocalCoords(event, transformMatrix);
        const entity = this.maxByZ(this.entityHitTest(entities, pos));

        if (entity === undefined && event.button === 0) {
          this.ecs.addSystem(new DragSelectionHandlerSystem(), [
            "dragmove",
            "dragend",
          ]);

          const dragEl = this.ecs.addEntity();
          this.ecs.addComponent(dragEl, new Positionable(event.x, event.y, 2));
          this.ecs.addComponent(dragEl, new BoundingBoxable(0, 0));
          this.ecs.addComponent(dragEl, new SelectionDragBox());
        } else if (entity === undefined) {
          this.ecs.addSystem(new PanSystem(canvas, ctx), [
            "dragmove",
            "dragend",
          ]);
        } else {
          const dragEl = this.ecs.addEntity();
          const positionable = this.ecs.getComponents(entity).get(Positionable);

          this.ecs.addComponent(entity, new Dragging(dragEl));
          this.ecs.addComponent(
            dragEl,
            new Positionable(positionable.x, positionable.y, 2)
          );
          ecs.addSystem(new DragElementSystem(ctx), ["dragmove", "dragend"]);
        }

        break;
      }
    }
  }
}

class MouseScrollSystem extends System {
  componentsRequired = new Set([Scrollable]);
  update(entities: Set<Entity>, event, context) {
    for (const entity of entities) {
      this.ecs.enqueueEvent({ type: "zoom", d: event.d });
      break;
    }
  }
}

class ZoomSystem extends System {
  constructor(
    public canvas: HTMLCanvasElement,
    public ctx: CanvasRenderingContext2D
  ) {
    super();
  }

  componentsRequired = new Set([Zoomable]);
  update(entities: Set<Entity>, event) {
    for (const entity of entities) {
      const transform = this.ecs.getComponents(TRANSFORM).get(Transform);
      const { d } = event;
      const scaleFactor = d <= 0 ? 1.2 : 1 / 1.2;

      const matrix = transform.matrix;
      transform.matrix = matrix.scale(scaleFactor, scaleFactor);
    }
  }
}

class DragElementSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([Dragging, Positionable]);
  update(entities: Set<Entity>, event) {
    if (event.type === "dragmove") {
      for (const entity of entities) {
        const comps = this.ecs.getComponents(entity);
        const originalPosition = comps.get(Positionable);
        const dragEl = comps.get(Dragging).entityRef;

        const dragPosition = this.ecs.getComponents(dragEl).get(Positionable);

        const mouseToCanvas = this.ecs
          .getComponents(TRANSFORM)
          .get(Transform)
          .matrix.inverse();

        dragPosition.x = originalPosition.x + mouseToCanvas.a * event.dx;
        dragPosition.y = originalPosition.y + mouseToCanvas.a * event.dy;
      }
    } else if (event.type === "dragend") {
      for (const entity of entities) {
        const comps = this.ecs.getComponents(entity);
        const dragEl = comps.get(Dragging).entityRef;

        const originalPosition = this.ecs
          .getComponents(entity)
          .get(Positionable);

        const mouseToCanvas = this.ecs
          .getComponents(TRANSFORM)
          .get(Transform)
          .matrix.inverse();

        originalPosition.x += mouseToCanvas.a * event.dx;
        originalPosition.y += mouseToCanvas.a * event.dy;

        this.ecs.removeComponent(entity, Dragging);
        this.ecs.removeEntity(dragEl);
      }

      this.ecs.removeSystem(this);
    }
  }
}

class DragSelectionHandlerSystem extends System {
  componentsRequired = new Set([
    SelectionDragBox,
    Positionable,
    BoundingBoxable,
  ]);
  update(entities: Set<Entity>, event) {
    if (entities.size !== 1) {
      console.warn(
        "exited drag selection due to multiple drag selection elements"
      );
      return;
    }

    const [entity] = [...entities];

    const comps = this.ecs.getComponents(entity);
    const box = comps.get(BoundingBoxable);
    const position = comps.get(Positionable);

    box.w = event.dx;
    box.h = event.dy;

    if (event.type === "dragend") {
      this.ecs.removeComponent(entity, SelectionDragBox);
      this.ecs.removeEntity(entity);

      this.ecs.removeSystem(this);

      this.ecs.enqueueEvent({
        type: "selectArea",
        ...(box.w < 0
          ? { x: position.x + box.w, w: -box.w }
          : { x: position.x, w: box.w }),
        ...(box.h < 0
          ? { y: position.y + box.h, h: -box.h }
          : { y: position.y, h: box.h }),
      });
    }
  }
}

class PanSystem extends System {
  constructor(
    public canvas: HTMLCanvasElement,
    public ctx: CanvasRenderingContext2D
  ) {
    super();
  }
  componentsRequired = new Set([Pannable]);
  update(entities: Set<Entity>, event) {
    if (entities.size !== 1) {
      console.warn("exited pan due to multiple pannable elements");
      return;
    }

    const [entity] = [...entities];
    const comps = this.ecs.getComponents(entity);
    const pan = comps.get(Pannable);
    const transform = this.ecs.getComponents(TRANSFORM).get(Transform);
    const currentMatrix = transform.matrix;

    currentMatrix.e = pan.x + event.dx;
    currentMatrix.f = pan.y + event.dy;

    if (event.type === "dragend") {
      pan.x = currentMatrix.e;
      pan.y = currentMatrix.f;

      this.ecs.removeSystem(this);
    }
  }
}

class SelectionSystem extends System {
  componentsRequired = new Set([Selectable]);
  update(entities: Set<Entity>, event) {
    if (!entities.has(event.entity)) {
      return;
    }

    const { entity } = event;
    const comps = this.ecs.getComponents(entity);
    const selected = comps.has(Selected);

    if (selected) {
      this.ecs.removeComponent(entity, Selected);
    } else {
      this.ecs.addComponent(entity, new Selected());
    }
  }
}

class SelectionByAreaSystem extends System {
  componentsRequired = new Set([Selectable, Positionable, BoundingBoxable]);

  private toLocalCoords = (pos: Position, m: DOMMatrix): Position => {
    return new DOMPoint(pos.x, pos.y).matrixTransform(m);
  };

  private entityHitTest(
    entities: Iterable<Entity>,
    point: Position,
    dims: { w: number; h: number } = { w: 0, h: 0 }
  ): Entity[] {
    const { x, y } = point;
    const { w, h } = dims;

    const results: Entity[] = [];
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      if (
        x + w < position.x ||
        x > position.x + box.w ||
        y + h < position.y ||
        y > position.y + box.h
      ) {
        continue;
      }

      results.push(entity);
    }

    return results;
  }

  update(entities: Set<Entity>, event) {
    const { x, y, w, h } = event;

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const selected = comps.get(Selected);
      if (selected) {
        this.ecs.removeComponent(entity, Selected);
      }
    }

    const mouseToCanvas = this.ecs
      .getComponents(TRANSFORM)
      .get(Transform)
      .matrix.inverse();
    const hits = this.entityHitTest(
      entities,
      this.toLocalCoords({ x, y }, mouseToCanvas),
      { w, h }
    );

    for (const entity of hits) {
      this.ecs.addComponent(entity, new Selected());
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
    ctx.resetTransform();
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
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
  constructor(
    public canvas: HTMLCanvasElement,
    public ctx: CanvasRenderingContext2D
  ) {
    super();
  }

  componentsRequired = new Set([Pannable]);
  update(entities: Set<Entity>) {
    const matrix = this.ecs.getComponents(TRANSFORM).get(Transform).matrix;

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const pan = comps.get(Pannable);

      ctx.save();
      ctx.resetTransform();
      this.ctx.fillText(`Pan: ${pan.x},${pan.y}`, 5, 12);
      this.ctx.fillText(`Zoom: ${matrix.a},${matrix.d}`, 5, 24);

      ctx.restore();

      break;
    }
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
    Drawable,
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
    SelectionDragBox,
  ]);

  update(entities: Set<Entity>) {
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

ecs.addSystem(new KayboardInputSystem(), ["keyboard"]);
ecs.addSystem(new MouseStartSystem(canvas, ctx), ["click", "dragstart"]);
ecs.addSystem(new MouseScrollSystem(), ["wheel"]);
ecs.addSystem(new DoubleClickHandlerSystem(canvas), ["doubleClick"]);

ecs.addSystem(new ZoomSystem(canvas, ctx), ["zoom"]);

ecs.addSystem(new SelectionByAreaSystem(), ["selectArea"]);
ecs.addSystem(new SelectionSystem(), ["selectEntity"]);

ecs.addSystem(new MovementSystem(), ["frame"]);

ecs.addSystem(new RenderSystem(ctx), "frame");
ecs.addSystem(new RenderDragSystem(ctx), "frame");
ecs.addSystem(new RenderDebugSystem(canvas, ctx), "frame");
ecs.addSystem(new RenderDragSelectionSystem(ctx), "frame");

const go = () => {
  const obs = createInputEventObservable(canvas);
  const rect = canvas.getBoundingClientRect();

  ecs.update({ type: "init" });
  obs.subscribe((ev) => {
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
