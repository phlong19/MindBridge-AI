"use client";

import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/Drawer";
import {
  AlignRight,
  AudioLines,
  CircleDollarSign,
  FolderKanban,
  Handshake,
  House,
  X,
} from "lucide-react";
import { JSX, useState } from "react";

interface NavLink {
  label: string;
  href: string;
  icon: JSX.Element;
}

const navLinks: NavLink[] = [
  { href: "/admin", label: "Manage", icon: <FolderKanban size="20" /> },
  { href: "/", label: "Home", icon: <House size="20" /> },
  { href: "/voices", label: "Voices Library", icon: <AudioLines size="20" /> },
  { label: "Companions", href: "/companions", icon: <Handshake size="20" /> },
  {
    label: "Subscription",
    href: "/subscription",
    icon: <CircleDollarSign size="20" />,
  },
];

const Navbar = () => {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <Link href="/">
          <div className="flex cursor-pointer items-center gap-2.5">
            <Image
              src="/images/logo.svg"
              title="MindBridge AI"
              alt="logo"
              width={46}
              height={44}
              priority
            />
          </div>
        </Link>
        <div className="text-foreground hidden items-center gap-8 lg:flex">
          <nav className="flex items-center gap-4">
            {navLinks.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  (path === href ||
                    (href !== "/" && path.startsWith(href + "/"))) &&
                    "text-primary font-semibold",
                )}
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
        <div className="block lg:hidden">
          <Drawer direction="right" open={open} onOpenChange={setOpen}>
            <DrawerTrigger className="flex w-full justify-end">
              <AlignRight />
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DrawerTitle>MindBridge AI</DrawerTitle>
                    <DrawerDescription>Navigation panel</DrawerDescription>
                  </div>

                  <DrawerClose>
                    <X />
                  </DrawerClose>
                </div>
              </DrawerHeader>

              <DrawerBody className="flex flex-col">
                {navLinks.map(({ label, href, icon }) => (
                  <Link
                    onClick={() => setOpen(false)}
                    key={label}
                    href={href}
                    className={cn(
                      "my-3 flex items-center gap-2 text-base",
                      (path === href ||
                        (href !== "/" && path.startsWith(href + "/"))) &&
                        "text-primary font-semibold",
                    )}
                  >
                    {icon}
                    {label}
                  </Link>
                ))}
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
