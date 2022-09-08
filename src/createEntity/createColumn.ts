import { RECT_WIDTH, COLUMN_PADDING } from "./../constants";
import {
  Positionable,
  BoundingBoxable,
  Drawable,
  Transparent,
  Nameable,
} from "./../components/index";
import { ECS } from "../ECS";
import { createRect } from "../init/utils";
import { positionColumnNode } from "./positionColumnNode";

export const createColumn = (
  ecs: ECS,
  position: {
    x: number;
    y: number;
  },
  dimension: {
    width: number;
    height: number;
  },
  name: string,
  contents: number[]
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

  const itemsPerRow = Math.floor(
    dimension.width / (RECT_WIDTH + COLUMN_PADDING)
  );

  // TODO: separate node pos in column from node absolute position
  contents.forEach((_node, index) => {
    // TODO: start by giving pictograph an x, y as an absolute
    // this will be used as the basis
    // pictograph will know from x, y, height, width, what to do
    // pictograph has bucket information too
    const { x, y } = positionColumnNode(
      index,
      itemsPerRow,
      position.x,
      position.y
    );

    createRect(ecs, x, y);
  });

  // TODO: contents (nodes? rectangles?) - this logic should be handled elsewhere
  // TODO: higher-level building of columns

  // handling moving a node into a column
  // handling moving a node outside of columns
};
