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

  // Farcaster structured mentions are rendered from metadata. The raw text should
  // contain the username token without a literal "@" at the mention position.
  const mentionToken = normalizedUsername;
  const text = normalizedMessage ? `${mentionToken} ${normalizedMessage}` : mentionToken;
  const mentionPosition = 0;

  return {
    text,
    mentions: [fid],
    mentionsPositions: [mentionPosition],
  };
}
