import { createRect } from "./../init/utils";
import { Positionable, Transform } from "./../components/index";
import { System, Entity } from "../ECS";
import { TRANSFORM_ELEMENT } from "../constants";
import { Position } from "./index";

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
