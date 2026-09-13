import Reveal from "./Reveal";

export default function QuoteSection() {
  return (
    <section className="mx-auto max-w-content px-6 py-16 text-center sm:px-10 md:py-20 lg:px-14">
      <Reveal>
        <span className="font-serif text-[48px] leading-none text-ink/20">&ldquo;</span>
        <p className="mx-auto -mt-2 max-w-[560px] font-serif text-[19px] font-medium leading-relaxed text-ink sm:text-[21px]">
          The more we understand people, the better we can build
          businesses, institutions and lives that actually work.
        </p>
        <p className="mt-4 text-[13px] text-muted">— Alok Jha</p>
      </Reveal>
    </section>
  );
}
