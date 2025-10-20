import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Vec2 } from "@/geom/core/types";
import type { TextureRectangleConfig } from "./types";

export type TextureRectangleState = {
    enabled: boolean;
    center: Vec2;
    halfExtents: Vec2;
    rotation: number;
};

type DragState = {
    pointerId: number;
    offset: Vec2;
};

export type TextureRectangleInteractionOptions = {
    initial?: TextureRectangleConfig;
    enabled?: boolean;
    getWorldPoint: (event: React.PointerEvent<HTMLCanvasElement>) => Vec2;
};

export type TextureRectangleInteraction = {
    rect: TextureRectangleState;
    cursor: string | undefined;
    isDragging: boolean;
    onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => boolean;
    onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => boolean;
    onPointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => boolean;
    onPointerCancel: (event: React.PointerEvent<HTMLCanvasElement>) => void;
    onPointerLeave: () => void;
};

const DEFAULT_RECTANGLE: TextureRectangleState = {
    enabled: false,
    center: { x: 0, y: 0 },
    halfExtents: { x: 1, y: 1 },
    rotation: 0,
};

function normalizeRectangle(
    config?: TextureRectangleConfig,
    forcedEnabled?: boolean,
): TextureRectangleState {
    if (!config && forcedEnabled === undefined) {
        return DEFAULT_RECTANGLE;
    }
    const enabled = forcedEnabled ?? config?.enabled ?? false;
    return {
        enabled,
        center: config?.center ?? { x: 0, y: 0 },
        halfExtents: config?.halfExtents ?? { x: 1, y: 1 },
        rotation: config?.rotation ?? 0,
    };
}

function pointInRectangle(rect: TextureRectangleState, point: Vec2): boolean {
    if (!rect.enabled) {
        return false;
    }
    const localX = point.x - rect.center.x;
    const localY = point.y - rect.center.y;
    const angle = -rect.rotation;
    const cosTheta = Math.cos(angle);
    const sinTheta = Math.sin(angle);
    const rotatedX = cosTheta * localX - sinTheta * localY;
    const rotatedY = sinTheta * localX + cosTheta * localY;
    const boundsX = Math.max(rect.halfExtents.x, 1e-6);
    const boundsY = Math.max(rect.halfExtents.y, 1e-6);
    return Math.abs(rotatedX) <= boundsX && Math.abs(rotatedY) <= boundsY;
}

export function useTextureRectangleInteraction(
    options: TextureRectangleInteractionOptions,
): TextureRectangleInteraction {
    const targetEnabled = options.enabled ?? options.initial?.enabled ?? false;
    const initialState = useMemo(
        () => normalizeRectangle(options.initial, targetEnabled),
        [options.initial, targetEnabled],
    );
    const [rect, setRect] = useState<TextureRectangleState>(initialState);
    const rectRef = useRef(rect);
    const dragRef = useRef<DragState | null>(null);
    const [cursor, setCursor] = useState<string | undefined>(undefined);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        rectRef.current = rect;
    }, [rect]);

    useEffect(() => {
        if (dragRef.current) {
            return;
        }
        rectRef.current = initialState;
        setRect(initialState);
    }, [initialState]);

    const updateRect = useCallback((next: TextureRectangleState) => {
        rectRef.current = next;
        setRect(next);
    }, []);

    const onPointerDown = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            const currentRect = rectRef.current;
            if (!currentRect.enabled) {
                setCursor(undefined);
                return false;
            }
            const worldPoint = options.getWorldPoint(event);
            if (!pointInRectangle(currentRect, worldPoint)) {
                setCursor(undefined);
                return false;
            }
            event.stopPropagation();
            event.preventDefault();
            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
                // Ignore browsers that disallow pointer capture.
            }
            dragRef.current = {
                pointerId: event.pointerId,
                offset: {
                    x: worldPoint.x - currentRect.center.x,
                    y: worldPoint.y - currentRect.center.y,
                },
            };
            setCursor("grabbing");
            setIsDragging(true);
            return true;
        },
        [options],
    );

    const onPointerMove = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            const worldPoint = options.getWorldPoint(event);
            const drag = dragRef.current;
            if (drag && drag.pointerId === event.pointerId) {
                const baseRect = rectRef.current;
                const nextRect: TextureRectangleState = {
                    ...baseRect,
                    center: {
                        x: worldPoint.x - drag.offset.x,
                        y: worldPoint.y - drag.offset.y,
                    },
                };
                updateRect(nextRect);
                return true;
            }
            const currentRect = rectRef.current;
            if (currentRect.enabled) {
                setCursor(pointInRectangle(currentRect, worldPoint) ? "grab" : undefined);
            } else {
                setCursor(undefined);
            }
            return false;
        },
        [options, updateRect],
    );

    const onPointerUp = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) {
                return false;
            }
            dragRef.current = null;
            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // ignore
            }
            const worldPoint = options.getWorldPoint(event);
            const currentRect = rectRef.current;
            if (currentRect.enabled) {
                setCursor(pointInRectangle(currentRect, worldPoint) ? "grab" : undefined);
            } else {
                setCursor(undefined);
            }
            setIsDragging(false);
            return true;
        },
        [options],
    );

    const onPointerCancel = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
            try {
                event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
                // ignore
            }
        }
        setIsDragging(false);
        setCursor(undefined);
    }, []);

    const onPointerLeave = useCallback(() => {
        if (!dragRef.current) {
            setCursor(undefined);
        }
    }, []);

    return {
        rect,
        cursor,
        isDragging,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        onPointerLeave,
    };
}
