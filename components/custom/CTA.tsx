import React from "react";
import { Button } from "../ui/Button";
import Image from "next/image";
import Link from "next/link";

const CTA = () => {
  return (
    <section className="cta-section">
      <div className="cta-badge">Learning as the way you want</div>
      <h2 className="text-2xl font-bold">
        Build and Personalize Learning Companion
      </h2>
      <p>
        Pick a name, subject, voice & personality - and start learning through
        voice conversations that feel truly nature and joy.
      </p>
      <Image
        src="/images/cta.svg"
        alt="cta"
        width={0}
        height={0}
        style={{ width: 360, height: 230 }}
      />
      <Link href="/companions/new">
        <Button className="flex items-baseline">
          <Image
            src="/icons/plus.svg"
            alt="add"
            width={0}
            height={0}
            style={{ width: 12, height: 12 }}
          />
          <p>Build a new Companion</p>
        </Button>
      </Link>
    </section>
  );
};

export default CTA;
