import {
  SelectionDragBox,
  Positionable,
  BoundingBoxable,
  Transform,
} from "../components";
import { TRANSFORM_ELEMENT } from "../constants";
import { System, Entity } from "../ECS";

export class DragSelectionSystem extends System {
  componentsRequired = new Set([
    SelectionDragBox,
    Positionable,
    BoundingBoxable,
  ]);
  update(entities: Set<Entity>, event) {
    if (entities.size !== 1) {
      console.warn(
        "exited drag selection due to multiple drag selection elements"
      );
      return;
    }

    const [entity] = entities;

    const comps = this.ecs.getComponents(entity);
    const box = comps.get(BoundingBoxable);
    const position = comps.get(Positionable);
    const transform = this.ecs
      .getComponents(TRANSFORM_ELEMENT)
      .get(Transform)
      .matrix.inverse();

    box.w = event.dx * transform.a;
    box.h = event.dy * transform.d;

    if (event.type === "dragend") {
      this.ecs.removeComponent(entity, SelectionDragBox);
      this.ecs.removeEntity(entity);

      this.ecs.removeSystem(this);

      const selectAreaEvent = {
        type: "selectArea",
        ...(box.w < 0
          ? { x: position.x + box.w, w: -box.w }
          : { x: position.x, w: box.w }),
        ...(box.h < 0
          ? { y: position.y + box.h, h: -box.h }
          : { y: position.y, h: box.h }),
      };

      this.ecs.enqueueEvent(selectAreaEvent);
    }
  }
}
