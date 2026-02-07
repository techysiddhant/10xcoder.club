"use client";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { BookOpen, Menu } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import UserProfileDropdown from "./user-profile-dropdown";
import Logo from "./logo";

import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@workspace/ui/components/drawer";
import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
const Header = () => {
  const { data: session, isPending } = authClient.useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
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
            <div className="hidden md:block h-5 w-px bg-border mx-2" />
            {isPending ? (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            ) : session ? (
              <UserProfileDropdown />
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-medium hidden sm:flex items-center"
                  asChild
                  onClick={() =>
                    sendGAEvent("event", "sign_in_click", {
                      button_name: "sign_in",
                      page_location: window.location.pathname,
                    })
                  }
                >
                  <Link href="/auth?mode=signin">Sign In</Link>
                </Button>
                <Button
                  size="sm"
                  className="font-medium"
                  asChild
                  onClick={() =>
                    sendGAEvent("event", "get_started_click", {
                      button_name: "get_started",
                      page_location: window.location.pathname,
                    })
                  }
                >
                  <Link href="/auth?mode=signup">Get Started</Link>
                </Button>
              </>
            )}
            <div className="flex md:hidden items-center gap-2">
              <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="px-4 pb-8">
                  <div className="space-y-1 mb-4">
                    <Link
                      href="/resources"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-medium">Resources</span>
                    </Link>
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
