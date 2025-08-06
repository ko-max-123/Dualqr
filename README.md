# Dual-Link QR Code Generator

Embed two URLs inside one QR code

https://dualqrcode.com/

A React application that generates a single QR code capable of encoding two different URLs simultaneously. When scanned from different angles, the QR code will reveal different URLs, creating an ambiguous or dual-purpose QR code.

WARNING: This is experimental code that goes against and breaks the QR code standard. This should NEVER be used for real world applications and is merely a proof of concept.

## How It Works

The ambiguous QR code in this application works by combining two different QR codes into a single image using a split pixel pattern. When two QR codes have different patterns at the same position, the cell is split in half - one half represents the first QR code and the other half represents the second QR code. When both QR codes have the same pattern at a position (both black or both white), the cell is filled with a solid color. Due to the high error correction capability of QR codes (using error correction level 'H'), QR code scanners can still read either URL depending on the scanning angle. If you can't get it to open both URLs, keep trying from different angles!

Key features:
- Generates QR codes with 2 different URLs
- Uses high error correction level to exploit the QR code standard
- Multiple pixel splicing patterns (vertical, horizontal, and diagonal) for ambiguous cells
- Customizable QR code options for enhanced compatibility
- URL inversion capability for alternative scanning results
- Optimized cell size and margins for high quality QR code image

## Technical Implementation

- Built with React + Vite
- Implements the `qrcode` npm package for base QR code creation
- Uses HTML Canvas for QR code generation and manipulation
- Custom rendering logic for pixel splicing

## Usage

1. Enter the first URL you want to encode
2. Enter the second URL you want to encode
3. Choose your preferred pixel splicing pattern (vertical, horizontal, or diagonal)
4. Choose your preferred QR code version (Higher version allows for more data to be encoded, but may be less readable)
5. Optionally enable URL inversion for different scanning behavior
6. Click "Generate QR Code" or press Enter
7. Scan the resulting QR code from different angles to see both URLs

**Note:** Due to the nature of QR code scanning algorithms, the second URL tends to be favored by most scanners. Results may vary depending on the scanning angle and the QR code reader being used.

## Example

![Dual QR Code Example](https://i.imgur.com/oaTsbWd.png)
