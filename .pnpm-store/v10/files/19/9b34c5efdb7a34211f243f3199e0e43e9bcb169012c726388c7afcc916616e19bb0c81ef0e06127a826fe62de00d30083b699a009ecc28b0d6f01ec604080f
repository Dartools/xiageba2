import type { RegistryScriptInput } from '#nuxt-scripts/types';
declare const PlausibleAnalyticsOptionsSchema: import("valibot").ObjectSchema<{
    readonly scriptId: import("valibot").OptionalSchema<import("valibot").StringSchema<undefined>, undefined>;
    readonly domain: import("valibot").OptionalSchema<import("valibot").StringSchema<undefined>, undefined>;
    readonly extension: import("valibot").OptionalSchema<import("valibot").UnionSchema<[import("valibot").UnionSchema<(import("valibot").LiteralSchema<"hash", undefined> | import("valibot").LiteralSchema<"outbound-links", undefined> | import("valibot").LiteralSchema<"file-downloads", undefined> | import("valibot").LiteralSchema<"tagged-events", undefined> | import("valibot").LiteralSchema<"revenue", undefined> | import("valibot").LiteralSchema<"pageview-props", undefined> | import("valibot").LiteralSchema<"compat", undefined> | import("valibot").LiteralSchema<"local", undefined> | import("valibot").LiteralSchema<"manual", undefined>)[], undefined>, import("valibot").ArraySchema<import("valibot").UnionSchema<(import("valibot").LiteralSchema<"hash", undefined> | import("valibot").LiteralSchema<"outbound-links", undefined> | import("valibot").LiteralSchema<"file-downloads", undefined> | import("valibot").LiteralSchema<"tagged-events", undefined> | import("valibot").LiteralSchema<"revenue", undefined> | import("valibot").LiteralSchema<"pageview-props", undefined> | import("valibot").LiteralSchema<"compat", undefined> | import("valibot").LiteralSchema<"local", undefined> | import("valibot").LiteralSchema<"manual", undefined>)[], undefined>, undefined>], undefined>, undefined>;
    readonly customProperties: import("valibot").OptionalSchema<import("valibot").RecordSchema<import("valibot").StringSchema<undefined>, import("valibot").AnySchema, undefined>, undefined>;
    readonly endpoint: import("valibot").OptionalSchema<import("valibot").StringSchema<undefined>, undefined>;
    readonly fileDownloads: import("valibot").OptionalSchema<import("valibot").ObjectSchema<{
        readonly fileExtensions: import("valibot").OptionalSchema<import("valibot").ArraySchema<import("valibot").StringSchema<undefined>, undefined>, undefined>;
    }, undefined>, undefined>;
    readonly hashBasedRouting: import("valibot").OptionalSchema<import("valibot").BooleanSchema<undefined>, undefined>;
    readonly autoCapturePageviews: import("valibot").OptionalSchema<import("valibot").BooleanSchema<undefined>, undefined>;
    readonly captureOnLocalhost: import("valibot").OptionalSchema<import("valibot").BooleanSchema<undefined>, undefined>;
    readonly trackForms: import("valibot").OptionalSchema<import("valibot").BooleanSchema<undefined>, undefined>;
}, undefined>;
/**
 * Plausible Analytics options
 * @see https://plausible.io/docs/script-extensions
 */
export interface PlausibleAnalyticsOptions {
    /**
     * Unique script ID for your site (recommended - new format as of October 2025)
     * Get this from your Plausible dashboard under Site Installation
     *
     * Extract it from your Plausible script URL:
     * ```
     * <script src="https://plausible.io/js/pa-gYyxvZhkMzdzXBAtSeSNz.js"></script>
     *                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^
     *                                       scriptId: 'gYyxvZhkMzdzXBAtSeSNz'
     * ```
     * @example 'gYyxvZhkMzdzXBAtSeSNz'
     */
    scriptId?: string;
    /**
     * Your site domain
     * @deprecated Use `scriptId` instead (new October 2025 format)
     * @example 'example.com'
     */
    domain?: string;
    /**
     * Script extensions for additional features
     * @deprecated Use init options like `hashBasedRouting`, `captureOnLocalhost`, etc. instead (new October 2025 format)
     */
    extension?: 'hash' | 'outbound-links' | 'file-downloads' | 'tagged-events' | 'revenue' | 'pageview-props' | 'compat' | 'local' | 'manual' | Array<'hash' | 'outbound-links' | 'file-downloads' | 'tagged-events' | 'revenue' | 'pageview-props' | 'compat' | 'local' | 'manual'>;
    /** Custom properties to track with every pageview */
    customProperties?: Record<string, any>;
    /** Custom tracking endpoint URL */
    endpoint?: string;
    /** Configure file download tracking */
    fileDownloads?: {
        /** File extensions to track (default: pdf, xlsx, docx, txt, rtf, csv, exe, key, pps, ppt, pptx, 7z, pkg, rar, gz, zip, avi, mov, mp4, mpeg, wmv, midi, mp3, wav, wma, dmg) */
        fileExtensions?: string[];
    };
    /** Enable hash-based routing for single-page apps */
    hashBasedRouting?: boolean;
    /** Set to false to manually trigger pageviews */
    autoCapturePageviews?: boolean;
    /** Enable tracking on localhost */
    captureOnLocalhost?: boolean;
    /** Enable form submission tracking */
    trackForms?: boolean;
}
export type PlausibleAnalyticsInput = RegistryScriptInput<typeof PlausibleAnalyticsOptionsSchema, false>;
/**
 * Init options for plausible.init() (October 2025 format)
 * @see https://plausible.io/docs/script-extensions
 */
export interface PlausibleInitOptions {
    customProperties?: Record<string, any>;
    endpoint?: string;
    fileDownloads?: {
        fileExtensions?: string[];
    };
    hashBasedRouting?: boolean;
    autoCapturePageviews?: boolean;
    captureOnLocalhost?: boolean;
}
export type PlausibleFunction = ((event: '404', options: Record<string, any>) => void) & ((event: 'event', options: Record<string, any>) => void) & ((...params: any[]) => void) & {
    q: any[];
    init: (options: PlausibleInitOptions) => void;
};
export interface PlausibleAnalyticsApi {
    plausible: PlausibleFunction;
}
declare global {
    interface Window {
        plausible: PlausibleFunction;
    }
}
export declare function useScriptPlausibleAnalytics<T extends PlausibleAnalyticsApi>(_options?: PlausibleAnalyticsInput): import("#nuxt-scripts/types").UseScriptContext<T>;
export {};
