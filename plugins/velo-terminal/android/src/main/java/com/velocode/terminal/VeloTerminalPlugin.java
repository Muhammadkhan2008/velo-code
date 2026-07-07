package com.velocode.terminal;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Alpine Linux terminal for Android, Acode-editor style:
 * - proot is bundled in jniLibs as libproot.so (exec-safe location)
 * - the Alpine minirootfs is auto-downloaded on first use
 * - falls back to the plain Android shell when Alpine is unavailable
 */
@CapacitorPlugin(name = "VeloTerminal")
public class VeloTerminalPlugin extends Plugin {

    private static final int MAX_OUTPUT_LINES = 2000;

    private static class Job {
        final String id;
        final Process process;
        final List<String> output = new ArrayList<>();
        final long startedAt = System.currentTimeMillis();
        final String backend;
        volatile boolean done = false;
        volatile Integer code = null;

        Job(String id, Process process, String backend) {
            this.id = id;
            this.process = process;
            this.backend = backend;
        }

        synchronized void append(String line) {
            output.add(line);
            if (output.size() > MAX_OUTPUT_LINES) {
                output.subList(0, output.size() - MAX_OUTPUT_LINES).clear();
            }
        }

        synchronized List<String> snapshot() {
            return new ArrayList<>(output);
        }
    }

    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newCachedThreadPool();
    private final AtomicBoolean installing = new AtomicBoolean(false);
    private AlpineInstaller installer;

    @Override
    public void load() {
        installer = new AlpineInstaller(getContext());
    }

    // ---------- status / setup ----------

    private File prootBinary() {
        return new File(getContext().getApplicationInfo().nativeLibraryDir, "libproot.so");
    }

    private File prootLoader() {
        return new File(getContext().getApplicationInfo().nativeLibraryDir, "libproot-loader.so");
    }

    private File prootLoader32() {
        return new File(getContext().getApplicationInfo().nativeLibraryDir, "libproot-loader32.so");
    }

    private JSObject statusObject() {
        JSObject obj = new JSObject();
        obj.put("alpineInstalled", installer.isInstalled());
        obj.put("prootAvailable", prootBinary().exists());
        obj.put("abi", installer.deviceAbi());
        obj.put("alpineArch", installer.alpineArch());
        obj.put("installing", installing.get());
        return obj;
    }

    @PluginMethod
    public void status(PluginCall call) {
        call.resolve(statusObject());
    }

    @PluginMethod
    public void setupAlpine(PluginCall call) {
        if (!installing.compareAndSet(false, true)) {
            call.resolve(statusObject());
            return;
        }
        executor.execute(() -> {
            try {
                installer.install((phase, message, percent) -> {
                    JSObject event = new JSObject();
                    event.put("phase", phase);
                    event.put("message", message);
                    event.put("percent", percent);
                    notifyListeners("setupProgress", event);
                });
                call.resolve(statusObject());
            } catch (IOException e) {
                call.reject("Alpine setup failed: " + e.getMessage());
            } finally {
                installing.set(false);
            }
        });
    }

    @PluginMethod
    public void resetAlpine(PluginCall call) {
        installer.reset();
        call.resolve(statusObject());
    }

    // ---------- jobs ----------

    @PluginMethod
    public void startJob(PluginCall call) {
        String command = call.getString("command");
        if (command == null || command.trim().isEmpty()) {
            call.reject("command is required");
            return;
        }
        String cwd = call.getString("cwd");
        boolean hostShell = Boolean.TRUE.equals(call.getBoolean("hostShell", false));

        boolean useAlpine = !hostShell && installer.isInstalled() && prootBinary().exists();

        try {
            ProcessBuilder builder = useAlpine
                    ? buildAlpineProcess(command, cwd)
                    : buildHostProcess(command, cwd);

            Process process = builder.start();
            String id = UUID.randomUUID().toString();
            Job job = new Job(id, process, useAlpine ? "alpine" : "host");
            job.append("$ " + command);
            if (!useAlpine && !hostShell) {
                job.append("[warn] Alpine Linux is not installed - running in the basic Android shell (no apk). Install Alpine from the Alpine Shell tab.");
            }
            jobs.put(id, job);

            pump(process.getInputStream(), job, null);
            // stderr is not prefixed: many tools (git, curl, compilers) print
            // normal progress there and a prefix makes them look like failures.
            pump(process.getErrorStream(), job, null);
            executor.execute(() -> {
                try {
                    int code = process.waitFor();
                    job.code = code;
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    job.code = 1;
                } finally {
                    job.done = true;
                    job.append("> Process exited with code " + (job.code == null ? 0 : job.code));
                }
            });

            JSObject result = new JSObject();
            result.put("jobId", id);
            result.put("backend", job.backend);
            call.resolve(result);
        } catch (IOException e) {
            call.reject("Failed to start command: " + e.getMessage());
        }
    }

    private void pump(InputStream stream, Job job, String prefix) {
        executor.execute(() -> {
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    job.append(prefix == null ? line : prefix + line);
                }
            } catch (IOException ignored) {
                // stream closed when process exits
            }
        });
    }

    private ProcessBuilder buildAlpineProcess(String command, String cwd) {
        File rootfs = installer.rootfsDir();
        File workspace = installer.workspaceDir();
        String workdir = (cwd == null || cwd.trim().isEmpty()) ? "/root" : cwd.trim();

        List<String> argv = new ArrayList<>(Arrays.asList(
                prootBinary().getAbsolutePath(),
                "-r", rootfs.getAbsolutePath(),
                "-0",
                "-w", workdir,
                "--link2symlink",
                "--kill-on-exit",
                "-b", "/dev",
                "-b", "/proc",
                "-b", "/sys",
                "-b", workspace.getAbsolutePath() + ":/workspace",
                "/bin/sh", "-lc", command
        ));

        ProcessBuilder builder = new ProcessBuilder(argv);
        Map<String, String> env = builder.environment();
        env.put("HOME", "/root");
        env.put("TERM", "xterm-256color");
        env.put("LANG", "C.UTF-8");
        env.put("PATH", "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin");
        env.put("PROOT_TMP_DIR", getContext().getCacheDir().getAbsolutePath());
        if (prootLoader().exists()) {
            env.put("PROOT_LOADER", prootLoader().getAbsolutePath());
        }
        if (prootLoader32().exists()) {
            env.put("PROOT_LOADER_32", prootLoader32().getAbsolutePath());
        }
        builder.directory(getContext().getFilesDir());
        return builder;
    }

    private ProcessBuilder buildHostProcess(String command, String cwd) {
        ProcessBuilder builder = new ProcessBuilder("/system/bin/sh", "-c", command);
        File dir = installer.workspaceDir();
        if (cwd != null && !cwd.trim().isEmpty()) {
            File requested = new File(dir, cwd.trim());
            if (requested.exists() && requested.isDirectory()) {
                dir = requested;
            }
        }
        builder.directory(dir);
        Map<String, String> env = builder.environment();
        env.put("HOME", getContext().getFilesDir().getAbsolutePath());
        env.put("TMPDIR", getContext().getCacheDir().getAbsolutePath());
        return builder;
    }

    @PluginMethod
    public void pollJob(PluginCall call) {
        Job job = requireJob(call);
        if (job == null) return;
        JSObject result = new JSObject();
        result.put("id", job.id);
        result.put("output", new JSArray(job.snapshot()));
        result.put("done", job.done);
        result.put("code", job.code == null ? JSObject.NULL : job.code);
        result.put("startedAt", job.startedAt);
        result.put("backend", job.backend);
        call.resolve(result);
    }

    @PluginMethod
    public void writeJob(PluginCall call) {
        Job job = requireJob(call);
        if (job == null) return;
        String data = call.getString("data");
        if (data == null) {
            call.reject("data is required");
            return;
        }
        try {
            OutputStream stdin = job.process.getOutputStream();
            stdin.write(data.getBytes(StandardCharsets.UTF_8));
            stdin.flush();
            call.resolve();
        } catch (IOException e) {
            call.reject("Failed to write to job: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopJob(PluginCall call) {
        Job job = requireJob(call);
        if (job == null) return;
        if (!job.done) {
            job.process.destroyForcibly();
            job.done = true;
            job.append("> Process stopped by user");
        }
        JSObject result = new JSObject();
        result.put("id", job.id);
        result.put("done", true);
        call.resolve(result);
    }

    @PluginMethod
    public void removeJob(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("id is required");
            return;
        }
        Job job = jobs.remove(id);
        if (job != null && !job.done) {
            job.process.destroyForcibly();
        }
        call.resolve();
    }

    // ---------- file export ----------

    /** Saves a file into the device's shared Downloads so other apps can access it. */
    @PluginMethod
    public void exportFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String content = call.getString("content");
        if (fileName == null || fileName.trim().isEmpty() || content == null) {
            call.reject("fileName and content are required");
            return;
        }
        String safeName = new File(fileName.trim()).getName();
        try {
            String location;
            if (android.os.Build.VERSION.SDK_INT >= 29) {
                android.content.ContentValues values = new android.content.ContentValues();
                values.put(android.provider.MediaStore.Downloads.DISPLAY_NAME, safeName);
                values.put(android.provider.MediaStore.Downloads.MIME_TYPE, "application/octet-stream");
                android.net.Uri uri = getContext().getContentResolver()
                        .insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) throw new IOException("MediaStore rejected the file");
                try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
                    if (out == null) throw new IOException("Cannot open output stream");
                    out.write(content.getBytes(StandardCharsets.UTF_8));
                }
                location = "Downloads/" + safeName;
            } else {
                File dir = android.os.Environment.getExternalStoragePublicDirectory(
                        android.os.Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists() && !dir.mkdirs()) throw new IOException("Cannot access Downloads");
                File dest = new File(dir, safeName);
                try (OutputStream out = new java.io.FileOutputStream(dest)) {
                    out.write(content.getBytes(StandardCharsets.UTF_8));
                }
                location = dest.getAbsolutePath();
            }
            JSObject result = new JSObject();
            result.put("location", location);
            call.resolve(result);
        } catch (IOException e) {
            call.reject("Export failed: " + e.getMessage());
        }
    }

    private Job requireJob(PluginCall call) {
        String id = call.getString("id");
        Job job = id == null ? null : jobs.get(id);
        if (job == null) {
            call.reject("Terminal job not found");
            return null;
        }
        return job;
    }

    @Override
    protected void handleOnDestroy() {
        for (Job job : jobs.values()) {
            if (!job.done) job.process.destroyForcibly();
        }
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
