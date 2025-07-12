import { getSubjectColor } from "@/lib/utils";

function CompanionInterlink({ subject }: CompanionComponentProps) {
  return (
    <section className="flex h-[70dvh] flex-col">
      <section className="flex gap-8 max-sm:flex-col">
        <div className="companion-section">
          <div
            className="companion-avatar"
            style={{ backgroundColor: getSubjectColor(subject) }}
          ></div>
        </div>
      </section>
    </section>
  );
}

export default CompanionInterlink;
