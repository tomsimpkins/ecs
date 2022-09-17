import { PanZoomable, Transform } from "../components";
import { TRANSFORM_ELEMENT } from "../constants";
import { System, Entity } from "../ECS";

export class ZoomSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  componentsRequired = new Set([PanZoomable]);
  update(entities: Set<Entity>, event) {
    console.log(event);
    const [entity] = entities;

    const transform = this.ecs.getComponents(TRANSFORM_ELEMENT).get(Transform);
    const { d } = event;
    const scaleFactor = d <= 0 ? 1.2 : 1 / 1.2;

    const matrix = transform.matrix;
    transform.matrix = new DOMMatrix([
      matrix.a * scaleFactor,
      0,
      0,
      matrix.a * scaleFactor,
      event.x - (event.x - matrix.e) * scaleFactor,
      event.y - (event.y - matrix.f) * scaleFactor,
    ]);

    const panZoom = this.ecs.getComponents(entity).get(PanZoomable);
    panZoom.x = transform.matrix.e;
    panZoom.y = transform.matrix.f;
  }
}
