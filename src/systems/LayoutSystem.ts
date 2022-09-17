import { Layouted } from "../components";
import { groupByBuckets } from "../dataLayer/dataQuery";
import { System, Entity } from "../ECS";
import { addShapeToECS, compileShapes, pictograph } from "../graphics/shapes";

export class LayoutSystem extends System {
  componentsRequired = new Set([Layouted]);
  update(entities: Set<Entity>, event) {
    const ecs = this.ecs;
    const entitiesToRetain: Set<Entity> = new Set();
    for (const entity of entities) {
      const layout = ecs.getComponents(entity).get(Layouted);
      if (layout.nodeReference !== undefined) {
        entitiesToRetain.add(entity);
      } else {
        ecs.removeEntity(entity);
      }
    }

    addShapeToECS(
      compileShapes(
        pictograph({
          itemHeight: 10,
          itemWidth: 10,
          x: 10,
          y: 800,
          width: 1800,
          buckets: groupByBuckets(event.groupBy),
        })
      ),
      this.ecs,
      entitiesToRetain
    );
  }
}
