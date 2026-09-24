"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { FormField } from "@/components/shared/FormField";

export type LinkedChild = {
  id: string;
  name: string;
  meta: string;
  statusLabel: string;
};

export type ParentSearchResult = {
  id: string;
  name: string;
  meta: string;
};

type ParentChildLinkPanelProps = {
  parentName: string;
  parentEmail: string;
  linkedChildren: LinkedChild[];
  searchDefault: string;
  searchPlaceholder: string;
  searchResult: ParentSearchResult;
  confirmLabel: string;
  linkChildTitle: string;
  linkChildDescription: string;
};

export function ParentChildLinkPanel({
  parentName,
  parentEmail,
  linkedChildren,
  searchDefault,
  searchPlaceholder,
  searchResult,
  confirmLabel,
  linkChildTitle,
  linkChildDescription,
}: ParentChildLinkPanelProps) {
  const [searchValue, setSearchValue] = useState(searchDefault);
  const [checked, setChecked] = useState(true);

  return (
    <section className="border border-[#999999] bg-white">
      <div className="flex items-start justify-between gap-6 border-b border-[#999999] p-6">
        <div>
          <p className="text-sm text-[#666666]">Selected Parent</p>
          <h2 className="mt-1 text-xl font-semibold">{parentName}</h2>
          <p className="mt-1 text-sm text-[#666666]">{parentEmail}</p>
        </div>

        <button
          type="button"
          className="border border-[#333333] bg-[#333333] px-4 py-2 text-white"
        >
          + Link Child
        </button>
      </div>

      <div className="p-6">
        <h3 className="font-semibold">Linked Children</h3>

        <div className="mt-4 divide-y divide-[#E5E5E5] border border-[#999999]">
          {linkedChildren.map((child) => (
            <div
              key={child.id}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <p className="font-medium">{child.name}</p>
                <p className="mt-1 text-sm text-[#666666]">{child.meta}</p>
              </div>
              <StatusBadge label={child.statusLabel} />
            </div>
          ))}
        </div>

        <div className="mt-6 border border-[#999999] bg-[#E5E5E5] p-5">
          <p className="font-semibold">{linkChildTitle}</p>
          <p className="mt-1 text-sm text-[#666666]">{linkChildDescription}</p>

          <div className="mt-4">
            <FormField id="search-student" label="Search Student">
              <input
                id="search-student"
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full border border-[#999999] bg-white px-3 py-3"
              />
            </FormField>
          </div>

          <div className="mt-4 border border-[#999999] bg-white">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{searchResult.name}</p>
                <p className="mt-1 text-sm text-[#666666]">{searchResult.meta}</p>
              </div>
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="border border-[#333333] bg-[#333333] px-5 py-3 text-white"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
