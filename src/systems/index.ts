import { groupByBuckets } from "./../dataLayer/dataQuery";
import {
  addShapeToECS,
  compileShapes,
  drawShapeToCanvas,
  pictograph,
} from "./../graphics/shapes";
import { createRect } from "./../init/utils";
import {
  Selected,
  Velocityable,
  Positionable,
  Clickable,
  BoundingBoxable,
  Transform,
  SelectionDragBox,
  Selectable,
  Drawable,
  Dragging,
  Scrollable,
  PanZoomable,
} from "./../components/index";
import { System, Entity } from "../ECS";
import { TRANSFORM_ELEMENT } from "../constants";
export * from "./KeyboardInputSystem";
import { PanSystem } from "./PanSystem";
export { PanSystem };
export * from "./ZoomSystem";
export * from "./SelectionSystem";
export * from "./AnimationSystem";
export * from "./LayoutSystem";

export class DoubleClickHandlerSystem extends System {
  constructor() {
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
  constructor(public ctx: CanvasRenderingContext2D) {
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
        console.log(entity);

        if (entity !== undefined) {
          this.ecs.enqueueEvent({ type: "selectEntity", entity });
        }
        break;
      }
      case "dragstart": {
        const pos = this.toLocalCoords(event, transformMatrix);
        const entity = this.maxByZ(this.entityHitTest(entities, pos));

        if (entity === undefined && event.button === 0) {
          this.ecs.addSystem(new DragSelectionSystem(), [
            "dragmove",
            "dragend",
          ]);

          const dragEl = this.ecs.addEntity();
          this.ecs.addComponent(dragEl, new Positionable(pos.x, pos.y, 2));
          this.ecs.addComponent(dragEl, new BoundingBoxable(0, 0));
          this.ecs.addComponent(dragEl, new SelectionDragBox());
        } else if (entity === undefined) {
          this.ecs.addSystem(new PanSystem(this.ctx), ["dragmove", "dragend"]);
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
      this.ecs.enqueueEvent({
        type: "zoom",
        d: event.d,
        x: event.x,
        y: event.y,
      });
      break;
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

export class DragSelectionSystem extends System {
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

    const [entity] = entities;

    const comps = this.ecs.getComponents(entity);
    const box = comps.get(BoundingBoxable);
    const position = comps.get(Positionable);
    const transform = this.ecs
      .getComponents(TRANSFORM_ELEMENT)
      .get(Transform)
      .matrix.inverse();

    box.w = event.dx * transform.a;
    box.h = event.dy * transform.d;

    if (event.type === "dragend") {
      this.ecs.removeComponent(entity, SelectionDragBox);
      this.ecs.removeEntity(entity);

      this.ecs.removeSystem(this);

      const selectAreaEvent = {
        type: "selectArea",
        ...(box.w < 0
          ? { x: position.x + box.w, w: -box.w }
          : { x: position.x, w: box.w }),
        ...(box.h < 0
          ? { y: position.y + box.h, h: -box.h }
          : { y: position.y, h: box.h }),
      };

      this.ecs.enqueueEvent(selectAreaEvent);
    }
  }
}

export class SelectionByAreaSystem extends System {
  componentsRequired = new Set([Selectable, Positionable, BoundingBoxable]);

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
    console.log("select area", { x, y });

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const selected = comps.get(Selected);
      if (selected) {
        this.ecs.removeComponent(entity, Selected);
      }
    }

    const hits = this.entityHitTest(entities, { x, y }, { w, h });

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

export class RenderLayoutSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([Positionable, Drawable]);
  update(entities: Set<Entity>) {
    // clear the canvas
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.restore();

    // draw page
    this.ctx.save();
    this.ctx.resetTransform();
    this.ctx.strokeRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.globalAlpha = 0.1;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.globalAlpha = 1;
    this.ctx.restore();

    // set transform
    this.ctx.save();
    this.ctx.setTransform(
      this.ecs.getComponents(TRANSFORM_ELEMENT).get(Transform).matrix
    );

    // draw entities
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const drawable = comps.get(Drawable);
      if (!drawable.shape) {
        continue;
      }

      const position = comps.get(Positionable);

      drawShapeToCanvas(position, drawable.shape, this.ctx);
    }
    this.ctx.restore();
    return;
  }
}

export class RenderSelectionSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }
  componentsRequired = new Set([Selected, Positionable, BoundingBoxable]);
  update(entities: Set<Entity>) {
    this.ctx.save();
    this.ctx.setTransform(
      this.ecs.getComponents(TRANSFORM_ELEMENT).get(Transform).matrix
    );

    const totalBoundingBox = {
      x0: Infinity,
      y0: Infinity,
      x1: -Infinity,
      y1: -Infinity,
    };

    this.ctx.fillStyle = "red";
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      this.ctx.fillRect(position.x, position.y, box.w, box.h);

      totalBoundingBox.x0 = Math.min(totalBoundingBox.x0, position.x);
      totalBoundingBox.x1 = Math.max(totalBoundingBox.x1, position.x + box.w);
      totalBoundingBox.y0 = Math.min(totalBoundingBox.y0, position.y);
      totalBoundingBox.y1 = Math.max(totalBoundingBox.y1, position.y + box.h);
    }

    if (Number.isFinite(totalBoundingBox.x0)) {
      this.ctx.setLineDash([2, 2]);
      this.ctx.strokeRect(
        totalBoundingBox.x0 - 3,
        totalBoundingBox.y0 - 3,
        totalBoundingBox.x1 - totalBoundingBox.x0 + 6,
        totalBoundingBox.y1 - totalBoundingBox.y0 + 6
      );
    }

    this.ctx.restore();
  }
}

export class RenderDebugSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  private fps: number = 0;
  private frameCount: number = 0;
  private frameCountStart: number = NaN;
  private tick() {
    const now = Date.now();
    if (isNaN(this.frameCountStart)) {
      this.frameCountStart = Date.now();
    }
    this.frameCount++;

    const dt = now - this.frameCountStart;
    if (dt >= 1000) {
      this.fps = (1000 / dt) * this.frameCount;
      this.frameCount = 0;
      this.frameCountStart = now;
    }
  }

  componentsRequired = new Set([PanZoomable]);
  update(entities: Set<Entity>, event) {
    this.tick();

    const matrix = this.ecs
      .getComponents(TRANSFORM_ELEMENT)
      .get(Transform).matrix;

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const pan = comps.get(PanZoomable);

      this.ctx.save();
      this.ctx.resetTransform();
      this.ctx.fillText(`Pan: ${pan.x},${pan.y}`, 5, 12);
      this.ctx.fillText(`Zoom: ${matrix.a},${matrix.d}`, 5, 24);
      this.ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 5, 36);

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
    if (entities.size !== 1) {
      return;
    }

    const transformMatrix = this.ecs
      .getComponents(TRANSFORM_ELEMENT)
      .get(Transform).matrix;

    this.ctx.save();
    this.ctx.setTransform(transformMatrix);
    this.ctx.globalAlpha = 0.2;

    const [entity] = entities;

    const comps = this.ecs.getComponents(entity);
    const position = comps.get(Positionable);
    const box = comps.get(BoundingBoxable);

    this.ctx.fillRect(position.x, position.y, box.w, box.h);

    this.ctx.restore();
  }
}
