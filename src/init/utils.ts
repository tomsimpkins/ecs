import { ECS } from "./../ECS";
import { Clickable, Scrollable, PanZoomable } from "../components/index";

export const createBackground = (ecs: ECS) => {
  const clickable = new Clickable();
  const scroll = new Scrollable();
  const panZoomable = new PanZoomable(0, 0, 1);

  const background = ecs.addEntity();
  ecs.addComponent(background, clickable);
  ecs.addComponent(background, scroll);
  ecs.addComponent(background, panZoomable);
};
