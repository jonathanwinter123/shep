// src/lib/actionRegistry.ts

export interface ActionDefinition {
  id: string;
  label: string;
  category: string;
  defaultShortcut: string | null;
  execute: () => void;
}

const registry = new Map<string, ActionDefinition>();

export function registerAction(action: ActionDefinition): void {
  registry.set(action.id, action);
}

export function getAction(id: string): ActionDefinition | undefined {
  return registry.get(id);
}

export function getAllActions(): ActionDefinition[] {
  return Array.from(registry.values());
}

export function clearRegistry(): void {
  registry.clear();
}
