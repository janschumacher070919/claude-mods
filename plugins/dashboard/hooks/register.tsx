// Mod „dashboard“: ein Panel neben dem Chat mit den To-dos der Sitzung
// und den geladenen Mods. /dashboard blendet es ein und aus.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mod, Todo, TodoStatus } from '../types'

const PANE = { id: 'dashboard', title: 'Dashboard' }

// Werte bleiben über ein Neuladen des Mods erhalten (Sitzungs-Speicher).
const todos = atom({ plugin: 'dashboard', key: 'todos' } as const, [], { shape: 'todos-1' })
const mods = atom({ plugin: 'dashboard', key: 'mods' } as const, [], { shape: 'mods-1' })

const SYMBOL: Record<TodoStatus, string> = { pending: '[ ]', in_progress: '[~]', completed: '[x]' }
const LABEL: Record<TodoStatus, string> = { pending: 'offen', in_progress: 'in Arbeit', completed: 'erledigt' }

// Einen Mod in die Liste eintragen oder seinen Zustand aktualisieren.
const setMod = ($: EngineInterface, name: string, isActive: boolean) =>
  update($, mods, list => [...list.filter(m => m.name !== name), { name, isActive }])

// Installierte Plugins aus den Einstellungen (enabledPlugins: „name@quelle“ → an/aus).
// Grenze der API: Mods, die vor diesem geladen wurden, sieht er nur auf diesem Weg;
// per --plugin-dir geladene fehlen dann, und „an“ heißt hier „eingeschaltet“.
async function readInstalled($: EngineInterface) {
  const enabled = await $.settings.read({ key: 'enabledPlugins' })
  if (enabled === null || typeof enabled !== 'object') return
  for (const [key, isOn] of Object.entries(enabled)) {
    await setMod($, key.split('@')[0] ?? key, isOn === true)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'dashboard', description: 'Dashboard-Panel ein- oder ausblenden' })
    await setMod($, $.plugin.name, true)
    await readInstalled($).catch(() => undefined) // Liste bleibt dann eben kürzer
    void $.ui.open(PANE)
    return next(e)
  })

  // Nach /clear beginnt eine neue Unterhaltung mit leerer Task-Liste.
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') await update($, todos, () => [])
    return next(e)
  })

  // Jeder Mod, der nach diesem geladen wird, meldet sich hier an.
  on('plugin.register', async ($, e, next) => {
    const result = await next(e)
    await setMod($, e.name, result.allow === true)
    return result
  })

  // /dashboard: Panel umschalten, ohne dass Claude antwortet.
  on('command.run', { command: 'dashboard' }, async $ => {
    const isOpen = (await $.ui.panes()).some(pane => pane.id === PANE.id)
    if (isOpen) await $.ui.close({ id: PANE.id })
    else await $.ui.open(PANE)
    return { text: isOpen ? 'Dashboard ausgeblendet.' : 'Dashboard eingeblendet.' }
  })

  // Task-Liste mitlesen: jede Änderung durch Claude landet im Panel.
  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true && ran.result.task) {
      const { id, subject } = ran.result.task
      const todo: Todo = { id, title: subject, status: 'pending' }
      await update($, todos, list => [...list, todo])
    }
    return ran
  })

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true && ran.result.success) {
      const status = e.status
      await update($, todos, list =>
        status === 'deleted'
          ? list.filter(t => t.id !== e.taskId)
          : list.map(t => (t.id === e.taskId ? { ...t, title: e.subject ?? t.title, status: status ?? t.status } : t)),
      )
    }
    return ran
  })

  on('tool.call', { tool: 'TaskList' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const fresh: Todo[] = ran.result.tasks.map(t => ({ id: t.id, title: t.subject, status: t.status }))
      await update($, todos, () => fresh)
    }
    return ran
  })

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      const fresh: Todo[] = ran.result.newTodos.map((t, i) => ({ id: String(i), title: t.content, status: t.status }))
      await update($, todos, () => fresh)
    }
    return ran
  })

  // Das Panel zeichnen; es zeichnet sich neu, sobald sich todos oder mods ändern.
  on('ui.render', { component: 'Pane', requestId: PANE.id }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const todoList = await read($, todos)
    const modList: Mod[] = [...(await read($, mods))].sort((a, b) => a.name.localeCompare(b.name))

    return (
      <Box flexDirection="column">
        <Text bold>To-dos</Text>
        {todoList.length === 0 && <Text dimColor>Keine Aufgaben.</Text>}
        {todoList.map(t => (
          <Text dimColor={t.status === 'completed'} strikethrough={t.status === 'completed'}>
            {SYMBOL[t.status]} {t.title} ({LABEL[t.status]})
          </Text>
        ))}
        <Text> </Text>
        <Text bold>Mods</Text>
        <Text dimColor>Installierte Mods und alle, die nach diesem geladen wurden. Punkt = eingeschaltet.</Text>
        {modList.map(m => (
          <Box flexDirection="row">
            <Text color={m.isActive ? 'success' : 'inactive'}>{m.isActive ? '●' : '○'} </Text>
            <Text dimColor={!m.isActive}>{m.name}</Text>
          </Box>
        ))}
      </Box>
    )
  })
}
