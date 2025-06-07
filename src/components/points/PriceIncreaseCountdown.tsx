import { useCountdownToDate } from "~/hooks/useCountdownToDate";
import { useFormattedTokenIssuance } from "~/hooks/useFormattedTokenIssuance";
import { formatSeconds } from "~/lib/utils";
import {
  RulesetWeight,
  getNextRulesetWeight,
  ReservedPercent
} from "juice-sdk-core";
import { useJBRuleset } from "juice-sdk-react";

export function PriceIncreaseCountdown() {
  const projectId = 53n;
  const chainId = 8453;

  const { data: rulesetData } = useJBRuleset({ projectId, chainId });
  console.log("rulesetData", rulesetData);
  const core = rulesetData?.data;
  const meta = rulesetData?.metadata;

  const start = core?.start ?? 0;
  const duration = core?.duration ?? 0;
  const weight = core?.weight.value ?? 0n;
  const weightCutPercent = Number(core?.weightCutPercent.value ?? 0n);
  const reservedPercent = meta?.reservedPercent ?? new ReservedPercent(0);

  const timeLeft = useCountdownToDate(
    start && duration ? new Date((start + duration) * 1000) : undefined
  );

  const currentWeight = new RulesetWeight(weight);
  const nextWeight = new RulesetWeight(
    getNextRulesetWeight({ weight, weightCutPercent })
  );

  const currentFormattedTokenIssuance = useFormattedTokenIssuance({
    weight: currentWeight,
    reservedPercent,
  });

  const currentBuyerIssuance = currentWeight.value * (10000n - BigInt(reservedPercent.value)) / 10000n;
  const nextBuyerIssuance = nextWeight.value * (10000n - BigInt(reservedPercent.value)) / 10000n;
  const delta = currentBuyerIssuance - nextBuyerIssuance;
  const percentDrop = (Number(delta) / Number(currentBuyerIssuance)) * 100;

  if (!rulesetData || !core || !meta) {
    return <div className="text-xs text-zinc-500 italic">No price promotion data found…</div>;
  }

  return (
    <div className="text-xs font-mono text-limeGreenOpacity space-y-1">
      <div>
        Buy now at <span className="font-bold">{currentFormattedTokenIssuance}</span>
      </div>
      <div>
        <span className="text-rose-400">In {formatSeconds(timeLeft || 0)} buyers will receive {percentDrop.toFixed(1)}% fewer tokens per ETH.
        </span>
      </div>
    </div>
  );
}