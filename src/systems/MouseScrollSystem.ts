import { Scrollable } from "../components";
import { System, Entity } from "../ECS";

export class MouseScrollSystem extends System {
  componentsRequired = new Set([Scrollable]);
  update(entities: Set<Entity>, event) {
    for (const entity of entities) {
      this.ecs.enqueueEvent({
        type: "zoom",
        d: event.d,
        x: event.x,
        y: event.y,
      });
      break;
    }
  }
}
