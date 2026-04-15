import type { TemporalBucket } from '../domain/admin.types';

export interface TemporalTrendPoint {
    timestamp: string;
    production: number;
    oee: number;
}

export interface TemporalGroupedPoint {
    bucketKey: string;
    label: string;
    startAt: string;
    endAt: string;
    production: number;
    oee: number;
    sampleCount: number;
}

type ShiftNumber = 1 | 2 | 3;

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const;

function toDate(input: string | Date): Date {
    return input instanceof Date ? new Date(input.getTime()) : new Date(input);
}

function pad(value: number): string {
    return value.toString().padStart(2, '0');
}

function toIsoLocal(date: Date): string {
    return new Date(date.getTime()).toISOString();
}

export function resolveOperationalDayAnchor(input: string | Date): Date {
    const date = toDate(input);
    const anchor = new Date(date.getTime());
    anchor.setMinutes(0, 0, 0);

    if (anchor.getHours() < 6) {
        anchor.setDate(anchor.getDate() - 1);
    }

    anchor.setHours(6);
    return anchor;
}

export function resolveOperationalWeekAnchor(input: string | Date): Date {
    const operationalAnchor = resolveOperationalDayAnchor(input);
    const weekAnchor = new Date(operationalAnchor.getTime());
    const day = weekAnchor.getDay();
    const diffToMonday = (day + 6) % 7;
    weekAnchor.setDate(weekAnchor.getDate() - diffToMonday);
    weekAnchor.setHours(6, 0, 0, 0);
    return weekAnchor;
}

export function resolveShiftAnchor(input: string | Date): { anchor: Date; shift: ShiftNumber } {
    const date = toDate(input);
    const hours = date.getHours();

    if (hours >= 6 && hours < 14) {
        const anchor = new Date(date.getTime());
        anchor.setHours(6, 0, 0, 0);
        return { anchor, shift: 1 };
    }

    if (hours >= 14 && hours < 22) {
        const anchor = new Date(date.getTime());
        anchor.setHours(14, 0, 0, 0);
        return { anchor, shift: 2 };
    }

    const anchor = new Date(date.getTime());
    if (hours < 6) {
        anchor.setDate(anchor.getDate() - 1);
    }
    anchor.setHours(22, 0, 0, 0);
    return { anchor, shift: 3 };
}

function resolveHourAnchor(input: string | Date): Date {
    const anchor = toDate(input);
    anchor.setMinutes(0, 0, 0);
    return anchor;
}

function resolveMonthAnchor(input: string | Date): Date {
    const dayAnchor = resolveOperationalDayAnchor(input);
    return new Date(dayAnchor.getFullYear(), dayAnchor.getMonth(), 1, 0, 0, 0, 0);
}

function resolveBucketWindow(start: Date, bucket: TemporalBucket): Date {
    const end = new Date(start.getTime());

    switch (bucket) {
        case 'hour':
            end.setHours(end.getHours() + 1);
            return end;
        case 'shift':
            end.setHours(end.getHours() + 8);
            return end;
        case 'day':
            end.setDate(end.getDate() + 1);
            return end;
        case 'month':
            end.setMonth(end.getMonth() + 1);
            return end;
    }
}

function formatDayMonth(anchor: Date): string {
    return `${pad(anchor.getDate())} ${MONTH_LABELS[anchor.getMonth()]}`;
}

function formatMonth(anchor: Date): string {
    return `${MONTH_LABELS[anchor.getMonth()]} ${anchor.getFullYear()}`;
}

export function formatBucketLabel(anchor: Date, bucket: TemporalBucket, shift?: ShiftNumber): string {
    switch (bucket) {
        case 'hour':
            return `${pad(anchor.getHours())}:00`;
        case 'shift': {
            const dayLabel = DAY_LABELS[anchor.getDay()];
            return `${dayLabel}-T${shift ?? 1}`;
        }
        case 'day':
            return formatDayMonth(anchor);
        case 'month':
            return formatMonth(anchor);
    }
}

interface BucketResolved {
    bucketKey: string;
    startAt: Date;
    label: string;
}

function resolveBucket(input: string | Date, bucket: TemporalBucket): BucketResolved {
    switch (bucket) {
        case 'hour': {
            const startAt = resolveHourAnchor(input);
            return {
                bucketKey: `hour:${toIsoLocal(startAt)}`,
                startAt,
                label: formatBucketLabel(startAt, 'hour'),
            };
        }
        case 'shift': {
            const { anchor, shift } = resolveShiftAnchor(input);
            const weekAnchor = resolveOperationalWeekAnchor(anchor);
            return {
                bucketKey: `shift:${toIsoLocal(weekAnchor)}:${toIsoLocal(anchor)}:${shift}`,
                startAt: anchor,
                label: formatBucketLabel(anchor, 'shift', shift),
            };
        }
        case 'day': {
            const startAt = resolveOperationalDayAnchor(input);
            const weekAnchor = resolveOperationalWeekAnchor(startAt);
            return {
                bucketKey: `day:${toIsoLocal(weekAnchor)}:${toIsoLocal(startAt)}`,
                startAt,
                label: formatBucketLabel(startAt, 'day'),
            };
        }
        case 'month': {
            const startAt = resolveMonthAnchor(input);
            return {
                bucketKey: `month:${startAt.getFullYear()}-${pad(startAt.getMonth() + 1)}`,
                startAt,
                label: formatBucketLabel(startAt, 'month'),
            };
        }
    }
}

export function groupByTemporalBucket(
    points: TemporalTrendPoint[],
    bucket: TemporalBucket,
): TemporalGroupedPoint[] {
    if (points.length === 0) {
        return [];
    }

    const buckets = new Map<string, {
        startAt: Date;
        label: string;
        productionTotal: number;
        oeeTotal: number;
        sampleCount: number;
    }>();

    points.forEach((point) => {
        const { bucketKey, startAt, label } = resolveBucket(point.timestamp, bucket);
        const current = buckets.get(bucketKey);

        if (current) {
            current.productionTotal += point.production;
            current.oeeTotal += point.oee;
            current.sampleCount += 1;
            return;
        }

        buckets.set(bucketKey, {
            startAt,
            label,
            productionTotal: point.production,
            oeeTotal: point.oee,
            sampleCount: 1,
        });
    });

    return Array.from(buckets.entries())
        .sort((a, b) => a[1].startAt.getTime() - b[1].startAt.getTime())
        .map(([bucketKey, value]) => {
            const endAt = resolveBucketWindow(value.startAt, bucket);
            return {
                bucketKey,
                label: value.label,
                startAt: toIsoLocal(value.startAt),
                endAt: toIsoLocal(endAt),
                production: Number(value.productionTotal.toFixed(2)),
                oee: Number((value.oeeTotal / value.sampleCount).toFixed(2)),
                sampleCount: value.sampleCount,
            } satisfies TemporalGroupedPoint;
        });
}
