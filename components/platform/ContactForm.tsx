"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTenantContact } from "@/app/(platform)/platform/actions";
import {
    alertError,
    buttonPrimary,
    buttonSecondary,
    fieldControl,
    fieldLabel,
} from "@/lib/ui/styles";

export function ContactForm({
    tenantId,
    currentName,
    currentEmail,
}: {
    tenantId: string;
    currentName: string;
    currentEmail: string;
}) {
    const router = useRouter();
    const [name, setName] = useState(currentName);
    const [email, setEmail] = useState(currentEmail);
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [pending, setPending] = useState(false);

    const unchanged =
        name.trim() === currentName &&
        email.trim().toLowerCase() === currentEmail.toLowerCase();

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setSaved(false);
        setPending(true);
        const result = await updateTenantContact(tenantId, {
            contactName: name,
            contactEmail: email,
        });
        setPending(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setSaved(true);
        router.refresh();
    }

    return (
        <form onSubmit={(event) => void onSubmit(event)} noValidate>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <label htmlFor="contact-name" className={fieldLabel}>
                        Contact name
                    </label>
                    <input
                        id="contact-name"
                        name="contactName"
                        type="text"
                        autoComplete="name"
                        maxLength={200}
                        required
                        className={fieldControl}
                        value={name}
                        disabled={pending}
                        onChange={(event) => {
                            setName(event.target.value);
                            setSaved(false);
                        }}
                    />
                </div>
                <div>
                    <label htmlFor="contact-email" className={fieldLabel}>
                        Contact email
                    </label>
                    <input
                        id="contact-email"
                        name="contactEmail"
                        type="email"
                        autoComplete="email"
                        maxLength={320}
                        required
                        className={fieldControl}
                        value={email}
                        disabled={pending}
                        onChange={(event) => {
                            setEmail(event.target.value);
                            setSaved(false);
                        }}
                    />
                </div>
            </div>
            {error ? (
                <p role="alert" className={`${alertError} mt-4`}>
                    {error}
                </p>
            ) : null}
            {saved ? (
                <p role="status" className="mt-4 text-sm text-ink-secondary">
                    Contact details saved.
                </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                <button
                    type="button"
                    className={buttonSecondary}
                    disabled={pending || unchanged}
                    onClick={() => {
                        setName(currentName);
                        setEmail(currentEmail);
                        setError(null);
                    }}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className={buttonPrimary}
                    disabled={pending || unchanged}
                >
                    {pending ? "Saving..." : "Save Contact"}
                </button>
            </div>
        </form>
    );
}
