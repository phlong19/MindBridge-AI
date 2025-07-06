"use client";

import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
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
  { label: "Subscription", href: "/subscription" },
  // { label: "Login", href: "/auth/login" },
];

const Navbar = () => {
  const path = usePathname();

  return (
    <nav className="navbar">
      <Link href="/">
        <div className="flex cursor-pointer items-center gap-2.5">
          <Image
            src="/images/logo.svg"
            title="MindBridge AI"
            alt="logo"
            width={0}
            height={0}
            style={{ width: 46, height: 44 }}
          />
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
        <SignedOut>
          <SignInButton>
            <button type="button" className="btn-login">
              Login
            </button>
          </SignInButton>
          {/* <SignUpButton>
          <button className="h-10 cursor-pointer rounded-full bg-[#6c47ff] px-4 text-sm font-medium text-white sm:h-12 sm:px-5 sm:text-base">
            Sign Up
          </button>
        </SignUpButton> */}
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </nav>
  );
};

export default Navbar;
