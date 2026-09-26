import type { Metadata } from "next";
import Link from "next/link";
import { EmailNotice } from "@/components/account/EmailNotice";
import { PasswordForm } from "@/components/account/PasswordForm";
import { PhoneForm } from "@/components/account/PhoneForm";
import { ProfileForm } from "@/components/account/ProfileForm";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { logoutEverywhere } from "@/lib/auth/actions";
import { STAFF_ROLES, requireUser } from "@/lib/auth/dal";
import { formatPhone } from "@/lib/auth/phone";

export const metadata: Metadata = { title: "Your account · Shahzad's Halal Food" };

function Panel({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-[26px] border border-line bg-card p-6 sm:p-8"
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <h2
        id={id ? `${id}-title` : undefined}
        className="mt-0 mb-5 font-display text-[30px] leading-none font-extrabold uppercase"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function AccountPage() {
  const user = await requireUser("/account");
  const firstName = user.name.split(" ")[0];
  const isStaff = STAFF_ROLES.includes(user.role);

  return (
    <>
      <SiteHeader />
      <main className="wrap pt-10 pb-24 sm:pt-16">
        <span className="eyebrow">Your account</span>
        <h1 className="mt-3 mb-10 font-display text-[clamp(48px,9vw,96px)] leading-[0.88] font-black tracking-normal uppercase">
          Hey,{" "}
          <em className="font-serif text-[0.8em] font-bold tracking-[-0.03em] text-brand normal-case italic">
            {firstName}.
          </em>
        </h1>

        {user.pendingEmail || !user.emailVerifiedAt ? (
          <div className="mb-8">
            <EmailNotice
              pendingEmail={user.pendingEmail}
              email={user.email}
              verified={Boolean(user.emailVerifiedAt)}
            />
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-5">
            <Panel title="Your details" id="details">
              <ProfileForm name={user.name} email={user.email} marketingOptIn={user.marketingOptIn} />
            </Panel>
            <Panel title="Phone number" id="phone">
              <PhoneForm current={formatPhone(user.phone)} />
            </Panel>
            <Panel title="Password" id="password">
              <PasswordForm />
            </Panel>
          </div>

          <div className="flex flex-col gap-5">
            <Panel title="Your orders" id="orders">
              <p className="text-muted">
                Online ordering opens soon. Once it does, your past orders — and a one-tap
                reorder — will live right here.
              </p>
            </Panel>

            {isStaff ? (
              <Panel title="Manager area" id="staff">
                <p className="mb-5 text-muted">
                  You&apos;re signed in as {user.role === "OWNER" ? "the owner" : "a manager"}.
                </p>
                <Link href="/admin" className="btn btn-red">
                  Open manager area
                </Link>
              </Panel>
            ) : null}

            <Panel title="Security" id="security">
              <p className="mb-5 text-muted">
                Lost a phone or used a shared computer? Sign out everywhere — every device will
                need your password again. Changing your password does this too.
              </p>
              <form action={logoutEverywhere}>
                <button type="submit" className="btn btn-ghost">
                  Log out of all devices
                </button>
              </form>
            </Panel>
          </div>
        </div>
      </main>
    </>
  );
}
