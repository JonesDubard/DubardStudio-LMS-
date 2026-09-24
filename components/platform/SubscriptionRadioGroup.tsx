"use client";

import { useState } from "react";
import type { SubscriptionStatus } from "@/lib/stubs/get-tenants";

export type SubscriptionRadioOption = {
  value: SubscriptionStatus;
  label: string;
  description: string;
};

type SubscriptionRadioGroupProps = {
  options: SubscriptionRadioOption[];
  defaultValue: SubscriptionStatus;
  name?: string;
};

export function SubscriptionRadioGroup({
  options,
  defaultValue,
  name = "status",
}: SubscriptionRadioGroupProps) {
  const [selected, setSelected] = useState<SubscriptionStatus>(defaultValue);

  return (
    <div className="space-y-4">
      {options.map((option) => {
        const isSelected = selected === option.value;

        return (
          <label
            key={option.value}
            className={
              isSelected
                ? "flex items-center gap-4 border border-[#999999] p-4"
                : "flex items-center gap-4 border border-[#E5E5E5] p-4"
            }
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => setSelected(option.value)}
            />
            <div>
              <div className="text-sm font-medium">{option.label}</div>
              <div className="mt-1 text-xs text-[#666666]">
                {option.description}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
