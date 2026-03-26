"use client";

import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthCtaLinkProps = {
  authenticatedHref: string;
  unauthenticatedHref: string;
  className?: string;
  children: ReactNode;
};

const AuthCtaLink = ({
  authenticatedHref,
  unauthenticatedHref,
  className,
  children,
}: AuthCtaLinkProps) => {
  const { data: session, isPending } = authClient.useSession();
  const href = isPending || session ? authenticatedHref : unauthenticatedHref;

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
};

export default AuthCtaLink;
