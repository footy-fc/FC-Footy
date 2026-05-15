"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

import { buildApprovalMessage } from "~/lib/qkms-approvals";
import { roleToSlot, slotToRole } from "~/lib/qkms-roles";
import { buildRegistrationMessage } from "~/lib/qkms-registration";
import type {
  ActionType,
  DashboardData,
  ExternalRole,
  RegistrationBundle,
  Role,
} from "~/lib/qkms-types";

const participantLabels: Record<ExternalRole, string> = {
  M: "Invitee 1",
  P: "Invitee 2",
};

const roleLabels: Record<Role, string> = {
  C: "Coordinator signer C",
  M: participantLabels.M,
  P: participantLabels.P,
};

const roleTone: Record<Role, string> = {
  C: "bg-slate-200 text-slate-900",
  M: "bg-emerald-200 text-emerald-950",
  P: "bg-amber-200 text-amber-950",
};

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? "Request failed.");
  }

  return json;
}

function formatRole(role: Role) {
  return roleLabels[role];
}

function formatRoleList(roles: Role[]) {
  return roles.map(formatRole).join(" + ");
}

export function QkmsShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.12),transparent_30%),linear-gradient(180deg,#f3f7fb,#dce7f2)] text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-slate-200 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            {eyebrow}
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                2-of-3 secp256k1 Sign/Verify key with coordinator-operated
                signer C and two external invitees. Public registration
                material only.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm font-medium">
              {[
                ["/qkms", "QKMS Home"],
                ["/qkms/sessions", "Sessions"],
                ["/", "App Home"],
                ["/register/1", "Register Invitee 1"],
                ["/register/2", "Register Invitee 2"],
                ["/sign-requests", "Sign requests"],
              ].map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-slate-700 transition hover:border-slate-300 hover:bg-white"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function RolePill({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] ${roleTone[role]}`}
    >
      {role === "C" ? "C" : roleLabels[role]}
    </span>
  );
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {copy}
    </div>
  );
}

function DataList({
  items,
  renderItem,
  emptyCopy,
}: {
  items: string[];
  renderItem: (item: string, index: number) => React.ReactNode;
  emptyCopy: string;
}) {
  if (items.length === 0) {
    return <EmptyState copy={emptyCopy} />;
  }

  return <div className="space-y-3">{items.map(renderItem)}</div>;
}

export function QkmsHomePage() {
  return (
    <QkmsShell
      eyebrow="QKMS MPC sidecar onboarding"
      title="Coordinator-led enrollment for a 2-of-3 registration ceremony"
    >
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Section title="Registration model">
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <p>
              C is the server-side coordinator and also contributes the
              coordinator-operated signer share. C invites two external
              invitees to join a 2-of-3 registration ceremony. Each invitee
              brings their own Ethereum wallet and submits wallet-based
              enrollment proof.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["M", "P"] as ExternalRole[]).map((role) => (
                <Link
                  key={role}
                  href={`/register/${roleToSlot(role)}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <RolePill role={role} />
                    <span className="text-sm font-semibold text-slate-900">
                      {participantLabels[role]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    Connect a wallet, sign the invite-scoped registration
                    message, and mark the participant ready without server-side
                    custody of secrets.
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </Section>
        <Section title="Policy overlay">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              The coordinator always remains explicit. Each registration
              ceremony enrolls coordinator signer C plus two external invitees
              into a 2-of-3 key.
            </p>
            <ul className="space-y-2">
              <li>C creates the registration ceremony and invite links.</li>
              <li>Only two invitees are enrolled per ceremony.</li>
              <li>Key creation waits until both invitees complete registration.</li>
            </ul>
          </div>
        </Section>
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Section title="Flow And Roles">
          <ol className="space-y-4 text-sm leading-6 text-slate-600">
            <li>
              <strong className="text-slate-900">1. C creates the registration ceremony.</strong>
              C chooses two invitees and creates a 2-of-3 ceremony from the
              registration ceremony page.
            </li>
            <li>
              <strong className="text-slate-900">2. C shares invite links.</strong>
              The app generates one invite link per selected invitee. Each link
              contains a one-time token scoped to that invitee slot.
            </li>
            <li>
              <strong className="text-slate-900">3. Invitees register themselves.</strong>
              Each invitee opens their link, connects their own wallet, signs
              the registration message, and submits it. The server verifies the
              signature and marks that invitee ready.
            </li>
            <li>
              <strong className="text-slate-900">4. C creates the key.</strong>
              After both invitees are ready, C creates the 2-of-3 key. In this
              model, C is one signer share and the two invitees are the other
              two shares.
            </li>
            <li>
              <strong className="text-slate-900">5. Signing happens later.</strong>
              Approvals can be collected asynchronously, but the actual MPC
              signing step still requires the needed live quorum.
            </li>
          </ol>
        </Section>
        <Section title="Who Can Initiate">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              <strong className="text-slate-900">Only C can initiate the registration ceremony.</strong>
              That is enforced server-side in the current store logic.
            </p>
            <p>
              Invitees do not start ceremonies. They only complete their own
              registration after receiving an invite link from C.
            </p>
            <p>
              After registrations are collected, C is also the actor that
              creates the 2-of-3 key from that ceremony in the current app
              model.
            </p>
          </div>
        </Section>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Section title="Why Admin Exists">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              The admin page is C&apos;s dashboard. It exists so C can inspect
              invite state, registration readiness, ceremonies, keys, sign
              requests, and the audit trail from one place.
            </p>
            <p>
              It is not meant to be an invitee page. It is the coordinator
              control plane.
            </p>
          </div>
        </Section>
        <Section title="Why Invite Exists">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              The invite page is a small handoff page. It exists so a raw
              invite link can resolve to the correct invitee registration route
              without making the invitee understand the slot mapping.
            </p>
            <p>
              In a more polished version, invite handling could be folded
              directly into the registration route and this page could disappear.
            </p>
          </div>
        </Section>
      </section>
    </QkmsShell>
  );
}

export function QkmsSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<DashboardData["ceremonies"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    try {
      const response = await apiFetch<{ sessions: DashboardData["ceremonies"] }>(
        "/api/sessions",
      );
      setSessions(response.sessions);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createSession = async () => {
    setCreating(true);
    try {
      const response = await apiFetch<{
        session: DashboardData["ceremonies"][number];
      }>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({}),
      });
      router.push(`/qkms/sessions/${response.session.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Create failed.");
      setCreating(false);
    }
  };

  return (
    <QkmsShell eyebrow="Sessions" title="Create a host session and send one link to each invitee">
      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <Section title="New session">
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <p>
              This flow is intentionally simple. C creates one host session,
              sends the Invitee 1 link to one person and the Invitee 2 link to
              another person, then waits for both to sign in.
            </p>
            <button
              type="button"
              onClick={() => void createSession()}
              disabled={creating}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {creating ? "Creating..." : "Create session"}
            </button>
            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </Section>
        <Section
          title="Existing sessions"
          actions={
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Refresh
            </button>
          }
        >
          <div className="space-y-3">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/qkms/sessions/${session.id}`}
                className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition hover:bg-white"
              >
                <div className="font-semibold text-slate-900">{session.status}</div>
                <div className="mt-1">
                  {formatRoleList(session.activeParticipants)}
                </div>
                <div className="mt-1 text-slate-500">
                  {new Date(session.createdAt).toLocaleString()}
                </div>
              </Link>
            ))}
            {sessions.length === 0 ? <EmptyState copy="No sessions yet." /> : null}
          </div>
        </Section>
      </section>
    </QkmsShell>
  );
}

export function QkmsSessionPage({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<{
    session: DashboardData["ceremonies"][number];
    participants: DashboardData["participants"];
    keys: DashboardData["keys"];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch<{
        session: DashboardData["ceremonies"][number];
        participants: DashboardData["participants"];
        keys: DashboardData["keys"];
      }>(`/api/sessions/${sessionId}`);
      setData(response);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed.");
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void load();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [load]);

  const start = async () => {
    setStarting(true);
    try {
      await apiFetch(`/api/sessions/${sessionId}/start`, { method: "POST" });
      await load();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Start failed.");
    } finally {
      setStarting(false);
    }
  };

  const session = data?.session;
  const readyParticipants =
    session?.selectedParticipants.filter((role) =>
      data?.participants.some(
        (participant) => participant.role === role && participant.status === "ready",
      ),
    ) ?? [];
  const canStart = readyParticipants.length === 2 && session?.status !== "key-created";
  const bothReady = readyParticipants.length === 2;

  return (
    <QkmsShell eyebrow="Host Session" title="Host the ceremony like a meeting lobby">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Section title="Host controls">
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Share the first link with Invitee 1 and the second link with
              Invitee 2. Once both have signed in, C creates the 2-of-3 key.
            </p>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                What C Does Next
              </div>
              <div className="mt-2 text-sm text-slate-700">
                {!bothReady && session?.status !== "key-created"
                  ? "Wait for both invitees to sign in."
                  : session?.status === "key-created"
                    ? "The 2-of-3 key has been created for this session."
                    : "Both invitees are signed in. C should now create the 2-of-3 key."}
              </div>
            </div>
            {(session?.joinLinks ?? []).map((link) => (
              <div key={link.role} className="rounded-2xl bg-slate-950 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {participantLabels[link.role]} link
                </div>
                <div className="mt-2 break-all font-mono text-xs text-slate-100">
                  {link.inviteUrl}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => void start()}
              disabled={!canStart || starting}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {starting
                ? "Creating key..."
                : session?.status === "key-created"
                  ? "Key created"
                  : "Create 2-of-3 key"}
            </button>
            {!canStart && session?.status !== "key-created" ? (
              <div className="text-sm text-amber-700">
                Both invitees must sign in before C can create the 2-of-3 key.
              </div>
            ) : null}
            {session?.status === "key-created" ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                C has completed the ceremony and the 2-of-3 key is now created.
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </Section>
        <Section title="Attendance">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <RolePill role="C" />
                <span className="text-sm font-semibold text-slate-900">
                  Host is present
                </span>
              </div>
              <div className="text-sm text-slate-600">
                C is the coordinator-operated signer and session host.
              </div>
            </div>
            {(session?.selectedParticipants ?? []).map((role) => {
              const participant = data?.participants.find((entry) => entry.role === role);
              const joined = participant?.status === "ready";
              return (
                <div key={role} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                      {participantLabels[role]}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {joined ? "Signed in" : "Waiting"}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {joined
                      ? `${participant?.displayName} joined with ${participant?.walletAddress}`
                      : "This invitee has not signed in yet."}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </section>
    </QkmsShell>
  );
}

export function QkmsJoinPage({ token }: { token: string }) {
  const [inviteInfo, setInviteInfo] = useState<{
    role: ExternalRole;
    ceremonyId: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetch<{
          invite: { role: ExternalRole };
          ceremonyId: string | null;
        }>(`/api/invites/resolve?token=${encodeURIComponent(token)}`);
        setInviteInfo({
          role: response.invite.role,
          ceremonyId: response.ceremonyId,
        });
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Invite invalid.");
      }
    };

    void load();
  }, [token]);

  if (error) {
    return (
      <QkmsShell eyebrow="Join Session" title="Invite link invalid">
        <Section title="Join failed">
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        </Section>
      </QkmsShell>
    );
  }

  if (!inviteInfo) {
    return (
      <QkmsShell eyebrow="Join Session" title="Loading invite">
        <Section title="Resolving link">
          <div className="text-sm text-slate-600">Checking your invite link...</div>
        </Section>
      </QkmsShell>
    );
  }

  return (
    <QkmsShell eyebrow="Join Session" title={`You are invited to join as ${participantLabels[inviteInfo.role]}`}>
      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Section title="Sign in">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              This works like joining a meeting. Connect your wallet and sign
              in as {participantLabels[inviteInfo.role]}.
            </p>
            <Link
              href={`/register/${roleToSlot(inviteInfo.role)}?token=${encodeURIComponent(token)}`}
              className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Continue to sign in
            </Link>
          </div>
        </Section>
        <Section title="What happens next">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>
              After you sign in, the host sees that you are present. Once both
              invitees are in, C starts the ceremony.
            </p>
            {inviteInfo.ceremonyId ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Session id: <span className="font-mono">{inviteInfo.ceremonyId}</span>
              </div>
            ) : null}
          </div>
        </Section>
      </section>
    </QkmsShell>
  );
}

export function QkmsInvitePage() {
  const [token, setToken] = useState("");
  const [role, setRole] = useState<ExternalRole>("M");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    const roleParam = params.get("role");
    if (tokenParam) setToken(tokenParam);
    if (roleParam) {
      const parsedRole = slotToRole(roleParam);
      if (parsedRole) {
        setRole(parsedRole);
      }
    }
  }, []);

  return (
    <QkmsShell eyebrow="Invite handoff" title="Open a one-time invite and continue to invitee registration">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Section title="Invite status">
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              This page accepts a one-time invite token and routes the
              invitee to the correct registration flow.
            </p>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                Invite token
              </div>
              <div className="mt-2 break-all font-mono text-xs text-slate-900">
                {token || "No token in query string yet."}
              </div>
            </div>
          </div>
        </Section>
        <Section title="Continue">
          <Link
            href={`/register/${roleToSlot(role)}${token ? `?token=${encodeURIComponent(token)}` : ""}`}
            className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Continue to {participantLabels[role]} registration
          </Link>
        </Section>
      </section>
    </QkmsShell>
  );
}

export function QkmsRegistrationPage({ role }: { role: ExternalRole }) {
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const walletAddress = activeWallet?.address ?? "";
  const [inviteToken, setInviteToken] = useState("");
  const [displayName, setDisplayName] = useState(`${participantLabels[role]} wallet`);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const canSubmit = Boolean(activeWallet && inviteToken && displayName.trim());
  const disabledReason = !activeWallet
    ? "Connect a wallet to continue."
    : !inviteToken
      ? "Invite token is required."
      : !displayName.trim()
        ? "Display name is required."
        : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setInviteToken(token);
    }
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (!activeWallet) {
        throw new Error("Connect a wallet first.");
      }

      const registrationMessage = buildRegistrationMessage(role, inviteToken);
      const provider = await activeWallet.getEthereumProvider();
      const signature = (await provider.request({
        method: "personal_sign",
        params: [registrationMessage, walletAddress],
      })) as string;

      setSignaturePreview(signature);
      const response = await apiFetch<{ participant: { displayName: string } }>(
        `/api/register/${role.toLowerCase()}`,
        {
          method: "POST",
          body: JSON.stringify({
            inviteToken,
            displayName,
            role,
            walletAddress,
            registrationMessage,
            registrationSignature: signature,
            source:
              activeWallet.walletClientType === "privy"
                ? "embedded-wallet"
                : "external-wallet",
          } satisfies RegistrationBundle),
        },
      );
      setMessage(`${response.participant.displayName} registered successfully.`);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Registration failed.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <QkmsShell
      eyebrow="Invitee registration"
      title={`Register ${participantLabels[role]} wallet identity`}
    >
      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <Section title="Wallet registration">
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Display name</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder={`${role} sidecar`}
                  required
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Invite token</span>
                <input
                  value={inviteToken}
                  onChange={(event) => setInviteToken(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs outline-none transition focus:border-slate-400 focus:bg-white"
                  required
                />
              </label>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">Connected wallet</div>
              <div className="mt-2 font-mono text-xs text-slate-600">
                {walletAddress || "No wallet connected yet."}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">
                Registration message
              </div>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-6 text-slate-600">
                {inviteToken
                  ? buildRegistrationMessage(role, inviteToken)
                  : "Add an invite token to see the message that will be signed."}
              </pre>
            </div>
            <div className="flex flex-wrap gap-3">
              {!authenticated || !activeWallet ? (
                <button
                  type="button"
                  onClick={() => login()}
                  className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
                >
                  Connect wallet
                </button>
              ) : null}
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-100"
              >
                {submitting ? "Signing and submitting..." : "Sign and register"}
              </button>
            </div>
            {disabledReason ? (
              <div className="text-sm text-amber-700">{disabledReason}</div>
            ) : null}
            {signaturePreview ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <div className="text-sm font-medium text-slate-900">
                  Latest registration signature
                </div>
                <div className="mt-2 break-all font-mono text-xs text-slate-600">
                  {signaturePreview}
                </div>
              </div>
            ) : null}
            {message ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </form>
        </Section>
        <Section title="How this works">
          <div className="space-y-3 text-sm leading-6 text-slate-600">
            <p>Your wallet stays in control of the private key.</p>
            <p>
              This flow uses the wallet address as the invitee identity and
              a signed message as proof of control.
            </p>
            <p>
              The server verifies the signature and stores only role, wallet
              address, signed message, and registration status.
            </p>
          </div>
        </Section>
      </section>
    </QkmsShell>
  );
}

export function QkmsAdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<ExternalRole>("M");
  const [inviteHours, setInviteHours] = useState(24);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const load = async () => {
    try {
      const response = await apiFetch<DashboardData>("/api/participants");
      setData(response);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Load failed.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const createInvite = async () => {
    setCreatingInvite(true);
    try {
      const response = await apiFetch<{ inviteUrl: string }>("/api/invites", {
        method: "POST",
        body: JSON.stringify({ role: inviteRole, expiresInHours: inviteHours }),
      });
      setInviteResult(response.inviteUrl);
      await load();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Invite failed.");
    } finally {
      setCreatingInvite(false);
    }
  };

  const resetDemoState = async () => {
    const confirmed = window.confirm(
      "Reset the QKMS demo state? This clears invites, registrations, ceremonies, keys, and sign requests.",
    );
    if (!confirmed) {
      return;
    }

    setResetting(true);
    try {
      await apiFetch("/api/qkms/reset", {
        method: "POST",
      });
      setInviteResult(null);
      setError(null);
      await load();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Reset failed.");
    } finally {
      setResetting(false);
    }
  };

  const participantCards = useMemo(
    () =>
      (["M", "P"] as ExternalRole[]).map((role) => {
        const participant = data?.participants.find((entry) => entry.role === role);
        return (
          <div
            key={role}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <RolePill role={role} />
              <span className="text-sm font-semibold text-slate-900">
                {participantLabels[role]}
              </span>
            </div>
            {participant ? (
                <div className="space-y-2 text-sm text-slate-600">
                <div>{participant.displayName}</div>
                <div>Status: {participant.status}</div>
                <div className="font-mono text-xs text-slate-500">
                  {participant.walletAddress}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Not registered yet.</div>
            )}
          </div>
        );
      }),
    [data?.participants],
  );

  return (
    <QkmsShell eyebrow="Admin console" title="Coordinator dashboard for invites, readiness, and audit">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Section
          title="Create invite"
          actions={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={() => void resetDemoState()}
                disabled={resetting}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetting ? "Resetting..." : "Reset demo state"}
              </button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto]">
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Invitee slot</span>
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value as ExternalRole)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
              >
                <option value="M">{participantLabels.M}</option>
                <option value="P">{participantLabels.P}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Invite expires in hours</span>
              <input
                type="number"
                min={1}
                max={72}
                value={inviteHours}
                onChange={(event) => setInviteHours(Number(event.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
              />
            </label>
            <button
              type="button"
              onClick={() => void createInvite()}
              disabled={creatingInvite}
              className="self-end rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {creatingInvite ? "Creating..." : "Create"}
            </button>
          </div>
          {inviteResult ? (
            <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 font-mono text-xs text-slate-100">
              {inviteResult}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            This demo uses an in-memory store. If earlier attempts leave stale
            invites or ceremonies behind, use <strong className="text-slate-900">Reset demo state</strong> to wipe everything and start over.
          </div>
        </Section>
        <Section title="Invitee readiness">
          <div className="grid gap-3 sm:grid-cols-2">{participantCards}</div>
        </Section>
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        <Section title="Pending invites">
          <DataList
            items={(data?.invites ?? []).map((invite) => invite.id)}
            emptyCopy="No invites yet."
            renderItem={(id) => {
              const invite = data?.invites.find((entry) => entry.id === id);
              if (!invite) return null;
              return (
                <div key={id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                      {participantLabels[invite.role]}
                    </span>
                    <span>Status: {invite.status}</span>
                  </div>
                  <div>Expires: {new Date(invite.expiresAt).toLocaleString()}</div>
                </div>
              );
            }}
          />
        </Section>
        <Section title="Ceremonies">
          <DataList
            items={(data?.ceremonies ?? []).map((ceremony) => ceremony.id)}
            emptyCopy="No ceremonies started."
            renderItem={(id) => {
              const ceremony = data?.ceremonies.find((entry) => entry.id === id);
              if (!ceremony) return null;
              return (
                <div key={id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">{ceremony.status}</div>
                  <div>Participants: {formatRoleList(ceremony.activeParticipants)}</div>
                  <div>Key: {ceremony.keyId ?? "Not created"}</div>
                </div>
              );
            }}
          />
        </Section>
        <Section title="Signing requests">
          <DataList
            items={(data?.signRequests ?? []).map((request) => request.id)}
            emptyCopy="No sign requests created."
            renderItem={(id) => {
              const request = data?.signRequests.find((entry) => entry.id === id);
              if (!request) return null;
              return (
                <div key={id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">{request.title}</div>
                  <div>{request.actionType}</div>
                  <div>Required: {formatRoleList(request.requiredParticipants)}</div>
                  <div>Status: {request.status}</div>
                </div>
              );
            }}
          />
        </Section>
      </section>
      <Section title="Audit trail">
        <div className="space-y-3">
          {(data?.auditEvents ?? []).map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
            >
              <div className="font-medium text-slate-900">{event.message}</div>
              <div className="text-xs text-slate-500">
                {event.type} • {new Date(event.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {!data?.auditEvents.length ? <EmptyState copy="No audit events yet." /> : null}
        </div>
      </Section>
    </QkmsShell>
  );
}

export function QkmsCeremoniesPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<
    Array<{ role: ExternalRole; inviteUrl: string }>
  >([]);
  const [creatingCeremony, setCreatingCeremony] = useState(false);
  const [creatingKeyForId, setCreatingKeyForId] = useState<string | null>(null);

  const load = async () => {
    const response = await apiFetch<DashboardData>("/api/participants");
    setData(response);
  };

  useEffect(() => {
    void load();
  }, []);

  const start = async () => {
    setCreatingCeremony(true);
    try {
      const response = await apiFetch<{
        inviteLinks: Array<{ role: ExternalRole; inviteUrl: string }>;
      }>("/api/ceremonies", {
        method: "POST",
        body: JSON.stringify({
          requestedByRole: "C",
          selectedParticipants: ["M", "P"],
        }),
      });
      setInviteLinks(response.inviteLinks);
      setError(null);
      await load();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Ceremony failed.");
    } finally {
      setCreatingCeremony(false);
    }
  };

  const createKey = async (id: string) => {
    setCreatingKeyForId(id);
    try {
      await apiFetch(`/api/ceremonies/${id}/create-key`, { method: "POST" });
      setError(null);
      await load();
    } catch (createKeyError) {
      setError(
        createKeyError instanceof Error ? createKeyError.message : "Key creation failed.",
      );
    } finally {
      setCreatingKeyForId(null);
    }
  };

  return (
    <QkmsShell eyebrow="Registration ceremony" title="C invites two external invitees into a 2-of-3 registration ceremony">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Section title="Create registration ceremony">
          <div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            Only C can start this ceremony. C invites both external invitees, shares the
            invite links, waits for both registrations, and then creates the
            2-of-3 key with C as one signer share.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
              {participantLabels.M}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">
              {participantLabels.P}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void start()}
            disabled={creatingCeremony}
            className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {creatingCeremony ? "Creating ceremony..." : "Create ceremony"}
          </button>
          {inviteLinks.length > 0 ? (
            <div className="mt-4 space-y-3">
              {inviteLinks.map((inviteLink) => (
                <div key={inviteLink.role} className="rounded-2xl bg-slate-950 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {participantLabels[inviteLink.role]} invite
                  </div>
                  <div className="mt-2 break-all font-mono text-xs text-slate-100">
                    {inviteLink.inviteUrl}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </Section>
        <Section title="Ceremony status">
          <div className="space-y-3">
            {(data?.ceremonies ?? []).map((ceremony) => {
              const selectedParticipants = ceremony.selectedParticipants ?? [];
              const readyParticipants = selectedParticipants.filter((role) =>
                data?.participants.some(
                  (participant) =>
                    participant.role === role && participant.status === "ready",
                ),
              );
              const waitingParticipants = selectedParticipants.filter(
                (role) => !readyParticipants.includes(role),
              );
              return (
                <div key={ceremony.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <RolePill role="C" />
                    {selectedParticipants.map((role) => (
                      <span
                        key={`${ceremony.id}-${role}`}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700"
                      >
                        {participantLabels[role]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    Status: {ceremony.status}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Ready:{" "}
                    {readyParticipants.length > 0
                      ? readyParticipants.map((role) => participantLabels[role]).join(", ")
                      : "No invitees registered yet"}
                  </div>
                  {waitingParticipants.length > 0 ? (
                    <div className="mt-1 text-sm text-slate-600">
                      Waiting on:{" "}
                      {waitingParticipants.map((role) => participantLabels[role]).join(", ")}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void createKey(ceremony.id)}
                      disabled={creatingKeyForId === ceremony.id}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {creatingKeyForId === ceremony.id
                        ? "Creating key..."
                        : "Create 2-of-3 key"}
                    </button>
                  </div>
                </div>
              );
            })}
            {!data?.ceremonies.length ? (
              <EmptyState copy="No ceremonies have been started." />
            ) : null}
          </div>
        </Section>
      </section>
    </QkmsShell>
  );
}

export function QkmsSignRequestsPage() {
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const walletAddress = activeWallet?.address ?? "";
  const [data, setData] = useState<DashboardData | null>(null);
  const [title, setTitle] = useState("Customer payout");
  const [actionType, setActionType] = useState<ActionType>("security");
  const [payloadHash, setPayloadHash] = useState("0xfeedface");
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);

  const load = async () => {
    const response = await apiFetch<DashboardData>("/api/participants");
    setData(response);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setCreatingRequest(true);
    setStatusMessage(null);
    try {
      const keyId = data?.keys[0]?.id;
      if (!keyId) {
        throw new Error("Create a QKMS key first.");
      }
      await apiFetch("/api/sign-requests", {
        method: "POST",
        body: JSON.stringify({ title, actionType, payloadHash, keyId }),
      });
      setError(null);
      setStatusMessage("Sign request created.");
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Create failed.");
    } finally {
      setCreatingRequest(false);
    }
  };

  const approve = async (id: string, role: Role) => {
    setApproving(`${id}:${role}`);
    setStatusMessage(null);
    try {
      if (!activeWallet) {
        throw new Error("Connect the approver wallet first.");
      }

      const request = (data?.signRequests ?? []).find((entry) => entry.id === id);
      if (!request) {
        throw new Error("Sign request not found.");
      }

      const approvalMessage = buildApprovalMessage(request, role);
      const provider = await activeWallet.getEthereumProvider();
      const approvalSignature = (await provider.request({
        method: "personal_sign",
        params: [approvalMessage, walletAddress],
      })) as string;

      await apiFetch(`/api/sign-requests/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          role,
          walletAddress,
          approvalMessage,
          approvalSignature,
        }),
      });
      setError(null);
      setStatusMessage(`${formatRole(role)} approval recorded.`);
      await load();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Approve failed.");
    } finally {
      setApproving(null);
    }
  };

  const process = async (id: string, participants: Role[]) => {
    setProcessing(id);
    setStatusMessage(null);
    try {
      await apiFetch(`/api/sign-requests/${id}/process`, {
        method: "POST",
        body: JSON.stringify({ liveParticipants: participants }),
      });
      setError(null);
      setStatusMessage("Live signing processed.");
      await load();
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Process failed.");
    } finally {
      setProcessing(null);
    }
  };

  const revoke = async (id: string) => {
    setRevoking(id);
    setStatusMessage(null);
    try {
      await apiFetch(`/api/sign-requests/${id}/revoke`, {
        method: "POST",
      });
      setError(null);
      setStatusMessage("Sign request revoked by C.");
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "Revoke failed.");
    } finally {
      setRevoking(null);
    }
  };

  const archive = async (id: string) => {
    setArchiving(id);
    setStatusMessage(null);
    try {
      await apiFetch(`/api/sign-requests/${id}/archive`, {
        method: "POST",
      });
      setError(null);
      setStatusMessage("Sign request archived.");
      await load();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Archive failed.");
    } finally {
      setArchiving(null);
    }
  };

  const activeRequests = (data?.signRequests ?? []).filter(
    (request) => request.status !== "archived",
  );
  const archivedRequests = (data?.signRequests ?? []).filter(
    (request) => request.status === "archived",
  );

  return (
    <QkmsShell eyebrow="Signing" title="Collect approvals asynchronously, then process live MPC signing">
      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Section title="Create sign request">
          <div className="space-y-4">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
            <select
              value={actionType}
              onChange={(event) => setActionType(event.target.value as ActionType)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            >
              <option value="security">Security action (C + {participantLabels.M})</option>
              <option value="admin">Admin action (C + {participantLabels.P})</option>
            </select>
            <textarea
              value={payloadHash}
              onChange={(event) => setPayloadHash(event.target.value)}
              className="min-h-24 w-full max-w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs break-all whitespace-pre-wrap"
            />
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Connected approval wallet:{" "}
              <span className="font-mono text-xs text-slate-800">
                {walletAddress || "No wallet connected yet."}
              </span>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              C manages the request lifecycle here. C creates the request,
              collects approvals from the required pair, runs live signing,
              then can revoke or archive the request history.
            </div>
            {!activeWallet ? (
              <button
                type="button"
                onClick={() => void login()}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                {authenticated ? "Connect wallet" : "Sign in and connect wallet"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void create()}
              disabled={creatingRequest}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {creatingRequest ? "Creating sign request..." : "Create sign request"}
            </button>
            {statusMessage ? (
              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {statusMessage}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </Section>
        <Section title="Active request queue">
          <div className="space-y-3">
            {activeRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">{request.title}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {request.actionType} • required {formatRoleList(request.requiredParticipants)}
                </div>
                <div className="mt-1 max-w-full break-all whitespace-pre-wrap font-mono text-xs text-slate-500">
                  {request.payloadHash}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {request.requiredParticipants.map((role) => (
                    (() => {
                      const roleApprovalKey = `${request.id}:${role}`;
                      const alreadyApproved = request.approvals.some(
                        (approval) => approval.role === role,
                      );

                      return (
                        <button
                          key={roleApprovalKey}
                          type="button"
                          onClick={() => void approve(request.id, role)}
                          disabled={
                            alreadyApproved ||
                            approving === roleApprovalKey ||
                            request.status === "completed" ||
                            request.status === "revoked" ||
                            request.status === "processing"
                          }
                          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                        >
                          {approving === roleApprovalKey
                            ? `Recording ${formatRole(role)}...`
                            : alreadyApproved
                              ? `${formatRole(role)} approved`
                              : `Approve as ${formatRole(role)}`}
                        </button>
                      );
                    })()
                  ))}
                  <button
                    type="button"
                    onClick={() => void process(request.id, request.requiredParticipants)}
                    disabled={
                      processing === request.id ||
                      request.status !== "approved"
                    }
                    className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {processing === request.id ? "Processing..." : "C starts live signing"}
                  </button>
                  {(request.status === "pending-approvals" ||
                    request.status === "approved") ? (
                    <button
                      type="button"
                      onClick={() => void revoke(request.id)}
                      disabled={revoking === request.id}
                      className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:bg-red-50 disabled:text-red-300"
                    >
                      {revoking === request.id ? "Revoking..." : "C revokes request"}
                    </button>
                  ) : null}
                  {(request.status === "completed" ||
                    request.status === "revoked" ||
                    request.status === "rejected") ? (
                    <button
                      type="button"
                      onClick={() => void archive(request.id)}
                      disabled={archiving === request.id}
                      className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {archiving === request.id ? "Archiving..." : "Archive request"}
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  <div>Status: {request.status}</div>
                  <div>
                    C remains the operator here. Only C should revoke the
                    request or start the live MPC signing step after approvals
                    are in.
                  </div>
                  <div className="mt-2 font-mono text-xs text-slate-500">
                    Approval buttons now require a wallet signature from the
                    connected approver wallet.
                  </div>
                </div>
                {request.resultSignature ? (
                  <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 font-mono text-xs text-slate-700">
                    {request.resultSignature}
                  </div>
                ) : null}
                {request.resultSummary ? (
                  <div className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {request.resultSummary}
                    {request.providerRequestId ? (
                      <div className="mt-1 font-mono text-xs text-slate-500">
                        Provider request id: {request.providerRequestId}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {!activeRequests.length ? (
              <EmptyState copy="No sign requests yet." />
            ) : null}
          </div>
        </Section>
      </section>
      <Section title="Archived request history">
        <div className="space-y-3">
          {archivedRequests.map((request) => (
            <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">{request.title}</div>
              <div className="mt-1 text-sm text-slate-600">
                {request.actionType} • {request.status}
              </div>
              <div className="mt-1 max-w-full break-all whitespace-pre-wrap font-mono text-xs text-slate-500">
                {request.payloadHash}
              </div>
            </div>
          ))}
          {!archivedRequests.length ? (
            <EmptyState copy="No archived sign requests yet." />
          ) : null}
        </div>
      </Section>
    </QkmsShell>
  );
}
