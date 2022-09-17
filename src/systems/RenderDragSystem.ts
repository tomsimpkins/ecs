import {
  Positionable,
  BoundingBoxable,
  Transform,
  Drawable,
  Dragging,
} from "./../components/index";
import { System, Entity } from "../ECS";
import { TRANSFORM_ELEMENT } from "../constants";

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
