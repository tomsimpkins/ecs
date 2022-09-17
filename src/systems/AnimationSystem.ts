import { Animated, Positionable } from "../components";
import { System, Entity } from "../ECS";

export class AnimationSystem extends System {
  componentsRequired = new Set([Animated, Positionable]);
  update(entities: Set<Entity>) {
    const t = Date.now();

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const animation = comps.get(Animated);
      const position = comps.get(Positionable);

      const { fromT, fromX, fromY, toT, toX, toY } = animation;
      if (t >= toT) {
        position.x = toX;
        position.y = toY;

        this.ecs.removeComponent(entity, Animated);
        continue;
      }

      const proportionDone = (t - fromT) / (toT - fromT);
      position.x = fromX + proportionDone * (toX - fromX);
      position.y = fromY + proportionDone * (toY - fromY);
    }
  }
}
