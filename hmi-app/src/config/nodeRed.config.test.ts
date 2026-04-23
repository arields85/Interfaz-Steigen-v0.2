import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    DATA_DEFAULT_ENDPOINT,
    DATA_DEFAULT_REFETCH_INTERVAL,
    DATA_DEFAULT_STALE_TIME,
    clearDataEndpoint,
    getDataBaseUrl,
    getDataEndpoint,
    getDataFullUrl,
    getSavedDataEndpoint,
    isDataConnectionEnabled,
    saveDataBaseUrl,
    saveDataEndpoint,
    clearDataBaseUrl,
    getSavedDataBaseUrl,
} from './dataConnection.config';

describe('nodeRed.config', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        localStorage.clear();
    });

    it('returns null and disables Node-RED when base url is missing or blank', () => {
        vi.stubEnv('VITE_NODE_RED_BASE_URL', '   ');

        expect(getDataBaseUrl()).toBeNull();
        expect(isDataConnectionEnabled()).toBe(false);
    });

    it('trims trailing slashes from the configured base url', () => {
        vi.stubEnv('VITE_NODE_RED_BASE_URL', 'https://node-red.local///');

        expect(getDataBaseUrl()).toBe('https://node-red.local');
        expect(isDataConnectionEnabled()).toBe(true);
    });

    it('exports polling defaults tuned for frequent overview refreshes', () => {
        expect(DATA_DEFAULT_REFETCH_INTERVAL).toBe(5_000);
        expect(DATA_DEFAULT_STALE_TIME).toBe(4_000);
    });

    it('prioritizes localStorage over env var', () => {
        vi.stubEnv('VITE_NODE_RED_BASE_URL', 'https://from-env.local');
        saveDataBaseUrl('https://from-storage.local');

        expect(getDataBaseUrl()).toBe('https://from-storage.local');
    });

    it('falls back to env var when localStorage is empty', () => {
        vi.stubEnv('VITE_NODE_RED_BASE_URL', 'https://from-env.local');

        expect(getDataBaseUrl()).toBe('https://from-env.local');
    });

    it('saves and retrieves url from localStorage', () => {
        saveDataBaseUrl('https://saved.local/');

        expect(getSavedDataBaseUrl()).toBe('https://saved.local');
        expect(getDataBaseUrl()).toBe('https://saved.local');
    });

    it('clears saved url from localStorage', () => {
        saveDataBaseUrl('https://saved.local');
        clearDataBaseUrl();

        expect(getSavedDataBaseUrl()).toBe('');
    });

    it('returns the default endpoint when nothing is saved', () => {
        expect(getDataEndpoint()).toBe(DATA_DEFAULT_ENDPOINT);
    });

    it('saves and retrieves endpoint with leading slash normalized', () => {
        saveDataEndpoint('api/hmi/custom-overview');

        expect(getSavedDataEndpoint()).toBe('api/hmi/custom-overview');
        expect(getDataEndpoint()).toBe('/api/hmi/custom-overview');
    });

    it('clears saved endpoint and falls back to the default', () => {
        saveDataEndpoint('/api/hmi/custom-overview');
        clearDataEndpoint();

        expect(getSavedDataEndpoint()).toBe('');
        expect(getDataEndpoint()).toBe(DATA_DEFAULT_ENDPOINT);
    });

    it('joins base url and endpoint into the full url', () => {
        saveDataBaseUrl('https://node-red.local');
        saveDataEndpoint('/api/hmi/custom-overview');

        expect(getDataFullUrl()).toBe('https://node-red.local/api/hmi/custom-overview');
    });

    it('returns null for full url when base url is not set', () => {
        vi.stubEnv('VITE_NODE_RED_BASE_URL', '');
        saveDataEndpoint('/api/hmi/custom-overview');

        expect(getDataFullUrl()).toBeNull();
    });

    it('handles duplicate slashes between base url and endpoint', () => {
        saveDataBaseUrl('https://node-red.local///');
        saveDataEndpoint('///api/hmi/custom-overview');

        expect(getDataFullUrl()).toBe('https://node-red.local/api/hmi/custom-overview');
    });
});
