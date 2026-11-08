package fr.afterschool.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.webkit.WebResourceResponse
import androidx.core.content.FileProvider
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.zip.ZipInputStream

/**
 * Mises à jour automatiques.
 *  1. Contenu (écrans, jeux, design : le dossier assets) : téléchargé en arrière-plan au lancement depuis le site,
 *     rangé dans filesDir/ota/<build>, puis servi à la place de celui de l'APK (même adresse, donc mêmes données).
 *     Une version qui ne démarre pas est abandonnée automatiquement au lancement suivant.
 *  2. Appli complète (quand le code Android change) : l'APK est téléchargée et Android propose de l'installer.
 */
class Updater(private val ctx: Context, private val emit: (String) -> Unit) {
    companion object {
        /** À augmenter à chaque changement du code Android (pont JS, Kotlin/Java, bibliothèques, modèles). */
        const val NATIVE_API = 1
        const val SITE = "https://afterschool.sinisterkid.win/"
        const val RELEASES = "https://api.github.com/repos/Volkodlack/afterschool/releases/latest"
    }

    private val prefs = ctx.getSharedPreferences("updater", Context.MODE_PRIVATE)
    private val otaRoot = File(ctx.filesDir, "ota")
    @Volatile var activeDir: File? = null
        private set
    val apkAssetsBuild: Long = BuildConfig.ASSETS_BUILD
    var activeBuild: Long = apkAssetsBuild
        private set
    @Volatile private var apkUrl: String? = null
    @Volatile private var apkSize: Long = 0

    /** Au démarrage : choisir le contenu à afficher (mise à jour téléchargée ou celui de l'APK). */
    fun selectAtStartup() {
        val cur = prefs.getLong("current", 0)
        val pending = prefs.getLong("pending", 0)
        if (pending != 0L && pending == cur) {
            // le lancement précédent avec cette version n'a jamais confirmé qu'il marchait : on l'abandonne
            prefs.edit().putLong("bad", cur).remove("current").remove("pending").apply()
            File(otaRoot, "b$cur").deleteRecursively()
        }
        val c = prefs.getLong("current", 0)
        val dir = File(otaRoot, "b$c")
        if (c > apkAssetsBuild && File(dir, "index.html").exists()) {
            activeDir = dir; activeBuild = c
            prefs.edit().putLong("pending", c).apply()
        } else {
            activeDir = null; activeBuild = apkAssetsBuild
            if (c != 0L && c <= apkAssetsBuild) { prefs.edit().remove("current").remove("pending").apply(); otaRoot.deleteRecursively() }
        }
    }

    /** L'appli a bien démarré avec ce contenu. */
    fun confirmOk() { prefs.edit().remove("pending").apply() }

    /** Sert les fichiers : d'abord la mise à jour téléchargée, sinon ceux de l'APK. */
    fun pathHandler(fallback: WebViewAssetLoader.PathHandler) = WebViewAssetLoader.PathHandler { path ->
        val d = activeDir
        if (d != null) {
            val f = File(d, path)
            if (f.isFile && f.canonicalPath.startsWith(d.canonicalPath)) {
                return@PathHandler WebResourceResponse(mime(path), null, FileInputStream(f))
            }
        }
        fallback.handle(path)
    }

    private fun mime(p: String): String = when (p.substringAfterLast('.', "").lowercase()) {
        "html" -> "text/html"; "js" -> "application/javascript"; "css" -> "text/css"; "json", "webmanifest" -> "application/json"
        "png" -> "image/png"; "jpg", "jpeg" -> "image/jpeg"; "svg" -> "image/svg+xml"; "woff2" -> "font/woff2"; "woff" -> "font/woff"
        "wasm" -> "application/wasm"; "txt" -> "text/plain"; else -> "application/octet-stream"
    }

    private fun get(url: String, timeout: Int = 10000): HttpURLConnection {
        var u = URL(url)
        repeat(5) {
            val c = u.openConnection() as HttpURLConnection
            c.connectTimeout = timeout; c.readTimeout = 30000; c.instanceFollowRedirects = false
            c.setRequestProperty("User-Agent", "AfterSchool-Android")
            c.setRequestProperty("Cache-Control", "no-cache")
            val code = c.responseCode
            if (code in 300..399) { u = URL(u, c.getHeaderField("Location")); c.disconnect() } else return c
        }
        throw IllegalStateException("trop de redirections")
    }

    /** Vérifie et télécharge en arrière-plan (à appeler hors du fil principal). */
    fun check(manual: Boolean = false) {
        try {
            val c = get(SITE + "ota/version.json")
            if (c.responseCode != 200) { if (manual) emit("AS_native.updateStatus('none')"); return }
            val v = JSONObject(c.inputStream.bufferedReader().readText()); c.disconnect()
            val build = v.getLong("build")
            val needApi = v.optInt("nativeApi", 1)
            if (needApi > NATIVE_API) { checkApk(true); return }
            if (build <= activeBuild || build == prefs.getLong("bad", -1) || build <= prefs.getLong("current", 0)) {
                if (manual) checkApk(false) ; return
            }
            // télécharger le contenu
            val tmp = File(ctx.cacheDir, "ota.zip")
            val z = get(SITE + v.getString("zip"))
            val md = MessageDigest.getInstance("SHA-256")
            z.inputStream.use { inp -> FileOutputStream(tmp).use { out ->
                val buf = ByteArray(64 * 1024); while (true) { val n = inp.read(buf); if (n < 0) break; md.update(buf, 0, n); out.write(buf, 0, n) }
            } }
            z.disconnect()
            val sha = md.digest().joinToString("") { "%02x".format(it) }
            if (!sha.equals(v.getString("sha256"), true)) { tmp.delete(); return }
            val dest = File(otaRoot, "b$build"); val work = File(otaRoot, "b$build.tmp")
            work.deleteRecursively(); work.mkdirs()
            ZipInputStream(FileInputStream(tmp)).use { zin ->
                while (true) {
                    val e = zin.nextEntry ?: break
                    val f = File(work, e.name)
                    if (!f.canonicalPath.startsWith(work.canonicalPath)) continue
                    if (e.isDirectory) { f.mkdirs(); continue }
                    f.parentFile?.mkdirs()
                    FileOutputStream(f).use { zin.copyTo(it) }
                }
            }
            tmp.delete()
            if (!File(work, "index.html").exists()) { work.deleteRecursively(); return }
            dest.deleteRecursively(); work.renameTo(dest)
            prefs.edit().putLong("current", build).remove("pending").apply()
            otaRoot.listFiles()?.forEach { if (it.name != dest.name && it.name != activeDir?.name) it.deleteRecursively() }
            emit("AS_native.otaReady($build)")
        } catch (e: Exception) {
            if (manual) emit("AS_native.updateStatus('error')")
        }
    }

    /** Une nouvelle APK est-elle publiée ? */
    private fun checkApk(required: Boolean) {
        try {
            val c = get(RELEASES)
            if (c.responseCode != 200) return
            val r = JSONObject(c.inputStream.bufferedReader().readText()); c.disconnect()
            val n = r.getString("tag_name").substringAfterLast('.').toIntOrNull() ?: return
            val mine = ctx.packageManager.getPackageInfo(ctx.packageName, 0).let { if (Build.VERSION.SDK_INT >= 28) it.longVersionCode.toInt() else @Suppress("DEPRECATION") it.versionCode }
            if (n <= mine) { emit("AS_native.updateStatus('none')"); return }
            val a = r.getJSONArray("assets")
            for (i in 0 until a.length()) {
                val o = a.getJSONObject(i)
                if (o.getString("name").endsWith(".apk")) {
                    apkUrl = o.getString("browser_download_url"); apkSize = o.optLong("size")
                    emit("AS_native.apkAvailable(${JSONObject.quote("1.0.$n")}, $apkSize, ${if (required) "true" else "false"})")
                    return
                }
            }
        } catch (_: Exception) {}
    }

    /** Télécharge l'APK puis ouvre l'installeur Android. */
    fun downloadAndInstall(act: Activity) {
        val url = apkUrl ?: return
        if (Build.VERSION.SDK_INT >= 26 && !ctx.packageManager.canRequestPackageInstalls()) {
            act.runOnUiThread {
                act.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.packageName)))
            }
            emit("AS_native.apkProgress(-2)")
            return
        }
        try {
            val dir = File(ctx.cacheDir, "update"); dir.mkdirs()
            val f = File(dir, "AfterSchool.apk")
            val c = get(url, 15000)
            val total = c.contentLengthLong.takeIf { it > 0 } ?: apkSize
            var done = 0L; var last = -1
            c.inputStream.use { inp -> FileOutputStream(f).use { out ->
                val buf = ByteArray(128 * 1024)
                while (true) {
                    val n = inp.read(buf); if (n < 0) break
                    out.write(buf, 0, n); done += n
                    val pct = if (total > 0) (done * 100 / total).toInt() else 0
                    if (pct != last) { last = pct; emit("AS_native.apkProgress($pct)") }
                }
            } }
            c.disconnect()
            val uri = FileProvider.getUriForFile(ctx, ctx.packageName + ".fileprovider", f)
            act.runOnUiThread {
                act.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
            }
            emit("AS_native.apkProgress(100)")
        } catch (e: Exception) {
            emit("AS_native.apkProgress(-1)")
        }
    }

    fun info(): String = JSONObject()
        .put("apk", ctx.packageManager.getPackageInfo(ctx.packageName, 0).versionName)
        .put("assets", activeBuild).put("ota", activeDir != null).put("nativeApi", NATIVE_API).toString()
}
