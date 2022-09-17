import { drawShapeToCanvas } from "./../graphics/shapes";
import { createRect } from "./../init/utils";
import {
  Selected,
  Velocityable,
  Positionable,
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
export * from "./MouseStartSystem";
export * from "./DragElementSystem";
export * from "./DragSelectionSystem";
export * from "./MouseScrollSystem";

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
