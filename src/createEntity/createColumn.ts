import {
  Positionable,
  BoundingBoxable,
  Drawable,
  Transparent,
  Nameable,
} from "./../components/index";
import { ECS } from "../ECS";

export const createColumn = (
  ecs: ECS,
  position: {
    x: number;
    y: number;
  },
  dimension: {
    height: number;
    width: number;
  },
  name: string
) => {
  const colPosition = new Positionable(position.x, position.y, 0);
  const box = new BoundingBoxable(dimension.width, dimension.height);
  const draw = new Drawable();
  const transparent = new Transparent();
  const nameable = new Nameable(name);

  const column = ecs.addEntity();

  ecs.addComponent(column, colPosition);
  ecs.addComponent(column, box);
  ecs.addComponent(column, draw);
  ecs.addComponent(column, transparent);
  ecs.addComponent(column, nameable);
};
