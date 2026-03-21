export * from "./types/auth";
export const formatDate = (date) => {
    return date.toISOString().split("T")[0];
};
export const add = (a, b) => {
    return a + b;
};
export const LOG_PREFIX = "[MONOREPO]";
export const log = (message) => {
    console.log(`${LOG_PREFIX} ${new Date().toISOString()}: ${message}`);
};
