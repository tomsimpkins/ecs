import { Selected, Velocityable } from "../components";
import { System, Entity } from "../ECS";

export class KeyboardInputSystem extends System {
  componentsRequired = new Set([Selected, Velocityable]); // you only move things which are selected and moveable

  update(entities: Set<Entity>, event) {
    const keys = event.keys;

    let vy: number | undefined;
    if (keys.has("ArrowUp")) {
      vy = -1;
    } else if (keys.has("ArrowDown")) {
      vy = 1;
    }

    let vx: number | undefined;
    if (keys.has("ArrowRight")) {
      vx = 1;
    } else if (keys.has("ArrowLeft")) {
      vx = -1;
    }

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);

      const velocity = comps.get(Velocityable);
      if (vx === undefined) {
        velocity.vx = 0;
      } else {
        velocity.vx += vx;
      }
      if (vy === undefined) {
        velocity.vy = 0;
      } else {
        velocity.vy += vy;
      }
    }
  }
}
