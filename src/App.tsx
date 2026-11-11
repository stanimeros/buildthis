import { useState } from 'react'

import { ExampleIssues } from '@/components/example-issues'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Hero } from '@/components/hero'
import { HowItWorks } from '@/components/how-it-works'
import { SignupForm, type SignupType } from '@/components/signup-form'

export default function App() {
  const [type, setType] = useState<SignupType>('problem')

  function pick(next: SignupType) {
    setType(next)
    document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <Header />
      <main>
        <Hero onPick={pick} />
        <HowItWorks />
        <ExampleIssues />
        <SignupForm type={type} onTypeChange={setType} />
      </main>
      <Footer />
    </div>
  )
}
