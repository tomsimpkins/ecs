import { Selectable, Selected } from "../components";
import { System, Entity } from "../ECS";

export class SelectionSystem extends System {
  componentsRequired = new Set([Selectable]);
  update(entities: Set<Entity>, event) {
    if (!entities.has(event.entity)) {
      return;
    }

    const { entity } = event;
    const comps = this.ecs.getComponents(entity);
    const selected = comps.has(Selected);

    if (selected) {
      this.ecs.removeComponent(entity, Selected);
    } else {
      this.ecs.addComponent(entity, new Selected());
    }
  }
}
