import Link from "next/link";
import { Button } from "../ui/Button";
import { TypographyH3 } from "../ui/Typography";
import { navLinks } from "@/constants";

const NoCompanions = () => {
  return (
    <div className="mx-auto flex w-fit flex-col items-center justify-center gap-3">
      <TypographyH3 className="text-xl">
        Currently you don’t have any companions yet.
      </TypographyH3>

      <Link href={navLinks.newCompanion.href}>
        <Button>Add a new companion</Button>
      </Link>
    </div>
  );
};

export default NoCompanions;
