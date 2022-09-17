import { PanZoomable, Transform } from "../components";
import { TRANSFORM_ELEMENT } from "../constants";
import { System, Entity } from "../ECS";

export class PanSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }
  componentsRequired = new Set([PanZoomable]);
  update(entities: Set<Entity>, event) {
    if (entities.size !== 1) {
      console.warn("exited pan due to multiple pannable elements");
      return;
    }

    const [entity] = entities;
    const comps = this.ecs.getComponents(entity);
    const pan = comps.get(PanZoomable);
    const transform = this.ecs.getComponents(TRANSFORM_ELEMENT).get(Transform);
    const currentMatrix = transform.matrix;

    currentMatrix.e = pan.x + event.dx;
    currentMatrix.f = pan.y + event.dy;

    if (event.type === "dragend") {
      pan.x = currentMatrix.e;
      pan.y = currentMatrix.f;

      this.ecs.removeSystem(this);
    }
  }
}
