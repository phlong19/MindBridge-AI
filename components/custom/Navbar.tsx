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
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/Drawer";
import {
  AlignRight,
  BadgeCheckIcon,
  ChevronDown,
  Crown,
  Rocket,
  Sprout,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import Loading from "./Loading";
import { toast } from "sonner";
import { error as errorMessage } from "@/constants/message";
import { Badge } from "../ui/Badge";
import { useAuth } from "@clerk/nextjs";
import { navLinks, plans } from "@/constants";
import { Plans } from "@/types";
import { Button } from "../ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/Popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/Accordion";

const Navbar = () => {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [isOpeningChildren, setIsOpeningChildren] = useState("");
  const { user, isLoaded, isSignedIn } = useUser();
  const [isClient, setIsClient] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { has } = useAuth();

  function renderPlanBadge() {
    let currentPlan: Plans | undefined;
    let bgColor = "";
    let icon;

    for (const plan of plans) {
      if (has?.({ plan })) {
        currentPlan = plan;
      }
    }
    if (currentPlan) {
      switch (currentPlan) {
        case "starter":
          bgColor = "#00a63e";
          icon = <Sprout />;
          break;
        case "pro":
          bgColor = "#f9d257";
          icon = <Rocket />;
          break;
        case "ultimate":
          bgColor = "var(--destructive)";
          icon = <Crown />;
          break;
      }

      return (
        <Badge
          style={{ backgroundColor: bgColor }}
          className={`capitalize ${currentPlan === "pro" ? "text-foreground" : ""}`}
        >
          {icon}
          {currentPlan}
        </Badge>
      );
    }
  }

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
    return Object.values(navLinks).map(
      ({ href, icon, label, admin, exact, children }) => {
        const getClassName = (exact?: boolean, level = 1, child?: string) => {
          const link = level > 1 ? child : href;
          return cn(
            isDrawer ? "my-3 flex items-center gap-2 text-base" : "",
            (path === link ||
              (link !== "/" && path.startsWith(link + "/") && !exact)) &&
              "text-primary font-semibold",
          );
        };

        if ((!user && admin) || (user && admin && !isAdmin)) {
          return null;
        }

        if (children) {
          return isDrawer ? (
            <Accordion type="single" collapsible key={label}>
              <AccordionItem value="parent">
                <AccordionTrigger className="hover:text-primary cursor-pointer py-3 text-base font-normal duration-75 hover:no-underline">
                  <div className="flex justify-center gap-2">
                    {icon}
                    {label}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0 pl-5">
                  {children.map((child) => (
                    <Link
                      key={child.label}
                      href={child.href}
                      className={cn(
                        getClassName(child.exact, 2, child.href),
                        "hover:text-primary hover:font-semibold",
                      )}
                      onClick={() => setOpen(false)}
                    >
                      {child.icon}
                      {child.label}
                    </Link>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            <Popover
              key={label}
              onOpenChange={() =>
                setIsOpeningChildren((prev) => (prev !== href ? href : ""))
              }
              open={isOpeningChildren === href}
            >
              <PopoverTrigger asChild>
                <span
                  key={label}
                  className="flex cursor-pointer items-center gap-1"
                >
                  <ChevronDown
                    size={18}
                    className={`${isOpeningChildren === href ? "rotate-180" : ""} transition-all duration-300`}
                  />
                  {label}
                </span>
              </PopoverTrigger>

              <PopoverContent className="flex w-[260px] flex-col gap-2">
                {children.map((child) => (
                  <Link
                    href={child.href}
                    key={child.label}
                    className={cn(
                      getClassName(child.exact, 2, child.href),
                      "hover:text-primary transition-all duration-200 hover:font-semibold",
                    )}
                    onClick={() => setIsOpeningChildren("")}
                  >
                    {child.label}
                  </Link>
                ))}
              </PopoverContent>
            </Popover>
          );
        }

        return (
          <Link
            key={label}
            href={href}
            className={cn(getClassName(exact), "hover:text-primary")}
            onClick={isDrawer ? () => setOpen(false) : undefined}
          >
            {isDrawer ? icon : ""}
            {label}
          </Link>
        );
      },
    );
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
            <DrawerTrigger
              className="flex w-full cursor-pointer justify-end"
              aria-label="open menu drawer"
            >
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
                {renderNavLinks(true)}
              </DrawerBody>
              <DrawerFooter
                className={`${isSignedIn ? "justify-between" : "justify-end"} flex-row`}
              >
                <SignedOut>
                  <SignInButton>
                    <Button
                      onClick={() => setOpen(false)}
                      type="button"
                      variant="outline"
                      className="btn-login w-fit max-md:py-1.5"
                    >
                      Login
                    </Button>
                  </SignInButton>
                  <SignUpButton>
                    <Button
                      onClick={() => setOpen(false)}
                      type="button"
                      className="btn-login w-fit border-transparent text-white"
                    >
                      Sign Up
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-3">
                    <UserButton />
                    {isAdmin && (
                      <Badge>
                        <BadgeCheckIcon />
                        Admin
                      </Badge>
                    )}
                    {renderPlanBadge()}
                  </div>
                </SignedIn>
                {isSignedIn && (
                  <SignOutButton>
                    <Button
                      type="button"
                      className="btn-login border-transparent"
                    >
                      Logout
                    </Button>
                  </SignOutButton>
                )}
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
