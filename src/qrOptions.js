export const QR_VERSION_OPTIONS = [2, 4, 6, 8, 10]

export const AUTO_QR_VERSION_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1)

export const QUIET_ZONE_MODULES = 4
export const QR_CELL_SIZE = 10
export const QR_CANVAS_SCALE = 2

export function moduleCountForVersion(version) {
  return Number(version) * 4 + 17
}
