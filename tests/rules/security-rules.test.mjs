import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const firestoreRules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8')
const storageRules = readFileSync(new URL('../../storage.rules', import.meta.url), 'utf8')
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/ai-evaluation-cases.json', import.meta.url), 'utf8'))

function ruleBlock(collection) {
  const start = firestoreRules.indexOf(`match /${collection}/{id}`)
  if (start === -1) return ''
  const next = firestoreRules.indexOf('\n    match /', start + 1)
  return firestoreRules.slice(start, next === -1 ? undefined : next)
}

test('Firestore rules expose public reports but keep writes authenticated', () => {
  assert.match(firestoreRules, /match \/reports\/\{id\}/)
  assert.match(firestoreRules, /allow read: if true;/)
  assert.match(firestoreRules, /allow create: if signedIn\(\);/)
  assert.match(firestoreRules, /allow update, delete: if signedIn\(\);/)
})

test('Firestore rules make agent audit collections server-write only', () => {
  for (const collection of ['agent_runs', 'agent_steps', 'agent_actions', 'verification_evidence']) {
    assert.ok(firestoreRules.includes(`match /${collection}/{id}`), `${collection} rule is missing`)
  }
  const serverOnlyMatches = firestoreRules.match(/allow write: if false;/g) || []
  assert.ok(serverOnlyMatches.length >= 5, 'agent and evidence collections should not allow client writes')
})

test('Firestore rules expose public agent evidence for issue pages', () => {
  for (const collection of ['agent_runs', 'agent_steps', 'agent_actions', 'verification_evidence']) {
    const block = ruleBlock(collection)
    assert.ok(block, `${collection} rule block is missing`)
    assert.match(block, /allow read: if true;/)
    assert.match(block, /allow write: if false;/)
  }
})

test('Firestore rules restrict private memory reads to signed-in users', () => {
  assert.match(firestoreRules, /match \/agent_memory\/\{id\}/)
  assert.match(firestoreRules, /allow read: if signedIn\(\);/)
})

test('Storage rules require auth, image content types, and size limits', () => {
  assert.match(storageRules, /match \/report-images\/\{userId\}\/\{fileName\}/)
  assert.match(storageRules, /match \/verification-images\/\{userId\}\/\{fileName\}/)
  assert.match(storageRules, /request\.auth\.uid == userId/)
  assert.match(storageRules, /request\.resource\.size < 10 \* 1024 \* 1024/)
  assert.match(storageRules, /request\.resource\.contentType\.matches\('image\/\.\*'\)/)
  assert.match(storageRules, /allow read, write: if false;/)
})

test('AI evaluation fixtures contain 20 complete labeled cases', () => {
  assert.equal(fixtures.length, 20)
  for (const item of fixtures) {
    assert.ok(item.id)
    assert.ok(item.imageDescription)
    assert.ok(item.userDescription)
    assert.ok(item.expectedCategory)
    assert.ok(item.expectedSeverity)
    assert.ok(item.expectedDepartment)
  }
})
