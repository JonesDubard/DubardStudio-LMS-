"use client";

import Link from "next/link";
import { useState } from "react";
import { FormField } from "@/components/shared/FormField";

export default function CreateTenantPage() {
  const [subdomain, setSubdomain] = useState("pilotschool");

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1100px] p-8">
        <header className="mb-8">
          <div className="text-sm text-[#666666]">Tenants</div>
          <h1 className="mt-1 text-2xl font-semibold">Create Tenant</h1>
          <p className="mt-2 text-sm text-[#666666]">
            Provision a new school on the LMS platform.
          </p>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <section className="border border-[#E5E5E5]">
            <div className="border-b border-[#E5E5E5] px-6 py-5">
              <h2 className="font-semibold">Tenant Information</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <FormField id="school-name" label="School Name">
                <input
                  id="school-name"
                  type="text"
                  defaultValue="Pilot School #1"
                  className="w-full border border-[#999999] px-3 py-3 text-sm"
                />
              </FormField>

              <FormField id="contact-person" label="Contact Person">
                <input
                  id="contact-person"
                  type="text"
                  defaultValue="Mrs. Abena Kollie"
                  className="w-full border border-[#999999] px-3 py-3 text-sm"
                />
              </FormField>

              <FormField id="contact-email" label="Contact Email">
                <input
                  id="contact-email"
                  type="email"
                  defaultValue="admin@pilotschool.edu.lr"
                  className="w-full border border-[#999999] px-3 py-3 text-sm"
                />
              </FormField>

              <div>
                <label
                  htmlFor="subdomain"
                  className="mb-2 block text-sm font-medium"
                >
                  Subdomain
                </label>
                <input
                  id="subdomain"
                  type="text"
                  value={subdomain}
                  onChange={(event) => setSubdomain(event.target.value)}
                  className="w-full border border-[#999999] px-3 py-3 text-sm"
                />
                <div className="mt-2 text-xs text-[#666666]">
                  Preview:{" "}
                  <span className="font-medium text-[#333333]">
                    {subdomain || "pilotschool"}.ourlms.com
                  </span>
                </div>
              </div>

              <FormField id="subscription-status" label="Subscription Status">
                <select
                  id="subscription-status"
                  defaultValue="Trial"
                  className="w-full border border-[#999999] bg-white px-3 py-3 text-sm"
                >
                  <option>Trial</option>
                  <option>Active</option>
                  <option>Suspended</option>
                  <option>Cancelled</option>
                </select>
              </FormField>

              <FormField id="grade-range" label="Grade Range">
                <select
                  id="grade-range"
                  defaultValue="Both"
                  className="w-full border border-[#999999] bg-white px-3 py-3 text-sm"
                >
                  <option>Primary</option>
                  <option>Secondary</option>
                  <option>Both</option>
                </select>
              </FormField>
            </div>
          </section>

          <section className="mt-6 border border-[#E5E5E5] bg-[#E5E5E5] p-6">
            <h2 className="font-semibold">What happens on creation?</h2>
            <p className="mt-2 text-sm text-[#666666]">
              On creation, the system will automatically:
            </p>

            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#999999] bg-white text-xs">
                  /
                </span>
                Create the tenant record
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#999999] bg-white text-xs">
                  /
                </span>
                Provision default branding
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#999999] bg-white text-xs">
                  /
                </span>
                Generate a School Admin invite email
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#999999] bg-white text-xs">
                  /
                </span>
                Set up default academic term structure
              </li>
            </ul>
          </section>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Link
              href="/platform/tenants"
              className="border border-[#999999] px-5 py-3 text-sm"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-[#333333] px-5 py-3 text-sm font-medium text-white"
            >
              Create Tenant
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
