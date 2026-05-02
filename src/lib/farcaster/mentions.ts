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
  // The raw text must exclude the mention token entirely.
  const text = normalizedMessage ? ` ${normalizedMessage}` : "";
  const mentionPosition = 0;

  return {
    text,
    mentions: [fid],
    mentionsPositions: [mentionPosition],
  };
}
