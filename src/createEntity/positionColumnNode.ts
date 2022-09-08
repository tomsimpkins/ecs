import { RECT_WIDTH, COLUMN_PADDING, RECT_HEIGHT } from "./../constants";

export const positionColumnNode = (
  index: number,
  itemsPerRow: number,
  colOriginX: number,
  colOriginY: number
) => {
  const xIndex = index % itemsPerRow;
  const yIndex = Math.floor(index / itemsPerRow);

  return {
    x: colOriginX + COLUMN_PADDING + xIndex * (RECT_WIDTH + COLUMN_PADDING),
    y: colOriginY + COLUMN_PADDING + yIndex * (RECT_HEIGHT + COLUMN_PADDING),
  };
};
