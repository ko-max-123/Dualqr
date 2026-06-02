export const QR_VERSION_OPTIONS = [2, 4, 6, 8, 10]

export const AUTO_QR_VERSION_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1)

export const SPLIT_PATTERN_OPTIONS = [
  { value: 'vertical', label: 'Vertical' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'checkerboard', label: 'Checkerboard' },
]

export const QUIET_ZONE_MODULES = 4
export const QR_CELL_SIZE = 10
export const QR_CANVAS_SCALE = 2
export const CHECKERBOARD_QR_CELL_SIZE = 15
export const CHECKERBOARD_PRIMARY_RATIO = 0.6
export const CHECKERBOARD_MASK_PATTERN = 0

export function moduleCountForVersion(version) {
  return Number(version) * 4 + 17
}
