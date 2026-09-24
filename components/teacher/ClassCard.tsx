type ClassCardProps = {
  name: string;
  subject: string;
  studentCountLabel: string;
};

export function ClassCard({ name, subject, studentCountLabel }: ClassCardProps) {
  return (
    <div className="border border-[#999999] bg-white p-5">
      <p className="text-sm text-[#666666]">Class</p>
      <h3 className="mt-1 font-semibold">{name}</h3>
      <p className="mt-3 text-sm">{subject}</p>
      <p className="text-sm text-[#666666]">{studentCountLabel}</p>
    </div>
  );
}
