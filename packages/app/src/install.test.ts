import { describe, expect, it } from 'vitest'
import { detectPlatform, isStandalone } from './install'

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/129.0.2792.84 Mobile/15E148 Safari/605.1.15',
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  windowsChrome:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
}

describe('detectPlatform', () => {
  it('knows iPhone Safari', () => {
    expect(detectPlatform(UA.iphoneSafari, 5)).toEqual({ platform: 'ios', iosBrowser: 'safari' })
  })

  it('knows the other iPhone browsers (Chrome, Firefox, Edge)', () => {
    for (const ua of [UA.iphoneChrome, UA.iphoneFirefox, UA.iphoneEdge])
      expect(detectPlatform(ua, 5)).toEqual({ platform: 'ios', iosBrowser: 'other' })
  })

  it('sees through iPadOS asking for the desktop site (Macintosh with touch)', () => {
    expect(detectPlatform(UA.ipadDesktopMode, 5).platform).toBe('ios')
  })

  it('a Mac without touch is a desktop', () => {
    expect(detectPlatform(UA.macSafari, 0).platform).toBe('desktop')
    expect(detectPlatform(UA.macSafari).platform).toBe('desktop')
  })

  it('knows Android and desktop Chromium', () => {
    expect(detectPlatform(UA.androidChrome, 5).platform).toBe('android')
    expect(detectPlatform(UA.windowsChrome, 0).platform).toBe('desktop')
  })
})

describe('isStandalone', () => {
  it('is installed from the display-mode query or iOS navigator.standalone', () => {
    expect(isStandalone(true)).toBe(true)
    expect(isStandalone(false, true)).toBe(true)
    expect(isStandalone(false, false)).toBe(false)
    expect(isStandalone(false)).toBe(false)
  })
})
