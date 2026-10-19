"use client";

import { LocalizedText, useI18n } from "@/lib/i18n/provider";
import { cn, getToastStyle } from "@/lib/utils";
import {
  ClerkLoading,
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  SignUpButton,
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
import { HeaderUserButton } from "./LanguageSwitcher";
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
  const { t } = useI18n();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [isOpeningChildren, setIsOpeningChildren] = useState("");
  const { user, isSignedIn } = useUser();
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
          {t(currentPlan)}
        </Badge>
      );
    }
  }

  useEffect(() => {
    async function checkIsAdmin() {
      if (user?.id) {
        try {
          const res = await fetch("/api/check-admin", {
            method: "POST",
          });

          const data: { isAdmin: boolean } = await res.json();
          setIsAdmin(data.isAdmin);
        } catch (error) {
          console.log(error);
          toast.error(t(errorMessage.unknownError), getToastStyle("error"));
        }
      } else setIsAdmin(false);
    }

    checkIsAdmin();
  }, [user?.id, t]);

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
                    {t(label)}
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
                      {t(child.label)}
                    </Link>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            <Popover
              key={label}
              onOpenChange={(nextOpen) =>
                setIsOpeningChildren(nextOpen ? href : "")
              }
              open={isOpeningChildren === href}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="hover:text-primary focus-visible:ring-primary flex cursor-pointer items-center gap-1 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {t(label)}
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={cn(
                      "transition-transform duration-200 motion-reduce:transition-none",
                      isOpeningChildren === href && "rotate-180",
                    )}
                  />
                </button>
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
                    {t(child.label)}
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
            {t(label)}
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
              alt={t("logo")}
              width={46}
              height={44}
              priority
            />
          </div>
        </Link>
        <div className="text-foreground hidden items-center gap-6 text-sm xl:flex">
          <nav className="flex items-center gap-4">{renderNavLinks()}</nav>
          <ClerkLoading>
            <span
              className="bg-muted size-8 animate-pulse rounded-full motion-reduce:animate-none"
              aria-hidden="true"
            />
          </ClerkLoading>
          <SignedOut>
            <SignInButton>
              <button type="button" className="btn-login">
                <LocalizedText>Login</LocalizedText>
              </button>
            </SignInButton>
            {/* <SignUpButton>
          <button className="h-10 cursor-pointer rounded-full bg-[#6c47ff] px-4 text-sm font-medium text-white sm:h-12 sm:px-5 sm:text-base">
            Sign Up
          </button>
        </SignUpButton> */}
          </SignedOut>
          <SignedIn>
            <HeaderUserButton />
          </SignedIn>
        </div>
        {open ? (
          <div className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"></div>
        ) : (
          <></>
        )}
        <div className="flex items-center gap-2 xl:hidden">
          <Drawer
            direction="right"
            modal={false}
            open={open}
            onOpenChange={setOpen}
          >
            <DrawerTrigger
              className="flex w-full cursor-pointer justify-end"
              aria-label={t("open menu drawer")}
            >
              <AlignRight />
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DrawerTitle>MindBridge AI</DrawerTitle>
                    <DrawerDescription>
                      <LocalizedText>Navigation panel</LocalizedText>
                    </DrawerDescription>
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
                <ClerkLoading>
                  <span
                    className="bg-muted size-8 animate-pulse rounded-full motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                </ClerkLoading>
                <SignedOut>
                  <SignInButton>
                    <Button
                      onClick={() => setOpen(false)}
                      type="button"
                      variant="outline"
                      className="btn-login w-fit max-md:py-1.5"
                    >
                      <LocalizedText>Login</LocalizedText>
                    </Button>
                  </SignInButton>
                  <SignUpButton>
                    <Button
                      onClick={() => setOpen(false)}
                      type="button"
                      className="btn-login w-fit border-transparent text-white"
                    >
                      <LocalizedText>Sign Up</LocalizedText>
                    </Button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-3">
                    <HeaderUserButton />
                    {isAdmin && (
                      <Badge>
                        <BadgeCheckIcon />
                        <LocalizedText>Admin</LocalizedText>
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
                      <LocalizedText>Logout</LocalizedText>
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
