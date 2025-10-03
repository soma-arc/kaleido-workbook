import {
    MAX_TEXTURE_SLOTS,
    type TextureLayer,
    type TextureSource,
    type TextureSourceKind,
    type TextureUVTransform,
} from "./textures";

export interface TextureUniformData {
    enabled: Int32Array;
    offset: Float32Array;
    scale: Float32Array;
    rotation: Float32Array;
    opacity: Float32Array;
}

export interface TextureManager {
    sync(layers: readonly TextureLayer[]): TextureUniformData;
    dispose(): void;
    getUnits(): Int32Array;
}

type TextureResource = {
    texture: WebGLTexture;
    sourceId: string;
    width: number;
    height: number;
    kind: TextureSourceKind;
    dynamic: boolean;
};

const COMPONENTS_PER_VEC2 = 2;

export function createTextureManager(gl: WebGL2RenderingContext): TextureManager {
    const resources: Array<TextureResource | null> = Array(MAX_TEXTURE_SLOTS).fill(null);
    const enabled = new Int32Array(MAX_TEXTURE_SLOTS);
    const offset = new Float32Array(MAX_TEXTURE_SLOTS * COMPONENTS_PER_VEC2);
    const scale = new Float32Array(MAX_TEXTURE_SLOTS * COMPONENTS_PER_VEC2);
    const rotation = new Float32Array(MAX_TEXTURE_SLOTS);
    const opacity = new Float32Array(MAX_TEXTURE_SLOTS);
    const units = new Int32Array(MAX_TEXTURE_SLOTS);
    for (let i = 0; i < MAX_TEXTURE_SLOTS; i += 1) {
        units[i] = i;
    }

    const resetUniforms = () => {
        enabled.fill(0);
        offset.fill(0);
        scale.fill(0);
        rotation.fill(0);
        opacity.fill(0);
    };

    const releaseSlot = (slot: number) => {
        const existing = resources[slot];
        if (!existing) return;
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.deleteTexture(existing.texture);
        resources[slot] = null;
    };

    const ensureResource = (slot: number, source: TextureSource): TextureResource | null => {
        let resource = resources[slot];
        if (resource && resource.sourceId !== source.id) {
            releaseSlot(slot);
            resource = null;
        }
        if (!resource) {
            const texture = gl.createTexture();
            if (!texture) {
                console.warn("[TextureManager] Failed to allocate WebGLTexture for slot", slot);
                return null;
            }
            gl.activeTexture(gl.TEXTURE0 + slot);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            resources[slot] = {
                texture,
                sourceId: source.id,
                width: 0,
                height: 0,
                kind: source.kind,
                dynamic: Boolean(source.dynamic),
            };
            resource = resources[slot];
        }
        if (resource) {
            resource.sourceId = source.id;
            resource.kind = source.kind;
            resource.dynamic = Boolean(source.dynamic);
        }
        return resource;
    };

    const uploadTexture = (
        slot: number,
        resource: TextureResource,
        source: TextureSource,
        force: boolean,
    ) => {
        const needsUpload =
            force ||
            resource.width !== source.width ||
            resource.height !== source.height ||
            resource.dynamic;
        if (!needsUpload) {
            gl.activeTexture(gl.TEXTURE0 + slot);
            gl.bindTexture(gl.TEXTURE_2D, resource.texture);
            return;
        }
        if (source.width <= 0 || source.height <= 0) {
            return;
        }
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(gl.TEXTURE_2D, resource.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            source.element as unknown as TexImageSource,
        );
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        resource.width = source.width;
        resource.height = source.height;
    };

    const writeTransform = (slot: number, transform: TextureUVTransform | undefined) => {
        const baseIndex = slot * COMPONENTS_PER_VEC2;
        if (!transform) {
            offset[baseIndex] = 0;
            offset[baseIndex + 1] = 0;
            scale[baseIndex] = 1;
            scale[baseIndex + 1] = 1;
            rotation[slot] = 0;
            return;
        }
        offset[baseIndex] = transform.offset.x;
        offset[baseIndex + 1] = transform.offset.y;
        scale[baseIndex] = transform.scale.x;
        scale[baseIndex + 1] = transform.scale.y;
        rotation[slot] = transform.rotation;
    };

    return {
        sync(layers: readonly TextureLayer[]): TextureUniformData {
            resetUniforms();
            for (let slot = 0; slot < MAX_TEXTURE_SLOTS; slot += 1) {
                const layer = layers.find((item) => item.slot === slot);
                if (!layer || layer.enabled === false || !layer.source) {
                    releaseSlot(slot);
                    continue;
                }
                const { source } = layer;
                const ready = source.ready ?? (source.width > 0 && source.height > 0);
                if (!ready) {
                    writeTransform(slot, layer.transform);
                    continue;
                }
                const resource = ensureResource(slot, source);
                if (!resource) {
                    continue;
                }
                const firstUpload = resource.width === 0 || resource.height === 0;
                uploadTexture(slot, resource, source, firstUpload);
                enabled[slot] = 1;
                opacity[slot] = layer.opacity ?? 1;
                writeTransform(slot, layer.transform);
            }
            return { enabled, offset, scale, rotation, opacity };
        },
        dispose() {
            for (let slot = 0; slot < MAX_TEXTURE_SLOTS; slot += 1) {
                releaseSlot(slot);
            }
        },
        getUnits() {
            return units;
        },
    };
}
