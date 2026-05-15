import type { Role, SignRequest } from "~/lib/qkms-types";

export function buildApprovalMessage(
  request: Pick<
    SignRequest,
    "id" | "title" | "keyId" | "actionType" | "payloadHash"
  >,
  role: Role,
) {
  return [
    "QKMS sign request approval",
    `Request ID: ${request.id}`,
    `Title: ${request.title}`,
    `Key ID: ${request.keyId}`,
    `Role: ${role}`,
    `Action type: ${request.actionType}`,
    `Payload hash: ${request.payloadHash}`,
    "Action: approve sign request",
  ].join("\n");
}
