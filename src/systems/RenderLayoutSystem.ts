import { Positionable, Drawable, Transform } from "../components";
import { TRANSFORM_ELEMENT } from "../constants";
import { System, Entity } from "../ECS";
import { drawShapeToCanvas } from "../graphics/shapes";

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
