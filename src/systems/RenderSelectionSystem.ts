import {
  Selected,
  Positionable,
  BoundingBoxable,
  Transform,
} from "./../components/index";
import { System, Entity } from "../ECS";
import { TRANSFORM_ELEMENT } from "../constants";

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
