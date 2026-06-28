"use client";

import { Check, LoaderCircle, X } from "lucide-react";
import type { CadModifierKind, CadModifierQuality } from "@/lib/cadModifierTypes";

export function EdgeModifierPanel({
  kind,
  amount,
  maxAmount,
  chamferAngle,
  quality,
  sharpAngle,
  tangentChain,
  preserveEdgeSize,
  targetName,
  groupedCount,
  appliedFeatureCount,
  reversibleFeatureCount,
  selectedCount,
  availableCount,
  busy,
  error,
  onAmountChange,
  onChamferAngleChange,
  onQualityChange,
  onSharpAngleChange,
  onTangentChainChange,
  onPreserveEdgeSizeChange,
  onSelectAll,
  onClear,
  onRemoveLastFeature,
  onApply,
  onCancel,
}: {
  kind: CadModifierKind;
  amount: number;
  maxAmount: number;
  chamferAngle: number;
  quality: CadModifierQuality;
  sharpAngle: number;
  tangentChain: boolean;
  preserveEdgeSize: boolean;
  targetName: string;
  groupedCount: number;
  appliedFeatureCount: number;
  reversibleFeatureCount: number;
  selectedCount: number;
  availableCount: number;
  busy: boolean;
  error: string | null;
  onAmountChange: (value: number) => void;
  onChamferAngleChange: (value: number) => void;
  onQualityChange: (value: CadModifierQuality) => void;
  onSharpAngleChange: (value: number) => void;
  onTangentChainChange: (value: boolean) => void;
  onPreserveEdgeSizeChange: (value: boolean) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onRemoveLastFeature: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const title = kind === "fillet" ? "Fillet edges" : "Chamfer edges";
  return (
    <aside className="edge-modifier-panel" aria-label={title}>
      <div className="edge-modifier-header">
        <div>
          <strong>{title}</strong>
          <span>{selectedCount} of {availableCount} sharp edges selected</span>
        </div>
        <button type="button" aria-label={`Cancel ${kind}`} onClick={onCancel}><X size={20} /></button>
      </div>

      <div className={`edge-modifier-target ${groupedCount > 0 ? "grouped" : ""}`}>
        <strong>{targetName}</strong>
        <span>{groupedCount > 0 ? `${groupedCount} grouped objects` : "Single object"}{appliedFeatureCount > 0 ? ` · ${appliedFeatureCount} existing edge feature${appliedFeatureCount === 1 ? "" : "s"}` : ""}</span>
      </div>

      <div className="edge-modifier-selection-help">
        Click highlighted model edges to toggle them. Hold Shift to add or remove a single edge.
      </div>

      <div className="edge-modifier-quick-actions">
        <button type="button" onClick={onSelectAll}>All sharp edges</button>
        <button type="button" onClick={onClear}>Clear</button>
      </div>

      {appliedFeatureCount > 0 ? (
        <div className="edge-modifier-history-actions">
          <button type="button" disabled={reversibleFeatureCount === 0} onClick={onRemoveLastFeature}>
            Remove last edge feature
          </button>
          {reversibleFeatureCount === 0 ? <span>Older edge features do not have stored undo history.</span> : null}
        </div>
      ) : null}

      <label className="edge-modifier-field">
        <span>{kind === "fillet" ? "Radius" : "Distance"}</span>
        <div className="edge-modifier-value-row">
          <input
            type="range"
            min="0.05"
            max={Math.max(0.05, maxAmount)}
            step="0.05"
            value={Math.min(amount, maxAmount)}
            onChange={(event) => onAmountChange(Number(event.currentTarget.value))}
          />
          <input
            type="number"
            min="0.05"
            max={maxAmount}
            step="0.05"
            value={amount}
            onChange={(event) => onAmountChange(Number(event.currentTarget.value))}
          />
          <span>mm</span>
        </div>
      </label>

      {kind === "chamfer" ? (
        <label className="edge-modifier-field">
          <span>Angle</span>
          <div className="edge-modifier-value-row">
            <input type="range" min="5" max="85" step="1" value={chamferAngle} onChange={(event) => onChamferAngleChange(Number(event.currentTarget.value))} />
            <input type="number" min="5" max="85" step="1" value={chamferAngle} onChange={(event) => onChamferAngleChange(Number(event.currentTarget.value))} />
            <span>°</span>
          </div>
        </label>
      ) : null}

      <label className="edge-modifier-field">
        <span>Sharp-edge threshold</span>
        <div className="edge-modifier-value-row">
          <input type="range" min="1" max="120" step="1" value={sharpAngle} onChange={(event) => onSharpAngleChange(Number(event.currentTarget.value))} />
          <input type="number" min="1" max="120" step="1" value={sharpAngle} onChange={(event) => onSharpAngleChange(Number(event.currentTarget.value))} />
          <span>°</span>
        </div>
      </label>

      <label className="edge-modifier-check">
        <input type="checkbox" checked={tangentChain} onChange={(event) => onTangentChainChange(event.currentTarget.checked)} />
        <span>Select tangent chains</span>
      </label>

      <label className="edge-modifier-check">
        <input type="checkbox" checked={preserveEdgeSize} onChange={(event) => onPreserveEdgeSizeChange(event.currentTarget.checked)} />
        <span>Keep edge size when resizing</span>
      </label>

      <label className="edge-modifier-field">
        <span>Preview quality</span>
        <select value={quality} onChange={(event) => onQualityChange(event.currentTarget.value as CadModifierQuality)}>
          <option value="draft">Draft</option>
          <option value="standard">Standard</option>
          <option value="fine">Fine</option>
        </select>
      </label>

      {error ? <div className="edge-modifier-error" role="alert">{error}</div> : null}
      <div className="edge-modifier-footer">
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        <button type="button" className="primary" disabled={busy || selectedCount === 0 || Boolean(error)} onClick={onApply}>
          {busy ? <LoaderCircle className="edge-modifier-spinner" size={17} /> : <Check size={17} />}
          Apply
        </button>
      </div>
    </aside>
  );
}
