import mockdata from "./mockdata.json";

const keyIndicesMap = new Map([
  ["id", 0],
  ["fullname", 1],
  ["role", 2],
  ["gender", 3],
  ["area", 4],
  ["department", 5],
  ["grade", 6],
]);

export type bucket = {
  bucketKey: string;
  itemIndices: number[];
};

export const filterByPropertyKey = (key: string) => {
  const index = keyIndicesMap.get(key)!;

  return mockdata.columns[index];
};

export const getBucketCountsFromProperty = (values: any[]) => {
  const countMap = new Map<any, number>();
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (countMap.has(value)) {
      countMap.set(value, countMap.get(value)! + 1);
    } else {
      countMap.set(value, 1);
    }
  }

  return countMap;
};

export const groupByBuckets = (key: string): bucket[] => {
  const singledColumn = filterByPropertyKey(key);

  const bucketsMap = new Map<any, number[]>();
  const bucketKeys = [];
  for (let i = 0; i < singledColumn.length; i++) {
    const value = singledColumn[i];
    if (bucketsMap.has(value)) {
      bucketsMap.set(value, bucketsMap.get(value)!.concat(i));
    } else {
      bucketsMap.set(value, [i]);
      bucketKeys.push(value);
    }
  }

  const groupedBuckets: bucket[] = bucketKeys.map((b) => ({
    bucketKey: `${b}`,
    itemIndices: bucketsMap.get(b)!,
  }));

  return groupedBuckets;
};

export const parseIndicesToValues = (indices: number[], valueKey: string) => {
  const singledColumn = filterByPropertyKey(valueKey);

  const returnVals = [];

  for (const index of indices) {
    returnVals.push(singledColumn[index]);
  }

  return returnVals;
};
