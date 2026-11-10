package com.sea.pos;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Environment;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * ═══════════════════════════════════════════════════════════════════
 * 🔄 AppUpdater - aggiornamento dell'app dall'interno
 * ═══════════════════════════════════════════════════════════════════
 * - getInstalledVersion(): versione installata (versionName / versionCode)
 * - downloadAndInstall(): scarica il nuovo APK e apre il programma di
 *   installazione di Android. Essendo firmato con la stessa chiave,
 *   l'APK si installa SOPRA quello già presente (i dati restano).
 * ═══════════════════════════════════════════════════════════════════
 */
@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    @PluginMethod
    public void getInstalledVersion(PluginCall call) {
        try {
            PackageInfo info = getContext()
                    .getPackageManager()
                    .getPackageInfo(getContext().getPackageName(), 0);

            JSObject result = new JSObject();
            result.put("versionName", info.versionName);
            result.put("versionCode", (int) (info.versionCode & 0xffffffffL));
            result.put("packageName", getContext().getPackageName());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Impossibile leggere la versione installata: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        final String url = call.getString("url");
        final String fileName = call.getString("fileName", "Sea-POS-update.apk");

        if (url == null || url.trim().isEmpty()) {
            call.reject("URL dell'APK mancante");
            return;
        }

        final PluginCall downloadCall = call;

        Thread worker = new Thread(() -> {
            try {
                File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) {
                    dir = new File(getContext().getFilesDir(), "updates");
                }
                dir.mkdirs();

                // Cancella il file precedente (se presente)
                final File apkFile = new File(dir, fileName);
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(20000);
                connection.setReadTimeout(90000);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "SeaPOS-AppUpdater");
                connection.connect();

                int status = connection.getResponseCode();
                if (status < 200 || status >= 300) {
                    connection.disconnect();
                    downloadCall.reject("Download fallito (HTTP " + status + ")");
                    return;
                }

                long totalSize = connection.getContentLengthLong();
                long downloaded = 0;

                try (InputStream input = connection.getInputStream();
                     FileOutputStream output = new FileOutputStream(apkFile)) {

                    byte[] buffer = new byte[64 * 1024];
                    int read;

                    while ((read = input.read(buffer)) != -1) {
                        output.write(buffer, 0, read);
                        downloaded += read;

                        JSObject progress = new JSObject();
                        progress.put("downloaded", downloaded);
                        progress.put("total", totalSize);
                        progress.put("percent",
                                totalSize > 0 ? Math.round((downloaded * 100.0) / totalSize) : 0);
                        notifyListeners("downloadProgress", progress);
                    }
                    output.flush();
                }
                connection.disconnect();

                JSObject done = new JSObject();
                done.put("path", apkFile.getAbsolutePath());
                done.put("size", downloaded);
                notifyListeners("downloadComplete", done);

                // Apre l'installatore di Android
                getBridge()
                        .getActivity()
                        .runOnUiThread(() -> {
                            try {
                                Uri apkUri = FileProvider.getUriForFile(
                                        getContext(),
                                        getContext().getPackageName() + ".fileprovider",
                                        apkFile);

                                Intent intent = new Intent(Intent.ACTION_VIEW);
                                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                getContext().startActivity(intent);

                                JSObject result = new JSObject();
                                result.put("installerOpened", true);
                                downloadCall.resolve(result);
                            } catch (Exception e) {
                                downloadCall.reject(
                                        "Impossibile aprire l'installatore: " + e.getMessage());
                            }
                        });

            } catch (Exception e) {
                downloadCall.reject("Errore durante il download: " + e.getMessage());
            }
        });

        worker.start();
    }

    /** Cancella gli APK scaricati (pulizia disco) */
    @PluginMethod
    public void clearDownloads(PluginCall call) {
        try {
            File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (dir == null) {
                dir = new File(getContext().getFilesDir(), "updates");
            }
            File[] files = dir.listFiles();
            int removed = 0;
            if (files != null) {
                for (File f : files) {
                    if (f.getName().endsWith(".apk") && f.delete()) {
                        removed++;
                    }
                }
            }
            JSObject result = new JSObject();
            result.put("removed", removed);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Errore nella pulizia: " + e.getMessage());
        }
    }
}
