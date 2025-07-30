"use client";

import { cn, getToastStyle } from "@/lib/utils";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
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
  UserRoundPlus,
  X,
} from "lucide-react";
import { JSX, useEffect, useState } from "react";
import Loading from "./Loading";
import { toast } from "sonner";
import { error as errorMessage } from "@/constants/message";

interface NavLink {
  label: string;
  href: string;
  icon: JSX.Element;
  admin?: boolean;
  exact?: boolean;
}

const navLinks: NavLink[] = [
  {
    href: "/admin",
    label: "Manage",
    icon: <FolderKanban size="20" />,
    admin: true,
  },
  { href: "/", label: "Home", icon: <House size="20" /> },
  { href: "/voices", label: "Voices Library", icon: <AudioLines size="20" /> },
  {
    label: "Companions",
    href: "/companions",
    icon: <Handshake size="20" />,
    exact: true,
  },
  {
    label: "New Companions",
    href: "/companions/new",
    icon: <UserRoundPlus size="20" />,
  },
  {
    label: "Subscription",
    href: "/subscription",
    icon: <CircleDollarSign size="20" />,
  },
];

const Navbar = () => {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { user, isLoaded, isSignedIn } = useUser();
  const [isClient, setIsClient] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsClient(true);

    async function checkIsAdmin() {
      if (user?.id) {
        try {
          const res = await fetch("/api/check-admin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: user.id }),
          });

          const data: { isAdmin: boolean } = await res.json();
          setIsAdmin(data.isAdmin);
        } catch (error) {
          console.log(error);
          toast.error(errorMessage.unknownError, getToastStyle("error"));
        }
      }
    }

    checkIsAdmin();
  }, [user?.id]);

  if (!isLoaded || !isClient) {
    return <Loading full />;
  }

  function renderNavLinks(isDrawer = false) {
    return navLinks.map(({ href, icon, label, admin, exact }) => {
      const className = cn(
        isDrawer ? "my-3 flex items-center gap-2 text-base" : "",
        (path === href ||
          (href !== "/" && path.startsWith(href + "/") && !exact)) &&
          "text-primary font-semibold",
      );

      if ((!user && admin) || (user && admin && !isAdmin)) {
        return null;
      }

      return (
        <Link
          key={label}
          href={href}
          className={className}
          onClick={isDrawer ? () => setOpen(false) : undefined}
        >
          {isDrawer ? icon : ""}
          {label}
        </Link>
      );
    });
  }

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
          <nav className="flex items-center gap-4">{renderNavLinks()}</nav>
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
        {open ? (
          <div className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"></div>
        ) : (
          <></>
        )}
        <div className="block lg:hidden">
          <Drawer
            direction="right"
            modal={false}
            open={open}
            onOpenChange={setOpen}
          >
            <DrawerTrigger className="flex w-full cursor-pointer justify-end">
              <AlignRight />
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DrawerTitle>MindBridge AI</DrawerTitle>
                    <DrawerDescription>Navigation panel</DrawerDescription>
                  </div>

                  <DrawerClose className="cursor-pointer">
                    <X />
                  </DrawerClose>
                </div>
              </DrawerHeader>

              <DrawerBody className="flex flex-col">
                <div
                  className={cn(
                    "flex flex-row items-center gap-2 pb-3",
                    isSignedIn ? "justify-between" : "",
                  )}
                >
                  <SignedOut>
                    <SignInButton>
                      <button
                        onClick={() => setOpen(false)}
                        type="button"
                        className="btn-login w-fit max-md:py-1.5"
                      >
                        Login
                      </button>
                    </SignInButton>
                    <SignUpButton>
                      <button
                        onClick={() => setOpen(false)}
                        type="button"
                        className="btn-login border-transparent bg-[#6c47ff] text-white max-md:py-1.5"
                      >
                        Sign Up
                      </button>
                    </SignUpButton>
                  </SignedOut>
                  <SignedIn>
                    <UserButton />
                  </SignedIn>
                  {isSignedIn && (
                    <SignOutButton>
                      <button
                        type="button"
                        className="btn-login max-lg:py-[3px]"
                      >
                        Logout
                      </button>
                    </SignOutButton>
                  )}
                </div>
                {renderNavLinks(true)}
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
