import Hero from '@/components/coming-soon/hero'
import Features from '@/components/coming-soon/features'
import Footer from '@/components/coming-soon/footer'
import Header from '@/components/coming-soon/header'
export default function Home() {
  return (
    <>
      <div className="page-wrapper">
        <Header />
        <Hero />
        <Features />
        <Footer />
      </div>
    </>
  )
}
