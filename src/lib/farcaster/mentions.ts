export function buildMentionedCastText(
  username: string,
  fid: number,
  message: string
): { text: string; mentions: number[]; mentionsPositions: number[] } {
  const normalizedUsername = username.replace(/^@+/, "").trim();
  const escapedUsername = normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const leadingMentionPattern = new RegExp(`^@${escapedUsername}(?:\\b|\\s|[:,.!?-])`, "i");
  const normalizedMessage = message.trim().replace(leadingMentionPattern, "").trimStart();

  if (!normalizedUsername) {
    return {
      text: normalizedMessage,
      mentions: [],
      mentionsPositions: [],
    };
  }

  // Farcaster mentions are reconstructed by clients from fid + byte offset.
  // Keep natural surrounding text and leave a "hole" where the mention belongs.
  const prefix = "hey ";
  const suffix = normalizedMessage ? ` ${normalizedMessage}` : "";
  const text = `${prefix}${suffix}`;
  const mentionPosition = new TextEncoder().encode(prefix).length;

  return {
    text,
    mentions: [fid],
    mentionsPositions: [mentionPosition],
  };
}
