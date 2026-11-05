import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'dashboard', component: 'Pane', requestId: 'dashboard', surface: 'desktop',
  props: { title: 'Dashboard', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('zeigt Aufgaben mit Status und den eigenen Mod', async ($, on) => {
  on('command.register', () => ({ value: { command: 'dashboard' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('settings.read', () => ({ value: { enabledPlugins: { 'tool-calls@local': false } } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', { tool: 'TaskCreate' }, () => ({ result: { task: { id: '1', subject: 'Tests schreiben' } } }))
  on('tool.call', { tool: 'TaskUpdate' }, () => ({ result: { success: true, taskId: '1', updatedFields: ['status'] } }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'TaskCreate', subject: 'Tests schreiben', description: '' })
  let ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text', text: /Tests schreiben/ }))?.text).toBe('[ ] Tests schreiben (offen)')
  await ui.unmount()

  await $.tool.call({ tool: 'TaskUpdate', taskId: '1', status: 'completed' })
  ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text', text: /Tests schreiben/ }))?.text).toBe('[x] Tests schreiben (erledigt)')
  expect((await ui.find({ type: 'Text', text: /^dashboard$/ }))?.text).toBe('dashboard')
  expect((await ui.find({ type: 'Text', text: /^tool-calls$/ }))?.text).toBe('tool-calls')
  await ui.unmount()
})

test('/dashboard schaltet um, /clear leert die To-dos', async ($, on) => {
  let isOpen = false
  on('command.register', () => ({ value: { command: 'dashboard' } }))
  on('settings.read', () => ({ value: {} }))
  on('ui.open', () => ((isOpen = true), { value: { isPlaced: true } }))
  on('ui.close', () => ((isOpen = false), { value: undefined }))
  on('ui.panes', () => ({ value: isOpen ? [{ id: 'dashboard', title: 'Dashboard', isShown: true, isFocused: false, isPlaced: true }] : [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('tool.call', { tool: 'TodoWrite' }, () => ({
    result: { oldTodos: [], newTodos: [{ content: 'Bauen', status: 'in_progress', activeForm: 'Baut' }] },
  }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect((await $.command.run({ command: 'dashboard' })).text).toBe('Dashboard ausgeblendet.')
  expect((await $.command.run({ command: 'dashboard' })).text).toBe('Dashboard eingeblendet.')

  await $.tool.call({ tool: 'TodoWrite', todos: [{ content: 'Bauen', status: 'in_progress', activeForm: 'Baut' }] })
  let ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text', text: /Bauen/ }))?.text).toBe('[~] Bauen (in Arbeit)')
  await ui.unmount()

  await $.session.end({ reason: 'clear', sessionId: 's1' })
  ui = await $.ui.mount(PANE)
  expect((await ui.find({ type: 'Text', text: /Keine Aufgaben/ }))?.text).toBe('Keine Aufgaben.')
  expect((await ui.find({ type: 'Text', text: /^dashboard$/ }))?.text).toBe('dashboard')
  await ui.unmount()
})
