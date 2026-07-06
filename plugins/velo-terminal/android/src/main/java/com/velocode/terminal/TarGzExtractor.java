package com.velocode.terminal;

import android.system.Os;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.GZIPInputStream;

/**
 * Minimal ustar/GNU tar.gz extractor sufficient for the Alpine minirootfs
 * and proot packages. Supports regular files, directories, symlinks,
 * hardlinks (converted to symlinks) and GNU long names.
 */
public final class TarGzExtractor {

    public interface ProgressListener {
        void onEntry(String name, long bytesReadSoFar);
    }

    private TarGzExtractor() {}

    public static void extract(File archive, File destDir, ProgressListener listener) throws IOException {
        try (InputStream fis = new BufferedInputStream(new FileInputStream(archive));
             GZIPInputStream gis = new GZIPInputStream(fis)) {
            extractStream(gis, destDir, listener);
        }
    }

    public static void extractStream(InputStream in, File destDir, ProgressListener listener) throws IOException {
        if (!destDir.exists() && !destDir.mkdirs()) {
            throw new IOException("Cannot create destination: " + destDir);
        }
        byte[] header = new byte[512];
        String pendingLongName = null;
        long totalRead = 0;

        while (true) {
            if (!readFully(in, header)) break;
            totalRead += 512;
            if (isZeroBlock(header)) break;

            String name = pendingLongName != null ? pendingLongName : parseString(header, 0, 100);
            pendingLongName = null;
            long size = parseOctal(header, 124, 12);
            byte typeFlag = header[156];
            String linkName = parseString(header, 157, 100);
            int mode = (int) parseOctal(header, 100, 8);

            // ustar prefix field
            String prefix = parseString(header, 345, 155);
            if (!prefix.isEmpty() && pendingLongName == null && !name.startsWith(prefix)) {
                name = prefix + "/" + name;
            }

            long padded = ((size + 511) / 512) * 512;

            switch (typeFlag) {
                case 'L': { // GNU long name
                    byte[] data = new byte[(int) size];
                    if (!readFully(in, data)) throw new IOException("Unexpected EOF in long name");
                    skip(in, padded - size);
                    totalRead += padded;
                    pendingLongName = new String(data, StandardCharsets.UTF_8).trim().replace("\0", "");
                    continue;
                }
                case 'x':
                case 'g': { // pax headers - skip
                    skip(in, padded);
                    totalRead += padded;
                    continue;
                }
                default:
                    break;
            }

            File target = safeResolve(destDir, name);
            if (target == null) { // path traversal attempt - skip entry
                skip(in, padded);
                totalRead += padded;
                continue;
            }

            switch (typeFlag) {
                case '5': // directory
                    if (!target.exists() && !target.mkdirs()) {
                        throw new IOException("Cannot create dir: " + target);
                    }
                    skip(in, padded);
                    break;
                case '2': // symlink
                    createSymlink(linkName, target);
                    skip(in, padded);
                    break;
                case '1': { // hardlink -> symlink to absolute extracted path
                    File linkTarget = safeResolve(destDir, linkName);
                    if (linkTarget != null) {
                        createSymlink(linkTarget.getAbsolutePath(), target);
                    }
                    skip(in, padded);
                    break;
                }
                case '0':
                case 0: { // regular file
                    File parent = target.getParentFile();
                    if (parent != null && !parent.exists() && !parent.mkdirs()) {
                        throw new IOException("Cannot create dir: " + parent);
                    }
                    try (FileOutputStream out = new FileOutputStream(target)) {
                        copyExactly(in, out, size);
                    }
                    skip(in, padded - size);
                    if ((mode & 0111) != 0) {
                        //noinspection ResultOfMethodCallIgnored
                        target.setExecutable(true, false);
                    }
                    break;
                }
                default: // char/block devices, fifos etc. - skip content
                    skip(in, padded);
                    break;
            }
            totalRead += padded;
            if (listener != null) listener.onEntry(name, totalRead);
        }
    }

    private static void createSymlink(String linkTarget, File linkFile) throws IOException {
        File parent = linkFile.getParentFile();
        if (parent != null && !parent.exists() && !parent.mkdirs()) {
            throw new IOException("Cannot create dir: " + parent);
        }
        if (linkFile.exists()) {
            //noinspection ResultOfMethodCallIgnored
            linkFile.delete();
        }
        try {
            Os.symlink(linkTarget, linkFile.getAbsolutePath());
        } catch (Exception e) {
            throw new IOException("symlink failed: " + linkFile + " -> " + linkTarget, e);
        }
    }

    private static File safeResolve(File destDir, String name) throws IOException {
        if (name == null || name.isEmpty()) return null;
        File target = new File(destDir, name);
        String canonicalDest = destDir.getCanonicalPath();
        // Use path (not canonical) for the child so symlinked parents inside the
        // rootfs do not falsely trigger, but reject obvious traversal.
        String normalized = target.getAbsolutePath();
        if (!normalized.startsWith(canonicalDest) || name.contains("..")) {
            return null;
        }
        return target;
    }

    private static boolean isZeroBlock(byte[] block) {
        for (byte b : block) if (b != 0) return false;
        return true;
    }

    private static boolean readFully(InputStream in, byte[] buf) throws IOException {
        int off = 0;
        while (off < buf.length) {
            int n = in.read(buf, off, buf.length - off);
            if (n < 0) return off != 0 ? throwEof() : false;
            off += n;
        }
        return true;
    }

    private static boolean throwEof() throws IOException {
        throw new IOException("Unexpected EOF inside tar block");
    }

    private static void copyExactly(InputStream in, FileOutputStream out, long size) throws IOException {
        byte[] buf = new byte[65536];
        long remaining = size;
        while (remaining > 0) {
            int n = in.read(buf, 0, (int) Math.min(buf.length, remaining));
            if (n < 0) throw new IOException("Unexpected EOF in file body");
            out.write(buf, 0, n);
            remaining -= n;
        }
    }

    private static void skip(InputStream in, long count) throws IOException {
        long remaining = count;
        byte[] buf = new byte[8192];
        while (remaining > 0) {
            int n = in.read(buf, 0, (int) Math.min(buf.length, remaining));
            if (n < 0) return;
            remaining -= n;
        }
    }

    private static long parseOctal(byte[] header, int offset, int length) {
        long result = 0;
        boolean started = false;
        for (int i = offset; i < offset + length; i++) {
            byte b = header[i];
            if (b == 0 || b == ' ') {
                if (started) break;
                continue;
            }
            if (b < '0' || b > '7') break;
            started = true;
            result = (result << 3) + (b - '0');
        }
        return result;
    }

    private static String parseString(byte[] header, int offset, int length) {
        int end = offset;
        while (end < offset + length && header[end] != 0) end++;
        return new String(header, offset, end - offset, StandardCharsets.UTF_8).trim();
    }
}
