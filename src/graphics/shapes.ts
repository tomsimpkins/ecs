import {
  Animated,
  BoundingBoxable,
  Clickable,
  Drawable,
  Layouted,
  Positionable,
  Selectable,
} from "./../components";
import { ECS, Entity } from "./../ECS";

// type BaseShape = { type: string };
type ColumnShape = { type: "column"; x: number; y: number; width: number };
type RectShape = { type: "rect"; x: number; y: number; w: number; h: number };
type GroupContainer = { type: "group"; transforms: [] };

type HighLevelShape = LowLevelShape | GroupContainer | ColumnShape;

type NodeReference = { nodeReference?: number };
type LowLevelShape = RectShape & NodeReference;

type PictographOptions = {
  buckets: { key: string; itemIndices: number[] }[];
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

export const row = (): HighLevelShape[] => {
  const res: HighLevelShape[] = [];
  for (let i = 0; i < 10; i++) {
    res.push({
      type: "rect",
      x: 200 + i * 22,
      y: 200,
      w: 20,
      h: 20,
      nodeReference: i,
    });
  }

  return res;
};

export const column = (): HighLevelShape[] => {
  const res: HighLevelShape[] = [];
  for (let i = 0; i < 10; i++) {
    res.push({
      type: "rect",
      x: 200,
      y: 200 + i * 22,
      w: 20,
      h: 20,
      nodeReference: i,
    });
  }

  return res;
};

export const icicle = (): HighLevelShape[] => {
  const shuffle = <T>(els: T[]): T[] => {
    const res: T[] = [];

    for (let i = 0; i < els.length; i++) {
      const j = (Math.random() * (els.length - i)) | 0;
      res[i] = els[j];

      els[j] = els[els.length - i - 1];
    }

    return res;
  };

  const result: HighLevelShape[] = [];
  const maxChildren = 10;
  const queue = [{ depth: 0, y: 200, x: 200, w: 800 }]; // queue so the traversal is breadth first
  const h = 20;
  const [yGap, xGap] = [4, 2];

  while (queue.length && result.length < 100) {
    const { depth, x, y, w } = queue.shift()!;

    result.push({
      type: "rect",
      x: x,
      y: y,
      w: w,
      h: h,
      nodeReference: result.length,
    });

    const childrenCount = (Math.random() * maxChildren) | 0;
    const widthPerChild = (w - (childrenCount - 1) * xGap) / childrenCount;

    const nextElements = [];
    for (let i = 0; i < childrenCount; i++) {
      nextElements.push({
        depth: depth + 1,
        y: y + h + yGap,
        x: x + i * (widthPerChild + xGap),
        w: Math.max(widthPerChild, 0),
      });
    }

    queue.push(...shuffle(nextElements));
  }

  return result;
};

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

<<<<<<< HEAD
// called on low-level shapes
export const addShapeToECS = (shapes: LowLevelShape[], ecs: ECS): void => {
=======
export const addShapeToECS = (
  shapes: LowLevelShape[],
  ecs: ECS,
  existingNodeReferences: Set<Entity>
): void => {
  const lookup = [];
  for (const entity of existingNodeReferences) {
    const existing = ecs.getComponents(entity).get(Layouted);
    lookup[existing.ref] = entity;
  }

>>>>>>> origin/master
  for (const shape of shapes) {
    const existingEntity = lookup[shape.nodeReference!];
    let entity;
    let existingPosition;

    if (existingEntity !== undefined) {
      entity = existingEntity;
      existingPosition = ecs.getComponents(entity).get(Positionable);
    } else {
      entity = ecs.addEntity();
      ecs.addComponent(entity, new Layouted(shape.nodeReference!));
    }

    switch (shape.type) {
      case "rect": {
        if (existingPosition) {
          ecs.addComponent(
            entity,
            new Animated(
              existingPosition.x,
              existingPosition.y,
              Date.now(),
              shape.x,
              shape.y,
              Date.now() + 500
            )
          );
        } else {
          ecs.addComponent(entity, new Positionable(shape.x, shape.y, 1));
        }

        ecs.addComponent(entity, new BoundingBoxable(shape.w, shape.h));
        ecs.addComponent(entity, new Drawable(/* shape */));
        ecs.addComponent(entity, new Clickable());
        ecs.addComponent(entity, new Selectable());
      }
    }
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
