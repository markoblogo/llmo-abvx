export function debugLog(message: string, data?: any) {
  if (process.env.NODE_ENV !== "production") {
    const prefix = `[DEBUG ${new Date().toISOString()}]`;
    console.log(prefix, message, data || "");
  }
}



