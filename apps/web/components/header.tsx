import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import Logo from "./logo";
import HeaderActions from "./header-actions";

const Header = () => {
  return (
    <>
      {/* Beta notice: fixed at very top, solid background; responsive for mobile */}
      {/* <div className="fixed top-0 left-0 right-0 z-60 w-full border-b border-amber-500/20 bg-amber-50 dark:bg-amber-950/98 min-h-13 sm:min-h-12 flex items-center backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-6 py-2  w-full">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 text-center sm:text-left w-full">
            <span className="text-xs sm:text-sm leading-snug text-amber-950 dark:text-amber-200">
              <span className="sm:hidden">
                🚧 Beta — some features may be incomplete.
              </span>
              <span className="hidden sm:inline">
                🚧 This site is in beta. Some features may not work as expected.
              </span>
            </span>
            <a
              href="https://github.com/techysiddhant/10xcoder.club/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 w-full items-center justify-center rounded px-3 py-2 text-xs font-medium text-amber-950 underline underline-offset-2 transition-colors hover:text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 touch-manipulation sm:w-auto sm:text-sm dark:text-amber-200 dark:hover:text-amber-400"
            >
              Report issues
            </a>
          </div>
        </div>
      </div> */}
      {/* Navbar: fixed below the notice; on mobile notice stacks so use larger top to avoid overlap */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 dark:bg-background/98 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo />
            {/* Right side - Navigation + Auth */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 font-medium"
                  asChild
                >
                  <Link href="/resources">
                    <BookOpen className="w-4 h-4" />
                    Resources
                  </Link>
                </Button>
              </div>
              <HeaderActions />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Header;
