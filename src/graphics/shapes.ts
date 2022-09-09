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
type ColumnShape = {
  type: "column";
  bucket: { key: string; itemIndices: number[] };
  itemWidth: number;
  itemHeight: number;
  x: number;
  y: number;
  width: number;
};
type RectShape = { type: "rect"; x: number; y: number; w: number; h: number };
type TextShape = { type: "text"; text: string; x: number; y: number };
type GroupContainer = { type: "group"; transforms: [] };
type HighLevelShape = LowLevelShape | GroupContainer | ColumnShape;
type NodeReference = { nodeReference?: number };
type LowLevelShape = (RectShape | TextShape) & NodeReference;

type PictographOptions = {
  buckets: { key: string; itemIndices: number[] }[];
  itemWidth: number;
  itemHeight: number;
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
  const { buckets, itemHeight, itemWidth, width } = o;
  const columnWidth = 500 / buckets.length;
  const axes: HighLevelShape[] = [
    { type: "rect", x: o.x, y: o.y - 6, w: width, h: 2 },
  ];

  return buckets
    .flatMap<HighLevelShape>((bucket, i) => [
      {
        type: "column",
        x: o.x + i * columnWidth,
        y: o.y,
        width: 100,
        itemHeight,
        itemWidth,
        bucket,
      },
      { type: "rect", x: o.x + i * columnWidth - 6, y: o.y, w: 2, h: 200 },
      { type: "text", x: o.x + i * columnWidth, y: o.y - 14, text: bucket.key },
    ])
    .concat(axes);
};

export const compileColumn = (o: ColumnShape): HighLevelShape[] => {
  const { bucket, width, itemHeight, itemWidth } = o;

  const itemsPerRow = (width / (itemWidth + 2)) | 0;

  const result: HighLevelShape[] = [];
  const getRowColumn = (index: number) => [
    index % itemsPerRow,
    (index / itemsPerRow) | 0,
  ];

  for (let i = 0; i < bucket.itemIndices.length; i++) {
    const [r, c] = getRowColumn(i);

    result.push({
      type: "rect",
      x: o.x + r * (itemWidth + 2),
      y: o.y + c * (itemWidth + 2),
      w: itemWidth,
      h: itemHeight,
      nodeReference: bucket.itemIndices[i],
    });
  }

  return result;
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
      case "text":
      case "rect":
      default: {
        throw new Error(`shape ${shape.type} not recognized`);
      }
    }
  }

  return result;
};

export const addShapeToECS = (
  shapes: LowLevelShape[],
  ecs: ECS,
  entitiesWithLayout: Set<Entity>
): void => {
  const lookup: number[] = [];
  for (const entity of entitiesWithLayout) {
    const existing = ecs.getComponents(entity).get(Layouted);
    if (existing.nodeReference === undefined) {
      continue;
    }
    lookup[existing.nodeReference] = entity;
  }

  for (const shape of shapes) {
    const existingEntity = lookup[shape.nodeReference ?? -1];

    let entity;
    let existingPosition;

    if (existingEntity !== undefined) {
      entity = existingEntity;
      existingPosition = ecs.getComponents(entity).get(Positionable);
    } else {
      entity = ecs.addEntity();
      ecs.addComponent(entity, new Layouted(shape.nodeReference));
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
        ecs.addComponent(entity, new Drawable(shape));
        ecs.addComponent(entity, new Clickable());
        ecs.addComponent(entity, new Selectable());
        break;
      }

      case "text": {
        ecs.addComponent(entity, new Positionable(shape.x, shape.y, 1));
        ecs.addComponent(entity, new Drawable(shape));
        break;
      }
    }
  }
};

// the real render system (new system) will call this
export const drawShapeToCanvas = (
  position: Positionable,
  shape: LowLevelShape,
  ctx: CanvasRenderingContext2D
): void => {
  switch (shape.type) {
    case "rect": {
      ctx.fillRect(position.x, position.y, shape.w, shape.h);
      break;
    }
    case "text": {
      ctx.font = "12px Arial";
      ctx.fillText(shape.text, shape.x, shape.y);
      console.log("fill text");
      break;
    }
    default: {
      throw new Error("shape not implemented " + shape.type);
    }
  }
};
