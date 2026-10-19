import { LocalizedText } from "@/lib/i18n/provider";
import Link from "next/link";
import { Button } from "../ui/Button";
import { TypographyH3 } from "../ui/Typography";
import { navLinks } from "@/constants";
import { UserPlus } from "lucide-react";

const NoCompanions = () => {
  return (
    <div className="mx-auto flex w-fit flex-col items-center justify-center gap-3">
      <TypographyH3 className="text-xl">
        <LocalizedText>
          Currently you don’t have any companions yet.
        </LocalizedText>
      </TypographyH3>

      <Link href={navLinks.newCompanion.href}>
        <Button>
          <UserPlus />
          <LocalizedText>Add a new companion</LocalizedText>
        </Button>
      </Link>
    </div>
  );
};

export default NoCompanions;
