import type { ReactNode } from "react";

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterField = {
  id: string;
  label: string;
  options: FilterOption[];
  defaultValue?: string;
};

export type FilterTextField = {
  id: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
};

type FilterRowProps = {
  fields?: FilterField[];
  textFields?: FilterTextField[];
  search?: {
    id: string;
    label: string;
    placeholder: string;
    defaultValue?: string;
  };
  children?: ReactNode;
  className?: string;
  gridClassName?: string;
  labelClassName?: string;
  controlClassName?: string;
};

export function FilterRow({
  fields = [],
  textFields = [],
  search,
  children,
  className = "border border-[#999999] bg-white p-5",
  gridClassName = "grid grid-cols-1 gap-4 md:grid-cols-3",
  labelClassName = "mb-2 block text-sm font-medium",
  controlClassName = "w-full border border-[#999999] bg-white px-3 py-3",
}: FilterRowProps) {
  return (
    <section className={className}>
      <div className={gridClassName}>
        {fields.map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className={labelClassName}>
              {field.label}
            </label>
            <select
              id={field.id}
              name={field.id}
              defaultValue={field.defaultValue ?? field.options[0]?.value}
              className={controlClassName}
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {textFields.map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className={labelClassName}>
              {field.label}
            </label>
            <input
              id={field.id}
              name={field.id}
              type="text"
              defaultValue={field.defaultValue}
              placeholder={field.placeholder}
              className={controlClassName}
            />
          </div>
        ))}

        {search ? (
          <div>
            <label htmlFor={search.id} className={labelClassName}>
              {search.label}
            </label>
            <input
              id={search.id}
              name={search.id}
              type="text"
              defaultValue={search.defaultValue}
              placeholder={search.placeholder}
              className={controlClassName}
            />
          </div>
        ) : null}

        {children}
      </div>
    </section>
  );
}
