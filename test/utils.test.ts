import { describe, expect, it } from 'vitest'
import { escapePredicateString, getErrorMessage } from '../src/utils'

describe('escapePredicateString', () => {
  it('escapes strings for macOS log predicates', () => {
    expect(escapePredicateString('a"b\\c')).toBe('a\\"b\\\\c')
  })
})

describe('getErrorMessage', () => {
  it('normalizes unknown thrown values', () => {
    expect(getErrorMessage(new Error('failed'))).toBe('failed')
    expect(getErrorMessage('failed')).toBe('failed')
  })
})
