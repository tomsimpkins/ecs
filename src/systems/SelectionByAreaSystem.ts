import {
  Selected,
  Positionable,
  BoundingBoxable,
  Selectable,
} from "./../components/index";
import { System, Entity } from "../ECS";
import { Position } from "./index";

export class SelectionByAreaSystem extends System {
  componentsRequired = new Set([Selectable, Positionable, BoundingBoxable]);

  private entityHitTest(
    entities: Iterable<Entity>,
    point: Position,
    dims: { w: number; h: number } = { w: 0, h: 0 }
  ): Entity[] {
    const { x, y } = point;
    const { w, h } = dims;

    const results: Entity[] = [];
    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const position = comps.get(Positionable);
      const box = comps.get(BoundingBoxable);

      if (
        x + w < position.x ||
        x > position.x + box.w ||
        y + h < position.y ||
        y > position.y + box.h
      ) {
        continue;
      }

      results.push(entity);
    }

    return results;
  }

  update(entities: Set<Entity>, event) {
    const { x, y, w, h } = event;
    console.log("select area", { x, y });

    for (const entity of entities) {
      const comps = this.ecs.getComponents(entity);
      const selected = comps.get(Selected);
      if (selected) {
        this.ecs.removeComponent(entity, Selected);
      }
    }

    const hits = this.entityHitTest(entities, { x, y }, { w, h });

    for (const entity of hits) {
      this.ecs.addComponent(entity, new Selected());
    }
  }
}
