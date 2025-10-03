declare module "*.vert?raw" {
    const source: string;
    export default source;
}

declare module "*.frag?raw" {
    const source: string;
    export default source;
}

declare module "*.svg?url" {
    const url: string;
    export default url;
}
