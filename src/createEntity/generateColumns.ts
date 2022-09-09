import {
  COLUMN_MARGIN_BOTTOM,
  COLUMN_MARGIN_RIGHT,
  COLUMN_PADDING,
} from "./../constants";
import { COLUMNS_PER_ROW, COLUMN_HEIGHT, COLUMN_WIDTH } from "../constants";
import { bucket } from "../dataLayer/dataQuery";
import { ECS } from "../ECS";
import { createColumn } from "./createColumn";

export const generateColumns = (ecs: ECS, bucketGroups: bucket[]) => {
  bucketGroups.forEach((bucket, index) => {
    createColumn(
      ecs,
      setColumnOrigin(index),
      { height: COLUMN_HEIGHT, width: COLUMN_WIDTH },
      bucket.bucketKey,
      bucket.itemIndices
    );
  });
};

const setColumnOrigin = (index: number) => {
  const xIndex = index % COLUMNS_PER_ROW;
  const yIndex = Math.floor(index / COLUMNS_PER_ROW);

  return {
    x: xIndex * (COLUMN_WIDTH + COLUMN_MARGIN_RIGHT),
    y: yIndex * (COLUMN_HEIGHT + COLUMN_MARGIN_BOTTOM),
  };
};
