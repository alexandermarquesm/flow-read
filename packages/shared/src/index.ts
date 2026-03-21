export * from "./types/auth";
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const add = (a: number, b: number): number => {
  return a + b;
};

export const LOG_PREFIX = "[MONOREPO]";

export const log = (message: string) => {
  console.log(`${LOG_PREFIX} ${new Date().toISOString()}: ${message}`);
};
