'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      expand={false}
      duration={4000}
      toastOptions={{
        classNames: {
          toast: 'font-sans text-sm',
        },
      }}
    />
  )
}
