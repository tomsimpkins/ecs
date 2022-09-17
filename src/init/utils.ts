import { RECT_HEIGHT, RECT_WIDTH } from "./../constants";
import { ECS } from "./../ECS";
import {
  Clickable,
  Positionable,
  Velocityable,
  BoundingBoxable,
  Drawable,
  Selectable,
  Scrollable,
  PanZoomable,
} from "../components/index";

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

export const createBackground = (ecs: ECS) => {
  const clickable = new Clickable();
  const scroll = new Scrollable();
  const panZoomable = new PanZoomable(0, 0, 1);

  const background = ecs.addEntity();
  ecs.addComponent(background, clickable);
  ecs.addComponent(background, scroll);
  ecs.addComponent(background, panZoomable);
};
