import { BoundingBoxable, Drawable, Positionable } from "./../components/index";
import { ECS } from "./../ECS";

// type BaseShape = { type: string };
type ColumnShape = { type: "column"; x: number; y: number; width: number };
type RectShape = { type: "rect"; x: number; y: number; w: number; h: number };
type GroupContainer = { type: "group"; transforms: [] };

type HighLevelShape = RectShape | GroupContainer | ColumnShape;

type NodeReference = { nodeReference?: number };
type LowLevelShape = RectShape & NodeReference;

type PictographOptions = {
  buckets: { key: string; itemIds: number[] }[];
  width: number;
  x: number;
  y: number;
};

// thing we're drawing in total - whole viz
// will return columns, axes etc
// we need to break this down into primitives, this is what the compileFunctions are for

// A system specific to building this layout will call this
// will query nodes to get buckets
export const pictograph = (o: PictographOptions): HighLevelShape[] => {
  return [];
};

export const compileColumn = (o: ColumnShape): HighLevelShape[] => {
  return [];
};

// then call this in all the shapes in the pictograph
export const compileShapes = (shapes: HighLevelShape[]): LowLevelShape[] => {
  const result: LowLevelShape[] = [];
  for (const shape of shapes) {
    switch (shape.type) {
      case "column": {
        result.push(...compileShapes(compileColumn(shape)));
        break;
      }
      case "rect": {
        result.push(shape);
        break;
      }
    }
  }

  return result;
};

// called on low-level shapes
export const addShapeToECS = (shapes: LowLevelShape[], ecs: ECS): void => {
  for (const shape of shapes) {
    const entity = ecs.addEntity();
    switch (shape.type) {
      case "rect": {
        ecs.addComponent(entity, new Positionable(shape.x, shape.y, 1));
        ecs.addComponent(entity, new BoundingBoxable(shape.w, shape.h));
        ecs.addComponent(entity, new Drawable(/* shape */));
      }
    }

    // if (shape.nodeReference !== undefined) {
    //   ecs.addComponent(entity, new NodeReference(shape.nodeReference));
    // }
  }
};

// the real render system (new system) will call this
export const drawShapeToCanvas = (
  shape: LowLevelShape,
  ctx: CanvasRenderingContext2D
): void => {
  switch (shape.type) {
    case "rect": {
      ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
      break;
    }
  }
};
