export type SnapControlsProps = {
    snapEnabled: boolean;
    onToggle: (enabled: boolean) => void;
};

export function SnapControls({ snapEnabled, onToggle }: SnapControlsProps): JSX.Element {
    return (
        <div style={{ display: "grid", gap: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 600 }}>Snap π/n</span>
                <input
                    type="checkbox"
                    checked={snapEnabled}
                    onChange={(event) => onToggle(event.target.checked)}
                />
            </label>
        </div>
    );
}
