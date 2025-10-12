type UniformLookupOptions = {
    label?: string;
};

export function getUniformLocation(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    name: string,
): WebGLUniformLocation {
    const location = gl.getUniformLocation(program, name);
    if (location === null) {
        throw new Error(`Uniform ${name} not found`);
    }
    return location;
}

export function getOptionalUniformLocation(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    name: string,
    options?: UniformLookupOptions,
): WebGLUniformLocation | null {
    const location = gl.getUniformLocation(program, name);
    if (location === null) {
        const prefix = options?.label ? `[${options.label}] ` : "";
        console.warn(`${prefix}Uniform ${name} not found (optional)`);
        return null;
    }
    return location;
}
