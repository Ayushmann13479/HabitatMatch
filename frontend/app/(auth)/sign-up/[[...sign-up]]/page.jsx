import { SignUp } from '@clerk/nextjs'

export const metadata = { title: 'Sign Up — HabitatMatch' }

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'shadow-none border border-border rounded-xl bg-card w-full',
          headerTitle: 'text-foreground',
          headerSubtitle: 'text-muted-foreground',
          formButtonPrimary:
            'bg-primary hover:bg-primary/90 text-primary-foreground',
          footerActionLink: 'text-primary hover:text-primary/80',
          formFieldInput:
            'bg-background border-border text-foreground',
          dividerLine: 'bg-border',
          dividerText: 'text-muted-foreground',
          socialButtonsBlockButton:
            'border-border text-foreground hover:bg-accent',
        },
      }}
      forceRedirectUrl="/home"
    />
  )
}
