"use client";

import { Crosshair, Info, Layers3, X } from "lucide-react";
import {
  METRIC_SCREW_SIZES,
  SCREW_HEAD_OPTIONS,
  SCREW_HOLE_MOUNT_OPTIONS,
  screwHoleDimensions,
  screwHoleLabel,
  type ScrewHoleConfig,
} from "@/lib/screwHoles";

export function ScrewHolePanel({
  config,
  targetName,
  placing,
  dockBesideInspector,
  onChange,
  onStartPlacement,
  onFinishPlacement,
  onClose,
}: {
  config: ScrewHoleConfig;
  targetName: string | null;
  placing: boolean;
  dockBesideInspector: boolean;
  onChange: (patch: Partial<ScrewHoleConfig>) => void;
  onStartPlacement: () => void;
  onFinishPlacement: () => void;
  onClose: () => void;
}) {
  const dimensions = screwHoleDimensions(config);
  const headVisible = config.mount === "clearance";
  const depthHelp = config.depthMode === "through" ? "Uses the selected body height, plus a small cut-through allowance." : "Measured downward from the selected body's top surface.";

  return (
    <aside className={`screw-hole-panel${dockBesideInspector ? " beside-inspector" : ""}`} aria-label="Screw hole generator" onPointerDown={(event) => event.stopPropagation()}>
      <header className="screw-hole-panel-header">
        <div>
          <strong>Screw hole</strong>
          <span>Create a reusable Hole cutter</span>
        </div>
        <button type="button" aria-label="Close screw hole generator" onClick={onClose}><X size={20} /></button>
      </header>

      <div className="screw-hole-summary" aria-label="Current screw hole preset">
        <Layers3 size={18} />
        <span>
          <strong>{screwHoleLabel(config)}</strong>
          <small>{dimensions.shaftDiameter.toFixed(1)} mm clearance · {dimensions.headDiameter.toFixed(1)} mm recess</small>
        </span>
      </div>

      <div className="screw-hole-fields">
        <label>
          <span>Metric size</span>
          <select value={config.metric} onChange={(event) => onChange({ metric: event.currentTarget.value as ScrewHoleConfig["metric"] })}>
            {METRIC_SCREW_SIZES.map((size) => <option value={size} key={size}>{size}</option>)}
          </select>
        </label>
        <label>
          <span>Screw length</span>
          <div className="screw-hole-number">
            <input type="number" min="2" max="120" step="1" value={config.screwLength} onChange={(event) => onChange({ screwLength: Math.max(2, Number(event.currentTarget.value) || 2) })} />
            <small>mm</small>
          </div>
        </label>
        <label>
          <span>Mounting</span>
          <select value={config.mount} onChange={(event) => onChange({ mount: event.currentTarget.value as ScrewHoleConfig["mount"] })}>
            {SCREW_HOLE_MOUNT_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
          </select>
        </label>
        {headVisible ? (
          <label>
            <span>Head type</span>
            <select value={config.head} onChange={(event) => onChange({ head: event.currentTarget.value as ScrewHoleConfig["head"] })}>
              {SCREW_HEAD_OPTIONS.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
        ) : null}
        <label>
          <span>Fit</span>
          <select value={config.fit} onChange={(event) => onChange({ fit: event.currentTarget.value as ScrewHoleConfig["fit"] })}>
            <option value="precise">Precise</option>
            <option value="standard">Standard</option>
            <option value="loose">Loose</option>
          </select>
        </label>
        <label>
          <span>Depth</span>
          <select value={config.depthMode} onChange={(event) => onChange({ depthMode: event.currentTarget.value as ScrewHoleConfig["depthMode"] })}>
            <option value="through">Through all</option>
            <option value="blind">Blind</option>
          </select>
        </label>
        {config.depthMode === "blind" ? (
          <label>
            <span>Blind depth</span>
            <div className="screw-hole-number">
              <input type="number" min="0.5" max="200" step="0.1" value={config.depth} onChange={(event) => onChange({ depth: Math.max(0.5, Number(event.currentTarget.value) || 0.5) })} />
              <small>mm</small>
            </div>
          </label>
        ) : null}
      </div>

      <div className="screw-hole-note"><Info size={15} /><span>{depthHelp}</span></div>
      <div className={`screw-hole-target ${targetName ? "ready" : ""}`}><span>Target body</span><strong>{targetName ?? "Select one unlocked solid"}</strong></div>

      <div className="screw-hole-actions">
        {placing ? <button className="secondary" type="button" onClick={onFinishPlacement}>Done placing</button> : null}
        <button className="primary" type="button" disabled={!targetName} onClick={onStartPlacement}><Crosshair size={17} />{placing ? "Continue placing" : "Place hole"}</button>
      </div>
      <p className="screw-hole-footer">Each new cutter is selected as a Hole so you can edit it. When you finish, the body and cutters are selected for Group.</p>
    </aside>
  );
}
