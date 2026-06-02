export const QR_VERSION_OPTIONS = [2, 4, 6, 8, 10]

export const AUTO_QR_VERSION_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1)

export const SPLIT_PATTERN_OPTIONS = [
  { value: 'left-right', label: 'Left/Right Strong' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'checkerboard', label: 'Checkerboard' },
]

export const QUIET_ZONE_MODULES = 4
export const QR_CELL_SIZE = 10
export const LEFT_RIGHT_QR_CELL_SIZE = 18
export const LEFT_RIGHT_MASK_PATTERN = 0
export const QR_CANVAS_SCALE = 2

export function moduleCountForVersion(version) {
  return Number(version) * 4 + 17
}
