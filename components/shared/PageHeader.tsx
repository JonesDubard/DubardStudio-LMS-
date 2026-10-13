type GreetingHeader = {
  variant: "greeting";
  eyebrow: string;
  title: string;
};

type SectionHeader = {
  variant: "section";
  eyebrow: string;
  title: string;
};

type PageHeaderProps = GreetingHeader | SectionHeader;

export function PageHeader(props: PageHeaderProps) {
  if (props.variant === "greeting") {
    return (
      <header className="border-b-4 border-brand-secondary bg-brand-primary px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs">{props.eyebrow}</p>
            <h1 className="text-lg font-bold">{props.title}</h1>
          </div>

          <div className="h-10 w-10 border border-white bg-brand-secondary">
            <div className="flex h-full items-center justify-center text-xs text-white">
              /
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-[#E5E5E5] bg-white px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 border border-[#999999] bg-[#E5E5E5]">
          <div className="flex h-full items-center justify-center text-xs text-[#666666]">
            /
          </div>
        </div>

        <div>
          <p className="text-xs text-[#999999]">{props.eyebrow}</p>
          <h1 className="text-base font-bold">{props.title}</h1>
        </div>
      </div>
    </header>
  );
}
