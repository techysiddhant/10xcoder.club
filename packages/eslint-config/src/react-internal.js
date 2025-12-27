import js from '@eslint/js'
import next from 'eslint-config-next'

/**
 * Minimal shared config for internal React/Next packages.
 * Consumers can extend/override locally.
 */
export const config = [js.configs.recommended, ...next]
