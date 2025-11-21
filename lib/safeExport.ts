export function safeMetadataImport<T>(module: T): Record<string, any> {
  if (module && typeof module === "object" && module !== null && "metadata" in module) {
    return { metadata: (module as any).metadata };
  }
  return { metadata: { title: "LLMO Directory", description: "Visible to AI." } };
}



