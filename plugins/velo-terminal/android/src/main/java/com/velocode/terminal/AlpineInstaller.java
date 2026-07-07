package com.velocode.terminal;

import android.content.Context;
import android.os.Build;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Downloads and installs the Alpine Linux minirootfs on first use
 * (Acode-editor style). The rootfs lives in the app's private files dir.
 */
public final class AlpineInstaller {

    public interface Progress {
        void report(String phase, String message, int percent);
    }

    public static final String ALPINE_BRANCH = "v3.22";
    public static final String ALPINE_VERSION = "3.22.2";

    private final Context context;

    public AlpineInstaller(Context context) {
        this.context = context;
    }

    public File rootfsDir() {
        return new File(context.getFilesDir(), "alpine");
    }

    public File workspaceDir() {
        File dir = new File(context.getFilesDir(), "workspace");
        if (!dir.exists()) //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
        return dir;
    }

    public boolean isInstalled() {
        return new File(rootfsDir(), "bin/busybox").exists()
                || new File(rootfsDir(), "bin/sh").exists();
    }

    public String deviceAbi() {
        String[] abis = Build.SUPPORTED_ABIS;
        return abis != null && abis.length > 0 ? abis[0] : "unknown";
    }

    public String alpineArch() {
        switch (deviceAbi()) {
            case "arm64-v8a": return "aarch64";
            case "armeabi-v7a": return "armv7";
            case "x86_64": return "x86_64";
            case "x86": return "x86";
            default: return "aarch64";
        }
    }

    public String downloadUrl() {
        String arch = alpineArch();
        return "https://dl-cdn.alpinelinux.org/alpine/" + ALPINE_BRANCH
                + "/releases/" + arch
                + "/alpine-minirootfs-" + ALPINE_VERSION + "-" + arch + ".tar.gz";
    }

    /** Persistent tarball cache so a failed install never re-downloads. */
    private File cachedTarball() {
        return new File(context.getFilesDir(),
                "alpine-minirootfs-" + ALPINE_VERSION + "-" + alpineArch() + ".tar.gz");
    }

    /** Blocking. Call from a background thread. */
    public synchronized void install(Progress progress) throws IOException {
        if (isInstalled()) {
            progress.report("done", "Alpine already installed", 100);
            return;
        }

        File rootfs = rootfsDir();
        deleteRecursively(rootfs);
        if (!rootfs.isDirectory() && !rootfs.mkdirs()) {
            throw new IOException("Cannot create rootfs dir: " + rootfs);
        }

        File tarball = cachedTarball();
        try {
            if (tarball.exists()) {
                progress.report("downloading", "Using previously downloaded Alpine " + ALPINE_VERSION, 100);
            } else {
                progress.report("downloading", "Downloading Alpine " + ALPINE_VERSION + " (" + alpineArch() + ")", 0);
                download(downloadUrl(), tarball, progress);
            }

            progress.report("extracting", "Extracting rootfs", -1);
            try {
                TarGzExtractor.extract(tarball, rootfs, (name, bytes) -> {
                    // Entry-level progress; indeterminate percentage.
                });
            } catch (IOException e) {
                // Corrupt archive: drop the cache so the next attempt re-downloads.
                //noinspection ResultOfMethodCallIgnored
                tarball.delete();
                throw e;
            }

            if (!isInstalled()) {
                throw new IOException("Extraction produced no shell (bin/busybox missing in " + rootfs + ")");
            }

            progress.report("configuring", "Configuring DNS and profile", -1);
            configureRootfs(rootfs);

            progress.report("done", "Alpine Linux ready", 100);
            //noinspection ResultOfMethodCallIgnored
            tarball.delete();
        } catch (IOException e) {
            deleteRecursively(rootfs);
            progress.report("error", "Install failed: " + e.getMessage(), -1);
            throw e;
        }
    }

    public synchronized void reset() {
        deleteRecursively(rootfsDir());
    }

    private void configureRootfs(File rootfs) throws IOException {
        File etc = new File(rootfs, "etc");
        if (!etc.exists()) //noinspection ResultOfMethodCallIgnored
            etc.mkdirs();

        writeText(new File(etc, "resolv.conf"),
                "nameserver 8.8.8.8\nnameserver 1.1.1.1\n");
        writeText(new File(etc, "hosts"),
                "127.0.0.1 localhost\n::1 localhost\n");

        File profileDir = new File(etc, "profile.d");
        if (!profileDir.exists()) //noinspection ResultOfMethodCallIgnored
            profileDir.mkdirs();
        writeText(new File(profileDir, "velo.sh"),
                "export PS1='\\w \\$ '\n"
                        + "export LANG=C.UTF-8\n"
                        + "alias ll='ls -la'\n");

        File root = new File(rootfs, "root");
        if (!root.exists()) //noinspection ResultOfMethodCallIgnored
            root.mkdirs();
    }

    private static void writeText(File file, String content) throws IOException {
        try (OutputStream out = new FileOutputStream(file)) {
            out.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    private void download(String urlString, File dest, Progress progress) throws IOException {
        File partial = new File(dest.getAbsolutePath() + ".part");
        HttpURLConnection conn = (HttpURLConnection) new URL(urlString).openConnection();
        conn.setConnectTimeout(20000);
        conn.setReadTimeout(60000);
        conn.setInstanceFollowRedirects(true);
        try {
            int status = conn.getResponseCode();
            if (status != 200) {
                throw new IOException("Download failed with HTTP " + status + " for " + urlString);
            }
            long total = conn.getContentLengthLong();
            try (InputStream in = conn.getInputStream();
                 OutputStream out = new FileOutputStream(partial)) {
                byte[] buf = new byte[65536];
                long read = 0;
                int n;
                long lastReport = 0;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    read += n;
                    if (total > 0 && read - lastReport > 262144) {
                        lastReport = read;
                        progress.report("downloading",
                                "Downloading Alpine rootfs",
                                (int) (read * 100 / total));
                    }
                }
                if (total > 0 && read != total) {
                    throw new IOException("Download incomplete (" + read + " of " + total + " bytes)");
                }
            }
            if (!partial.renameTo(dest)) {
                throw new IOException("Cannot move download into place: " + dest);
            }
        } catch (IOException e) {
            //noinspection ResultOfMethodCallIgnored
            partial.delete();
            throw e;
        } finally {
            conn.disconnect();
        }
    }

    static void deleteRecursively(File file) {
        if (file == null || !file.exists()) return;
        // Do not follow symlinks while deleting.
        File[] children = file.listFiles();
        if (children != null && !isSymlink(file)) {
            for (File child : children) deleteRecursively(child);
        }
        //noinspection ResultOfMethodCallIgnored
        file.delete();
    }

    private static boolean isSymlink(File file) {
        try {
            // Resolve the parent first so symlinked ancestors (e.g. Android's
            // /data/user/0 -> /data/data) don't make every child look like a link.
            File parent = file.getParentFile();
            File resolved = parent == null
                    ? file
                    : new File(parent.getCanonicalFile(), file.getName());
            return !resolved.getCanonicalFile().equals(resolved.getAbsoluteFile());
        } catch (IOException e) {
            return true;
        }
    }
}
