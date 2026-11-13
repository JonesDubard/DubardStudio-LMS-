"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitDemoRequest, type DemoRequestState } from "@/app/(marketing)/contact/actions";
import { FormField } from "@/components/shared/FormField";
import {
  alertError,
  buttonPrimary,
  buttonSecondary,
  fieldControl,
  fieldError,
} from "@/lib/ui/styles";

const initialState: DemoRequestState = { status: "idle" };

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className={fieldError}>
      {message}
    </p>
  );
}

export function DemoRequestForm() {
  const [state, action, pending] = useActionState(submitDemoRequest, initialState);

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-lg border border-success-border bg-success-subtle px-4 py-5">
        <p className="text-base font-medium text-ink">
          Thank you! We will reach out within 24 hours.
        </p>
        <Link href="/" className={`${buttonSecondary} mt-6`}>
          Back to TerraLearn
        </Link>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.status === "error" && state.error ? (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      ) : null}

      <FormField id="schoolName" label="School name">
        <input
          id="schoolName"
          name="schoolName"
          type="text"
          required
          autoComplete="organization"
          maxLength={120}
          placeholder="Riverside Secondary"
          aria-invalid={Boolean(errors.schoolName)}
          aria-describedby={errors.schoolName ? "schoolName-error" : undefined}
          className={fieldControl}
        />
        <FieldError id="schoolName-error" message={errors.schoolName} />
      </FormField>

      <FormField id="administratorName" label="Administrator name">
        <input
          id="administratorName"
          name="administratorName"
          type="text"
          required
          autoComplete="name"
          maxLength={120}
          placeholder="Full name"
          aria-invalid={Boolean(errors.administratorName)}
          aria-describedby={
            errors.administratorName ? "administratorName-error" : undefined
          }
          className={fieldControl}
        />
        <FieldError id="administratorName-error" message={errors.administratorName} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="email" label="Email address">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            placeholder="you@school.edu"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={fieldControl}
          />
          <FieldError id="email-error" message={errors.email} />
        </FormField>

        <FormField id="phone" label="Phone number">
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
            placeholder="+231 886 000 000"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className={fieldControl}
          />
          <FieldError id="phone-error" message={errors.phone} />
        </FormField>
      </div>

      <FormField
        id="message"
        label="Message"
        helperText="Optional. Tell us about the classes or year you have in mind."
      >
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={1000}
          placeholder="What should we know about your school?"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? "message-error" : undefined}
          className={`${fieldControl} min-h-28 resize-y`}
        />
        <FieldError id="message-error" message={errors.message} />
      </FormField>

      <p className="text-sm leading-6 text-ink-secondary">
        We use these details only to reply about a possible pilot. This form does
        not create a school account.
      </p>

      <button type="submit" disabled={pending} className={`${buttonPrimary} w-full sm:w-auto`}>
        {pending ? "Sending..." : "Request a pilot"}
      </button>
    </form>
  );
}
