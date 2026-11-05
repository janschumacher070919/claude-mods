export type TodoStatus = 'pending' | 'in_progress' | 'completed'
export type Todo = { id: string; title: string; status: TodoStatus }
export type Mod = { name: string; isActive: boolean }

declare module 'claude-code' {
  interface PluginState {
    dashboard: { todos: Shaped<Todo[]>; mods: Shaped<Mod[]> }
  }
}
