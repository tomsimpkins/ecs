import {
  Positionable,
  BoundingBoxable,
  Transform,
  SelectionDragBox,
} from "./../components/index";
import { System, Entity } from "../ECS";
import { TRANSFORM_ELEMENT } from "../constants";

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
