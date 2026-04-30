import { describe, expect, it } from 'vitest'
import { parseProxySettings } from '../src/core/proxy'

describe('parseProxySettings', () => {
  it('parses enabled proxy settings from networksetup output', () => {
    expect(parseProxySettings(`
Enabled: Yes
Server: 127.0.0.1
Port: 8081
Authenticated Proxy Enabled: 0
`)).toEqual({
      enabled: true,
      server: '127.0.0.1',
      port: 8081,
      authenticated: false,
    })
  })

  it('preserves disabled proxy endpoints for later restore', () => {
    expect(parseProxySettings(`
Enabled: No
Server: 127.0.0.1
Port: 7890
Authenticated Proxy Enabled: 1
`)).toEqual({
      enabled: false,
      server: '127.0.0.1',
      port: 7890,
      authenticated: true,
    })
  })
})
