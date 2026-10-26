import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLatestRequest } from '../src/utils/latestRequest.ts'

test('slow old responses cannot replace the newly selected report', async () => {
  const gate = createLatestRequest()
  let shown = ''
  let finishFirst!: (value: string) => void
  const firstResult = new Promise<string>(resolve => { finishFirst = resolve })
  const firstCurrent = gate.begin()
  const first = firstResult.then(value => { if (firstCurrent()) shown = value })
  const secondCurrent = gate.begin()
  if (secondCurrent()) shown = await Promise.resolve('new report')
  finishFirst('old report')
  await first
  assert.equal(shown, 'new report')
})

test('closing or unmounting invalidates outstanding responses', () => {
  const gate = createLatestRequest()
  const current = gate.begin()
  gate.invalidate()
  assert.equal(current(), false)
  assert.equal(gate.begin()(), true)
})
