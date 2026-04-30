import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/config'

describe('resolveConfig', () => {
  it('keeps repeated CLI values as separate list entries', async () => {
    const config = await resolveConfig({
      processNames: ['DemoApp', 'DemoNotificationExtension'],
      hosts: ['example.test', 'api.example.test'],
      paths: ['/api/items', '/api/actions'],
    })

    expect(config.processNames).toEqual(['DemoApp', 'DemoNotificationExtension'])
    expect(config.hosts).toEqual(['example.test', 'api.example.test'])
    expect(config.paths).toEqual(['/api/items', '/api/actions'])
  })

  it('does not split comma-separated strings implicitly', async () => {
    const config = await resolveConfig({
      processNames: 'DemoApp,DemoNotificationExtension',
      hosts: 'example.test,api.example.test',
    })

    expect(config.processNames).toEqual(['DemoApp,DemoNotificationExtension'])
    expect(config.hosts).toEqual(['example.test,api.example.test'])
  })

  it('removes cac positional metadata from resolved options', async () => {
    const config = await resolveConfig({
      '--': ['unexpected'],
    } as Parameters<typeof resolveConfig>[0])

    expect(config).not.toHaveProperty('--')
  })
})
