"use client";

import { useState } from "react";
import type { SubscriptionStatus } from "@/lib/platform/schools";

export type SubscriptionRadioOption = {
  value: SubscriptionStatus;
  label: string;
  description: string;
};

type SubscriptionRadioGroupProps = {
  options: SubscriptionRadioOption[];
  defaultValue: SubscriptionStatus;
  value?: SubscriptionStatus;
  onChange?: (value: SubscriptionStatus) => void;
  name?: string;
};

export function SubscriptionRadioGroup({
  options,
  defaultValue,
  value,
  onChange,
  name = "status",
}: SubscriptionRadioGroupProps) {
  const [uncontrolled, setUncontrolled] = useState<SubscriptionStatus>(defaultValue);
  const selected = value ?? uncontrolled;

  return (
    <div className="space-y-4">
      {options.map((option) => {
        const isSelected = selected === option.value;

        return (
          <label
            key={option.value}
            className={
              isSelected
                ? "flex items-center gap-4 border border-line p-4"
                : "flex items-center gap-4 border border-line-subtle p-4"
            }
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={() => {
                if (onChange) onChange(option.value);
                else setUncontrolled(option.value);
              }}
            />
            <div>
              <div className="text-sm font-medium">{option.label}</div>
              <div className="mt-1 text-xs text-ink-secondary">
                {option.description}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
}
