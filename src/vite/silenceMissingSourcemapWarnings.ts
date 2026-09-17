import type { Plugin } from 'vite'

/**
 * @ionic/vue (and similar) ship sourcemaps that point at unpublished sources.
 * Vitest also overwrites Vite's `customLogger`, so we patch after config resolve.
 */
export function silenceMissingSourcemapWarnings(): Plugin {
  const ignore = (msg: unknown) =>
    typeof msg === 'string' &&
    msg.includes('Sourcemap for') &&
    msg.includes('points to missing source files')

  return {
    name: 'silence-missing-sourcemap-warnings',
    configResolved(config) {
      const { warn, warnOnce } = config.logger
      config.logger.warn = (msg, options) => {
        if (ignore(msg)) return
        warn(msg, options)
      }
      config.logger.warnOnce = (msg, options) => {
        if (ignore(msg)) return
        warnOnce(msg, options)
      }
    },
  }
}
