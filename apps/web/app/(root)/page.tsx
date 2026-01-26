import BuiltByDevelopers from '@/components/home/built-by-developers'
import CTA from '@/components/home/cta'
import ExamplePreview from '@/components/home/example-preview'
import Hero from '@/components/home/hero'
import HowCurationWorks from '@/components/home/how-curation-work'
import WhatYoullFind from '@/components/home/what-youll-find'
import WhyThisExists from '@/components/home/why-this-exists'

const page = () => {
  return (
    <>
      <Hero />
      <WhatYoullFind />
      <HowCurationWorks />
      <WhyThisExists />
      <ExamplePreview />
      <BuiltByDevelopers />
      <CTA />
    </>
  )
}

export default page
