import React from "react";
import { useRouter } from "next/navigation";
import {
  FARCASTER_BIO_MAX_BYTES,
  FARCASTER_DISPLAY_NAME_MAX_BYTES,
  FARCASTER_ENS_USERNAME_MAX_LENGTH,
  validateBioInput,
  validateDisplayNameInput,
  validateUsernameInput,
} from "~/lib/farcaster/profileValidation";
import { useFootyFarcaster } from "~/lib/farcaster/useFootyFarcaster";
import ProfileIdentityCard from "./ProfileIdentityCard";
import ProfileCastFeed from "./ProfileCastFeed";

interface ProfileTabProps {
  viewerFid?: number;
}

type EditableProfileField = "displayName" | "username" | "bio" | null;

type OnboardingStepProps = {
  label: string;
  description: string;
  status: "done" | "current" | "pending";
};

const OnboardingStep: React.FC<OnboardingStepProps> = ({ label, description, status }) => (
  <div
    className={`rounded-[18px] border px-4 py-3 ${
      status === "done"
        ? "border-limeGreenOpacity/35 bg-limeGreenOpacity/10"
        : status === "current"
          ? "border-deepPink/35 bg-deepPink/10"
          : "border-limeGreenOpacity/20 bg-darkPurple/60"
    }`}
  >
    <div className="mb-1 flex items-center justify-between gap-3">
      <div className="text-sm font-semibold text-notWhite">{label}</div>
      <div
        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
          status === "done"
            ? "bg-limeGreenOpacity/20 text-limeGreen"
            : status === "current"
              ? "bg-deepPink/20 text-notWhite"
              : "bg-darkPurple text-lightPurple"
        }`}
      >
        {status === "done" ? "Done" : status === "current" ? "Now" : "Soon"}
      </div>
    </div>
    <div className="text-sm leading-6 text-lightPurple">{description}</div>
  </div>
);

const ProfileTab: React.FC<ProfileTabProps> = ({ viewerFid }) => {
  const router = useRouter();
  const {
    hasFootySession,
    hasEmail,
    hasWallet,
    hasFarcaster,
    isHydratingAccount,
    runtime,
    onboardingState,
    username,
    displayName,
    bio,
    isProvisioningFarcasterAccount,
    onboardingError,
    beginLogin,
    beginCreateFarcasterAccount,
    advanceOnboarding,
    updateManagedProfile,
    claimManagedUsername,
  } = useFootyFarcaster();
  const [activeEditor, setActiveEditor] = React.useState<EditableProfileField>(null);
  const [editorName, setEditorName] = React.useState("");
  const [editorUsername, setEditorUsername] = React.useState("");
  const [editorBio, setEditorBio] = React.useState("");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [profileSaveError, setProfileSaveError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const isStandaloneFtue = runtime !== "miniapp" && !hasFarcaster;

  React.useEffect(() => {
    setEditorName(displayName || "");
  }, [displayName]);

  React.useEffect(() => {
    setEditorUsername(username || "");
  }, [username]);

  React.useEffect(() => {
    setEditorBio(bio || "");
  }, [bio]);

  if (runtime !== "miniapp" && isHydratingAccount) {
    return (
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Profile</div>
        <h2 className="app-title mb-2">Loading your Footy identity</h2>
        <p className="app-copy mb-4">
          We are restoring your Farcaster account and signer before showing profile actions.
        </p>

        <div className="overflow-hidden rounded-[24px] border border-limeGreenOpacity/20 bg-[radial-gradient(circle_at_top_left,rgba(120,255,85,0.08),transparent_34%),linear-gradient(145deg,rgba(4,8,24,0.98),rgba(24,18,44,0.96))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="animate-pulse">
            <div className="mb-4 h-5 w-32 rounded-full bg-darkPurple/80" />
            <div className="mb-3 h-10 w-56 rounded-[16px] bg-darkPurple/80" />
            <div className="mb-6 h-6 w-40 rounded-full bg-darkPurple/70" />
            <div className="grid gap-4 md:grid-cols-[132px_minmax(0,1fr)] md:items-start">
              <div className="mx-auto h-[120px] w-[120px] rounded-full bg-darkPurple/80 md:mx-0" />
              <div className="space-y-3">
                <div className="h-5 w-28 rounded-full bg-darkPurple/70" />
                <div className="h-20 rounded-[18px] bg-darkPurple/70" />
                <div className="h-20 rounded-[18px] bg-darkPurple/60" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isStandaloneFtue) {
    const currentPhase = !hasFootySession
      ? "account"
      : !hasEmail
        ? "email"
        : !hasWallet
          ? "wallet"
          : isProvisioningFarcasterAccount
            ? "farcaster"
            : "farcaster";

    const primaryLabel = !hasFootySession
      ? "Continue with email"
      : !hasEmail
        ? "Add your email"
        : !hasWallet
          ? "Create your wallet"
          : isProvisioningFarcasterAccount
            ? "Creating your Farcaster account"
            : "Create your Farcaster account";

    const handlePrimaryAction = async () => {
      if (!hasFootySession) {
        await beginCreateFarcasterAccount();
        return;
      }

      if (onboardingState === "needs_email" || onboardingState === "needs_wallet") {
        await advanceOnboarding();
        return;
      }

      await beginCreateFarcasterAccount();
    };

    return (
      <div className="mb-4">
        <div className="app-eyebrow mb-2">Profile</div>
        <h2 className="app-title mb-2">Create your Farcaster account for Footy</h2>
        <p className="app-copy mb-4">
          Finish setup here inside Footy. We will verify your email, create your embedded wallet, register your Farcaster account, fund storage, and activate your Footy signer.
        </p>

        <div className="mb-4 overflow-hidden rounded-[24px] border border-deepPink/30 bg-[radial-gradient(circle_at_top_left,rgba(255,0,102,0.14),transparent_34%),linear-gradient(145deg,rgba(4,8,24,0.98),rgba(24,18,44,0.96))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="app-eyebrow mb-2">Footy Setup</div>
              <h3 className="text-[24px] font-semibold leading-[1.02] text-notWhite sm:text-[28px]">Own your fan identity</h3>
            </div>
            <div className="rounded-full bg-deepPink/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-notWhite">
              {isProvisioningFarcasterAccount ? "Provisioning" : "Required"}
            </div>
          </div>

          <div className="grid gap-3">
            <OnboardingStep
              label="1. Sign in to Footy"
              description="Use email so Footy can create and recover your account without sending you out to a Farcaster app."
              status={!hasFootySession ? "current" : "done"}
            />
            <OnboardingStep
              label="2. Create your embedded wallet"
              description="This wallet becomes your Farcaster custody address. Footy uses it to create your identity on Optimism."
              status={hasWallet ? "done" : currentPhase === "wallet" || currentPhase === "email" ? "current" : "pending"}
            />
            <OnboardingStep
              label="3. Register your Farcaster account"
              description="Footy pays the Bundler transaction, rents storage, and provisions your Footy signer so you can use the app immediately."
              status={isProvisioningFarcasterAccount ? "current" : "pending"}
            />
          </div>

          <button
            type="button"
            onClick={() => void handlePrimaryAction()}
            disabled={isProvisioningFarcasterAccount}
            className="mt-4 w-full rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85 disabled:opacity-70"
          >
            {primaryLabel}
          </button>

          {onboardingError ? (
            <div className="mt-4 rounded-[18px] border border-[#fea282]/35 bg-[#fea282]/10 px-4 py-3 text-sm leading-6 text-[#ffd7ca]">
              {onboardingError}
            </div>
          ) : null}
        </div>

        <div className="rounded-[22px] border border-limeGreenOpacity/20 bg-purplePanel p-4 text-lightPurple">
          <div className="text-sm">
            After setup completes, this tab will switch from onboarding to your live Footy identity, follower count, and cast history.
          </div>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileSaveError(null);

    try {
      if (activeEditor === "displayName") {
        if (displayNameValidation.error) {
          throw new Error(displayNameValidation.error);
        }
        await updateManagedProfile({ displayName: displayNameValidation.normalized });
      } else if (activeEditor === "username") {
        if (usernameValidation.error) {
          throw new Error(usernameValidation.error);
        }
        await claimManagedUsername(usernameValidation.normalized);
      } else if (activeEditor === "bio") {
        if (bioValidation.error) {
          throw new Error(bioValidation.error);
        }
        await updateManagedProfile({ bio: bioValidation.normalized });
      }
      setActiveEditor(null);
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : "Could not update your Footy profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePfpFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsSavingProfile(true);
    setProfileSaveError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadPayload = (await uploadResponse.json().catch(() => ({}))) as {
        publicUrl?: string;
        error?: string;
        details?: string;
      };

      if (!uploadResponse.ok || !uploadPayload.publicUrl) {
        throw new Error(uploadPayload.details || uploadPayload.error || "Could not upload your profile image.");
      }
      await updateManagedProfile({ pfpUrl: uploadPayload.publicUrl });
      setActiveEditor(null);
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : "Could not update your profile picture.");
    } finally {
      setIsSavingProfile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const displayNameValidation = validateDisplayNameInput(editorName);
  const usernameValidation = validateUsernameInput(editorUsername);
  const bioValidation = validateBioInput(editorBio);
  const usernameProtocolError =
    usernameValidation.normalized.endsWith(".eth") && !usernameValidation.error
      ? "Claiming .eth usernames in Footy is not wired yet. Use Farcaster mobile for now."
      : null;
  const usernameEditorError = profileSaveError || usernameValidation.error || usernameProtocolError;

  const displayNameMeta = `${displayNameValidation.bytes}/${FARCASTER_DISPLAY_NAME_MAX_BYTES} bytes`;
  const usernameMeta = editorUsername.trim().toLowerCase().endsWith(".eth")
    ? `${usernameValidation.normalized.length}/${FARCASTER_ENS_USERNAME_MAX_LENGTH} chars. Claim .eth in Farcaster mobile for now`
    : `Claim a Farcaster fname here. 16 chars max, lowercase letters, numbers, or hyphens`;
  const bioMeta = `${bioValidation.bytes}/${FARCASTER_BIO_MAX_BYTES} bytes`;

  return (
    <div className="mb-4">

      <ProfileIdentityCard
        viewerFid={viewerFid}
        bio={bio}
        isEditingDisplayName={activeEditor === "displayName"}
        displayNameDraft={editorName}
        displayNameError={activeEditor === "displayName" ? (profileSaveError || displayNameValidation.error) : null}
        displayNameMeta={displayNameMeta}
        isSavingDisplayName={activeEditor === "displayName" && isSavingProfile}
        onDisplayNameDraftChange={setEditorName}
        onStartDisplayNameEdit={() => {
          setProfileSaveError(null);
          setActiveEditor("displayName");
        }}
        onCancelDisplayNameEdit={() => {
          setProfileSaveError(null);
          setEditorName(displayName || "");
          setActiveEditor(null);
        }}
        onSaveDisplayName={() => void handleSaveProfile()}
        isEditingUsername={activeEditor === "username"}
        usernameDraft={editorUsername}
        usernameError={activeEditor === "username" ? usernameEditorError : null}
        usernameMeta={usernameMeta}
        isSavingUsername={activeEditor === "username" && isSavingProfile}
        onUsernameDraftChange={setEditorUsername}
        onStartUsernameEdit={() => {
          setProfileSaveError(null);
          setActiveEditor("username");
        }}
        onCancelUsernameEdit={() => {
          setProfileSaveError(null);
          setEditorUsername(username || "");
          setActiveEditor(null);
        }}
        onSaveUsername={() => void handleSaveProfile()}
        onEditPfp={() => {
          setProfileSaveError(null);
          fileInputRef.current?.click();
        }}
        isEditingBio={activeEditor === "bio"}
        bioDraft={editorBio}
        bioError={activeEditor === "bio" ? (profileSaveError || bioValidation.error) : null}
        bioMeta={bioMeta}
        isSavingBio={activeEditor === "bio" && isSavingProfile}
        onBioDraftChange={setEditorBio}
        onStartBioEdit={() => {
          setProfileSaveError(null);
          setActiveEditor("bio");
        }}
        onCancelBioEdit={() => {
          setProfileSaveError(null);
          setEditorBio(bio || "");
          setActiveEditor(null);
        }}
        onSaveBio={() => void handleSaveProfile()}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => void handlePfpFileChange(event)}
        className="hidden"
      />

      <ProfileCastFeed />

      <div className="mt-4 rounded-[22px] border border-limeGreenOpacity/20 bg-purplePanel p-4 text-lightPurple">
        <div className="text-sm">
          Manage follows from Fan Clubs so the editing flow lives in one place.
        </div>
        <button
          type="button"
          onClick={() => router.push("/?tab=fanClubs")}
          className="mt-3 rounded-xl bg-deepPink px-4 py-3 text-sm font-semibold text-notWhite transition-colors hover:bg-deepPink/85"
        >
          Open Fan Clubs
        </button>
      </div>
    </div>
  );
};

export default ProfileTab;
