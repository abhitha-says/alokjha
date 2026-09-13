import Markdown from "markdown-to-jsx";

export default function MarkdownBody({ children }: { children: string }) {
  return (
    <Markdown
      options={{
        overrides: {
          h2: {
            props: {
              className:
                "mt-10 font-serif text-[20px] font-semibold leading-snug text-ink sm:text-[22px]",
            },
          },
          p: {
            props: {
              className: "mt-4 text-[15.5px] leading-[1.8] text-ink/85",
            },
          },
          strong: {
            props: { className: "font-semibold text-ink" },
          },
          em: {
            props: { className: "italic" },
          },
          a: {
            props: {
              className: "text-accent underline underline-offset-2 hover:text-ink",
              target: "_blank",
              rel: "noopener noreferrer",
            },
          },
          table: {
            props: {
              className: "mt-6 w-full border-collapse overflow-hidden rounded-md border border-line",
            },
          },
          thead: { props: { className: "hidden" } },
          tr: {
            props: {
              className: "border-b border-line last:border-0",
            },
          },
          td: {
            props: {
              className:
                "px-4 py-3 align-top text-[14.5px] leading-relaxed text-ink/85 first:w-10 first:font-serif first:text-[15px] first:font-semibold first:text-ink",
            },
          },
          ul: {
            props: { className: "mt-4 list-disc space-y-2 pl-5 text-[15.5px] leading-relaxed text-ink/85" },
          },
          blockquote: {
            props: {
              className:
                "mt-6 border-l-2 border-ink/20 pl-5 text-[16px] italic leading-relaxed text-ink/75",
            },
          },
        },
      }}
    >
      {children}
    </Markdown>
  );
}
