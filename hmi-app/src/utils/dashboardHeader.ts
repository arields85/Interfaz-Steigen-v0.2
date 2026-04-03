import type { Dashboard } from '../domain/admin.types';

type DashboardHeaderTitleSource = Pick<Dashboard, 'name' | 'headerConfig'>;
type DashboardHeaderSubtitleSource = Pick<Dashboard, 'description' | 'headerConfig'>;

export function getDashboardHeaderTitle(dashboard: DashboardHeaderTitleSource): string {
    const explicitTitle = dashboard.headerConfig?.title?.trim();
    return explicitTitle || dashboard.name;
}

export function getDashboardHeaderSubtitle(dashboard: DashboardHeaderSubtitleSource): string | undefined {
    const explicitSubtitle = dashboard.headerConfig?.subtitle?.trim();
    return explicitSubtitle || dashboard.description;
}
