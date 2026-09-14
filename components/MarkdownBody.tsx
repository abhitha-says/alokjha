import Markdown from "markdown-to-jsx";
import type { ReactNode } from "react";

export default function MarkdownBody({ children }: { children: string }) {
  return (
    <Markdown
      options={{
        overrides: {
          h2: {
            props: {
              className:
                "mt-10 break-words font-serif text-[20px] font-semibold leading-snug text-ink sm:text-[22px]",
            },
          },
          p: {
            props: {
              className: "mt-4 break-words text-[15.5px] leading-[1.8] text-ink/85",
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
              // `anywhere` rather than `break-word` so a bare research URL also
              // stops contributing its full length to min-content sizing — that
              // is what otherwise widens the whole document on a phone.
              className:
                "text-accent underline underline-offset-2 [overflow-wrap:anywhere] hover:text-ink",
              target: "_blank",
              rel: "noopener noreferrer",
            },
          },
          table: {
            component: ({ children, ...props }: { children?: ReactNode }) => (
              <div className="mt-6 overflow-x-auto">
                <table
                  {...props}
                  className="w-full border-collapse overflow-hidden rounded-md border border-line"
                >
                  {children}
                </table>
              </div>
            ),
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
                "break-words px-3 py-3 align-top text-[14.5px] leading-relaxed text-ink/85 first:w-10 first:font-serif first:text-[15px] first:font-semibold first:text-ink sm:px-4",
            },
          },
          ul: {
            props: { className: "mt-4 list-disc space-y-2 break-words pl-5 text-[15.5px] leading-relaxed text-ink/85" },
          },
          blockquote: {
            props: {
              className:
                "mt-6 break-words border-l-2 border-ink/20 pl-5 text-[16px] italic leading-relaxed text-ink/75",
            },
          },
        },
      }}
    >
      {children}
    </Markdown>
  );
}
