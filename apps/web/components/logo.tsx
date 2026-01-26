import Link from 'next/link'

const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-3 group">
      <div className="w-8 h-8 bg-primary text-primary-foreground font-mono font-bold text-sm flex items-center justify-center rounded transition-transform group-hover:scale-105">
        10x
      </div>
      <span className="font-semibold text-foreground hidden sm:block">
        10xcoder
        <span className="size-1 mx-0.5 rounded-full bg-primary inline-block"></span>
        club
      </span>
    </Link>
  )
}

export default Logo
