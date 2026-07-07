/**
 * Patches the generated Capacitor android project so the bundled
 * proot binaries (jniLibs/*.so) are extracted to disk at install time.
 * Android can only exec() native binaries from nativeLibraryDir, and
 * that requires legacy jniLibs packaging on the APP module.
 *
 * Run after `npx cap add android` / `npx cap sync android`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const appGradlePath = resolve(process.cwd(), 'android', 'app', 'build.gradle');

if (!existsSync(appGradlePath)) {
  console.error('[patch-android] android/app/build.gradle not found. Run "npx cap add android" first.');
  process.exit(1);
}

let gradle = readFileSync(appGradlePath, 'utf8');

if (gradle.includes('useLegacyPackaging = true')) {
  console.log('[patch-android] Already patched.');
  process.exit(0);
}

const packagingBlock = `
    packagingOptions {
        jniLibs {
            useLegacyPackaging = true
        }
    }
`;

// Insert inside the android { ... } block, right after its opening line.
const patched = gradle.replace(/(android\s*\{\n)/, `$1${packagingBlock}\n`);

if (patched === gradle) {
  console.error('[patch-android] Could not find android { } block to patch.');
  process.exit(1);
}

writeFileSync(appGradlePath, patched);
console.log('[patch-android] Enabled legacy jniLibs packaging (proot binaries will be extracted).');
