import { DragElementSystem } from "./DragElementSystem";
import { DragSelectionSystem } from "./DragSelectionSystem";
import {
  Positionable,
  BoundingBoxable,
  Clickable,
  Transform,
  SelectionDragBox,
  Dragging,
} from "../components";
import { TRANSFORM_ELEMENT } from "../constants";
import { System, Entity } from "../ECS";
import { PanSystem } from "./PanSystem";

type Position = { x: number; y: number };
export class MouseStartSystem extends System {
  constructor(public ctx: CanvasRenderingContext2D) {
    super();
  }

  private toLocalCoords = (pos: Position, m: DOMMatrix): Position => {
    return new DOMPoint(pos.x, pos.y).matrixTransform(m);
  };

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

  private maxByZ = (entities: Entity[]): Entity | undefined => {
    if (entities.length === 0) {
      return undefined;
    }

    return entities
      .map<[number, Entity]>((entity) => [
        this.ecs.getComponents(entity).get(Positionable).z,
        entity,
      ])
      .reduce((acc, item) => (item[0] > acc[0] ? item : acc))[1];
  };

  componentsRequired = new Set([Clickable, Positionable, BoundingBoxable]);
  update(entities: Set<Entity>, event) {
    const transformMatrix = this.ecs
      .getComponents(TRANSFORM_ELEMENT)
      .get(Transform)
      .matrix.inverse();

    switch (event.type) {
      case "click": {
        const pos = this.toLocalCoords(event, transformMatrix);
        const entity = this.maxByZ(this.entityHitTest(entities, pos));
        console.log(entity);

        if (entity !== undefined) {
          this.ecs.enqueueEvent({ type: "selectEntity", entity });
        }
        break;
      }
      case "dragstart": {
        const pos = this.toLocalCoords(event, transformMatrix);
        const entity = this.maxByZ(this.entityHitTest(entities, pos));

        if (entity === undefined && event.button === 0) {
          this.ecs.addSystem(new DragSelectionSystem(), [
            "dragmove",
            "dragend",
          ]);

          const dragEl = this.ecs.addEntity();
          this.ecs.addComponent(dragEl, new Positionable(pos.x, pos.y, 2));
          this.ecs.addComponent(dragEl, new BoundingBoxable(0, 0));
          this.ecs.addComponent(dragEl, new SelectionDragBox());
        } else if (entity === undefined) {
          this.ecs.addSystem(new PanSystem(this.ctx), ["dragmove", "dragend"]);
        } else {
          const dragEl = this.ecs.addEntity();
          const positionable = this.ecs.getComponents(entity).get(Positionable);

          this.ecs.addComponent(entity, new Dragging(dragEl));
          this.ecs.addComponent(
            dragEl,
            new Positionable(positionable.x, positionable.y, 2)
          );
          this.ecs.addSystem(new DragElementSystem(this.ctx), [
            "dragmove",
            "dragend",
          ]);
        }

        break;
      }
    }
  }
}
