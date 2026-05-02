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

  const mentionToken = `@${normalizedUsername}`;
  const text = normalizedMessage ? `${mentionToken} ${normalizedMessage}` : mentionToken;
  const mentionStart = text.indexOf(mentionToken);
  const mentionPrefix = text.slice(0, mentionStart);
  const mentionPosition = new TextEncoder().encode(mentionPrefix).length;

  return {
    text,
    mentions: [fid],
    mentionsPositions: [mentionPosition],
  };
}
