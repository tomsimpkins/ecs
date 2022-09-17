import { Dragging, Positionable, Transform } from "../components";
import { TRANSFORM_ELEMENT } from "../constants";
import { System, Entity } from "../ECS";

export class DragElementSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([Dragging, Positionable]);
  update(entities: Set<Entity>, event) {
    if (event.type === "dragmove") {
      for (const entity of entities) {
        const comps = this.ecs.getComponents(entity);
        const originalPosition = comps.get(Positionable);
        const dragEl = comps.get(Dragging).entityRef;

        const dragPosition = this.ecs.getComponents(dragEl).get(Positionable);

        const mouseToCanvas = this.ecs
          .getComponents(TRANSFORM_ELEMENT)
          .get(Transform)
          .matrix.inverse();

        dragPosition.x = originalPosition.x + mouseToCanvas.a * event.dx;
        dragPosition.y = originalPosition.y + mouseToCanvas.a * event.dy;
      }
    } else if (event.type === "dragend") {
      for (const entity of entities) {
        const comps = this.ecs.getComponents(entity);
        const dragEl = comps.get(Dragging).entityRef;

        const originalPosition = this.ecs
          .getComponents(entity)
          .get(Positionable);

        const mouseToCanvas = this.ecs
          .getComponents(TRANSFORM_ELEMENT)
          .get(Transform)
          .matrix.inverse();

        originalPosition.x += mouseToCanvas.a * event.dx;
        originalPosition.y += mouseToCanvas.a * event.dy;

        this.ecs.removeComponent(entity, Dragging);
        this.ecs.removeEntity(dragEl);
      }

      this.ecs.removeSystem(this);
    }
  }
}
