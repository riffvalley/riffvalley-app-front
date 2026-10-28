import { describe, expect, it } from 'vitest'
import { createApiDevProxy, setProductionSessionOrigin } from '../../../vite.config'

const productionApi = 'https://spammusic-back-99963122d70c.herokuapp.com'

describe('Vite API proxy configuration', () => {
  it('forwards development API requests over verified HTTPS', () => {
    const proxy = createApiDevProxy('serve', { API_PROXY_TARGET: productionApi })
    const context = '^/api(?:/|\\?|$)'

    expect(proxy?.[context]).toMatchObject({
      target: productionApi,
      changeOrigin: true,
      secure: true,
    })
    expect(proxy?.[context]?.rewrite).toBeUndefined()
    expect(proxy?.[context]?.cookieDomainRewrite).toBeUndefined()
    expect(new RegExp(context).test('/api')).toBe(true)
    expect(new RegExp(context).test('/api/auth/login')).toBe(true)
    expect(new RegExp(context).test('/api?health=1')).toBe(true)
    expect(new RegExp(context).test('/api2/auth/login')).toBe(false)
  })

  it('does not configure a proxy in build mode', () => {
    expect(createApiDevProxy('build', { API_PROXY_TARGET: productionApi })).toBeUndefined()
  })

  it('sends the production App Origin required by refresh-v1', () => {
    const headers = new Map<string, string>()

    setProductionSessionOrigin({
      setHeader: (name, value) => headers.set(name, value),
    })

    expect(headers.get('Origin')).toBe('https://app.riffvalley.es')
  })

  it('leaves the proxy disabled when no target is selected', () => {
    expect(createApiDevProxy('serve', {})).toBeUndefined()
  })

  it.each([
    'http://localhost:3000',
    'https://api.example.test/api',
    'https://user:password@api.example.test',
    'https://api.example.test',
  ])('rejects an unsafe, non-origin, or unapproved proxy target: %s', (target) => {
    expect(() => createApiDevProxy('serve', { API_PROXY_TARGET: target })).toThrow('API_PROXY_TARGET')
  })
})
