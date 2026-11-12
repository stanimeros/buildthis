/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_FIREBASE_API_KEY: string
  readonly PUBLIC_FIREBASE_AUTH_DOMAIN: string
  readonly PUBLIC_FIREBASE_PROJECT_ID: string
  readonly PUBLIC_FIREBASE_STORAGE_BUCKET: string
  readonly PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string
  readonly PUBLIC_FIREBASE_APP_ID: string
  readonly PUBLIC_FIREBASE_MEASUREMENT_ID?: string
  readonly PUBLIC_RECAPTCHA_ENTERPRISE_KEY?: string
  readonly PUBLIC_USE_EMULATORS?: string
}

interface Window {
  /** Set by the inline script in layouts/base.astro for an <AuthLink> clicked before hydration. */
  __pendingAuthLink?: string
}
