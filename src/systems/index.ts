import { createRect } from "./../init/utils";
import {
  Zoomable,
  Selected,
  Velocityable,
  Positionable,
  Clickable,
  BoundingBoxable,
  Transform,
  SelectionDragBox,
  Pannable,
  Selectable,
  Drawable,
  Dragging,
  Scrollable,
  Transparent,
  Nameable,
} from "./../components/index";
import { System, Entity } from "../ECS";
import { TRANSFORM_ELEMENT } from "../constants";

export class KeyboardInputSystem extends System {
  componentsRequired = new Set([Selected, Velocityable]); // you only move things which are selected and moveable

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

export class DoubleClickHandlerSystem extends System {
  constructor(public canvas: HTMLCanvasElement) {
    super();
  }

  private toLocalCoords = (pos: Position, m: DOMMatrix): Position => {
    return new DOMPoint(pos.x, pos.y).matrixTransform(m);
  };

  componentsRequired = new Set([Positionable]);
  update(entities: Set<Entity>, event) {
    const transform = this.ecs
      .getComponents(TRANSFORM_ELEMENT)
      .get(Transform)
      .matrix.inverse();

    const { x, y } = this.toLocalCoords(event, transform);

    createRect(this.ecs, x, y);
  }
}

type Position = { x: number; y: number };
export class MouseStartSystem extends System {
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
      .getComponents(TRANSFORM_ELEMENT)
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
          this.ecs.addSystem(new PanSystem(this.canvas, this.ctx), [
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
          this.ecs.addSystem(new DragElementSystem(this.ctx), [
            "dragmove",
            "dragend",
          ]);
        }

        break;
      }
    }
  }
}

export class MouseScrollSystem extends System {
  componentsRequired = new Set([Scrollable]);
  update(entities: Set<Entity>, event, context) {
    for (const entity of entities) {
      this.ecs.enqueueEvent({ type: "zoom", d: event.d });
      break;
    }
  }
}

export class ZoomSystem extends System {
  constructor(
    public canvas: HTMLCanvasElement,
    public ctx: CanvasRenderingContext2D
  ) {
    super();
  }

  componentsRequired = new Set([Zoomable]);
  update(entities: Set<Entity>, event) {
    for (const entity of entities) {
      const transform = this.ecs
        .getComponents(TRANSFORM_ELEMENT)
        .get(Transform);
      const { d } = event;
      const scaleFactor = d <= 0 ? 1.2 : 1 / 1.2;

      const matrix = transform.matrix;
      transform.matrix = matrix.scale(scaleFactor, scaleFactor);
    }
  }
}

export class DragElementSystem extends System {
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
          .getComponents(TRANSFORM_ELEMENT)
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
          .getComponents(TRANSFORM_ELEMENT)
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

export class DragSelectionHandlerSystem extends System {
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

export class PanSystem extends System {
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
    const transform = this.ecs.getComponents(TRANSFORM_ELEMENT).get(Transform);
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

export class SelectionSystem extends System {
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

export class SelectionByAreaSystem extends System {
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
      .getComponents(TRANSFORM_ELEMENT)
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

export class MovementSystem extends System {
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

export class RenderSystem extends System {
  constructor(
    public canvas: HTMLCanvasElement,
    public ctx: CanvasRenderingContext2D
  ) {
    super();
  }

  componentsRequired = new Set([Positionable, Drawable, BoundingBoxable]);

  update(entities: Set<Entity>) {
    // draw page
    this.ctx.save();
    this.ctx.resetTransform();
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = 0.1;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = 1;
    this.ctx.restore();

    this.ctx.save();
    this.ctx.setTransform(
      this.ecs.getComponents(TRANSFORM_ELEMENT).get(Transform).matrix
    );

    // draw entities
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      if (comps.has(Transparent)) {
        this.ctx.strokeRect(position.x, position.y, box.w, box.h);
      } else {
        this.ctx.fillStyle = comps.has(Selected) ? "red" : "black";
        this.ctx.fillRect(position.x, position.y, box.w, box.h);
      }

      if (comps.has(Nameable)) {
        const textCoordinates = {
          x: position.x + box.w / 4,
          y: position.y + box.h + 20, // make text appear below box
        };
        this.ctx.font = "12px Arial";
        this.ctx.fillText(
          comps.get(Nameable).name,
          textCoordinates.x,
          textCoordinates.y
        );
      }
    }
    this.ctx.restore();
  }
}

export class RenderDebugSystem extends System {
  constructor(
    public canvas: HTMLCanvasElement,
    public ctx: CanvasRenderingContext2D
  ) {
    super();
  }

  componentsRequired = new Set([Pannable]);
  update(entities: Set<Entity>) {
    const matrix = this.ecs
      .getComponents(TRANSFORM_ELEMENT)
      .get(Transform).matrix;

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const pan = comps.get(Pannable);

      this.ctx.save();
      this.ctx.resetTransform();
      this.ctx.fillText(`Pan: ${pan.x},${pan.y}`, 5, 12);
      this.ctx.fillText(`Zoom: ${matrix.a},${matrix.d}`, 5, 24);

      this.ctx.restore();

      break;
    }
  }
}

export class RenderDragSystem extends System {
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
    this.ctx.save();
    this.ctx.setTransform(
      this.ecs.getComponents(TRANSFORM_ELEMENT).get(Transform).matrix
    );
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const box = comps.get(BoundingBoxable);
      const dragEl = comps.get(Dragging).entityRef;

      const dragPosition = this.ecs.getComponents(dragEl).get(Positionable);
      this.ctx.globalAlpha = 0.2;
      this.ctx.fillRect(dragPosition.x, dragPosition.y, box.w, box.h);
      this.ctx.globalAlpha = 1;
    }
    this.ctx.restore();
  }
}

export class RenderDragSelectionSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([
    Positionable,
    BoundingBoxable,
    SelectionDragBox,
  ]);

  update(entities: Set<Entity>) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.2;
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      this.ctx.fillRect(position.x, position.y, box.w, box.h);
    }
    this.ctx.restore();
  }
}
