import {
  BoundingBoxable,
  Clickable,
  Drawable,
  Positionable,
  Selectable,
  Transform,
  Velocityable,
} from "./../components/index";
import { System, Entity, ECS } from "../ECS";
import { RECT_HEIGHT, RECT_WIDTH, TRANSFORM_ELEMENT } from "../constants";
import { Position } from "./index";

export const createRect = (ecs: ECS, x: number, y: number) => {
  const clickable = new Clickable();
  const position = new Positionable(x, y, 1);
  const velocity = new Velocityable(0, 0);
  const box = new BoundingBoxable(RECT_WIDTH, RECT_HEIGHT);
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
