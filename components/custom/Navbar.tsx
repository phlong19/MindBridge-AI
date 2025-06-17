"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface NavLink {
  label: string;
  href: string;
}

const navLinks: NavLink[] = [
  {
    href: "/",
    label: "Home",
  },
  { label: "Companions", href: "/companions" },
  { label: "My Profile", href: "/profile" },
  // { label: "Login", href: "/auth/login" },
];

const Navbar = () => {
  const path = usePathname();

  return (
    <nav className="navbar">
      <Link href="/">
        <div className="flex cursor-pointer items-center gap-2.5">
          <Image src="/images/logo.svg" alt="logo" width={46} height={44} />
        </div>
      </Link>
      <div className="flex items-center gap-8">
        <nav className="flex items-center gap-4">
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={cn(path === href && "text-primary font-semibold")}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/auth/login">Login</Link>
      </div>
    </nav>
  );
};

export default Navbar;
