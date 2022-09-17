import { Velocityable, Positionable } from "./../components/index";
import { System, Entity } from "../ECS";

export class MovementSystem extends System {
  componentsRequired = new Set([Positionable, Velocityable]);
  update(entities: Set<Entity>) {
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const velocity = comps.get(Velocityable);

      position.x += velocity.vx;
      position.y += velocity.vy;
    }
  }
}
