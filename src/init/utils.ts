import { ECS } from "./../ECS";
import {
  Clickable,
  Positionable,
  Velocityable,
  BoundingBoxable,
  Drawable,
  Selectable,
  Transform,
  Pannable,
  Zoomable,
  Scrollable,
} from "../components/index";

export const createRect = (
  ecs: ECS,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const clickable = new Clickable();
  const position = new Positionable(x, y, 1);
  const velocity = new Velocityable(0, 0);
  const box = new BoundingBoxable(w, h);
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

export const createBackground = (ecs: ECS) => {
  const pan = new Pannable(0, 0);
  const clickable = new Clickable();
  const zoom = new Zoomable(1);
  const scroll = new Scrollable();

  const background = ecs.addEntity();
  ecs.addComponent(background, pan);
  ecs.addComponent(background, clickable);
  ecs.addComponent(background, zoom);
  ecs.addComponent(background, scroll);
};
