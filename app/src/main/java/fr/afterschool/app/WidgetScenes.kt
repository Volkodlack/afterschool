package fr.afterschool.app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar

/**
 * Widget façon Duolingo : une illustration du compagnon (générée par la chaîne d'illustrations et publiée sur le site,
 * art/<monde>/w_<espèce>_<scène>.webp) choisie selon l'heure, son état, la série de jours et la saison.
 * Les images sont téléchargées en arrière-plan et gardées sur l'appareil ; sans image, le widget classique reste affiché.
 */
object WidgetScenes {
    private const val SIZE = 512

    /** Phrase écrite en haut de chaque scène ({n} = nom du compagnon). */
    private val TEXT = mapOf(
        "morning" to "Bonjour !", "school" to "Bonne journée !", "weekend" to "On joue ?",
        "homework" to "C'est l'heure des mots !", "reminder" to "On révise un peu ?", "last_chance" to "Vite, avant dodo !",
        "done" to "Bravo, c'est fait !", "proud" to "Quelle série !", "streak_lost" to "Tu m'as manqué…",
        "hungry" to "{n} a faim !", "starving" to "{n} a très très faim !", "dirty" to "Un bon bain ?",
        "bored" to "{n} s'ennuie…", "very_bored" to "Tu viens jouer ?", "sleep" to "Bonne nuit…", "sleep_deep" to "Zzz…",
        "christmas" to "Joyeux Noël !", "halloween" to "Bouh !", "snow" to "Il neige !", "beach" to "Vive les vacances !",
        "flowers" to "C'est le printemps !", "autumn" to "Vive l'automne !"
    )
    val ALL = TEXT.keys.toList()

    /** Si l'image d'une scène n'est pas encore là, on essaie la plus proche. */
    private val FALLBACK = mapOf(
        "starving" to "hungry", "very_bored" to "bored", "sleep_deep" to "sleep", "proud" to "done", "streak_lost" to "reminder",
        "last_chance" to "reminder", "reminder" to "homework", "school" to "weekend", "morning" to "weekend",
        "christmas" to "snow", "snow" to "weekend", "halloween" to "autumn", "autumn" to "weekend", "beach" to "weekend", "flowers" to "weekend"
    )

    private fun dayKey(cal: Calendar) = "${cal.get(Calendar.YEAR)}-${cal.get(Calendar.MONTH) + 1}-${cal.get(Calendar.DAY_OF_MONTH)}"

    /** Série encore valable : faite aujourd'hui ou hier. */
    fun streak(p: PetLogic.Pet): Int {
        val y = Calendar.getInstance().apply { add(Calendar.DAY_OF_MONTH, -1) }
        return if (p.lastDay == PetLogic.todayKey() || p.lastDay == dayKey(y)) p.streak else 0
    }

    private fun season(cal: Calendar): String? {
        val m = cal.get(Calendar.MONTH) + 1; val d = cal.get(Calendar.DAY_OF_MONTH)
        return when {
            m == 12 && d in 18..26 -> "christmas"
            (m == 10 && d >= 24) || (m == 11 && d <= 2) -> "halloween"
            m == 7 || m == 8 -> "beach"
            m == 12 || m == 1 || m == 2 -> "snow"
            (m == 3 && d >= 20) || m == 4 || m == 5 -> "flowers"
            (m == 9 && d >= 22) || m == 10 || m == 11 -> "autumn"
            else -> null
        }
    }

    /** La scène voulue maintenant, par ordre de priorité. */
    fun pick(p: PetLogic.Pet, cal: Calendar = Calendar.getInstance()): String {
        val h = cal.get(Calendar.HOUR_OF_DAY) + cal.get(Calendar.MINUTE) / 60.0
        if (PetLogic.isNight()) return if (h < 6) "sleep_deep" else "sleep"
        if (p.hunger < 10) return "starving"
        if (p.hunger < 30) return "hungry"
        if (p.clean < 35) return "dirty"
        if (p.joy < 10) return "very_bored"
        if (p.joy < 30) return "bored"
        val done = p.lastDay == PetLogic.todayKey()
        val s = streak(p)
        val sea = season(cal)
        val hour = cal.get(Calendar.HOUR_OF_DAY)
        if (done) {
            val opts = listOfNotNull("done", if (s >= 5) "proud" else null, sea)
            return opts[hour % opts.size]
        }
        if (p.lastDay != null && s == 0 && p.streak >= 2) return "streak_lost"
        val dow = cal.get(Calendar.DAY_OF_WEEK)
        val weekend = dow == Calendar.SATURDAY || dow == Calendar.SUNDAY
        val freeAfternoon = weekend || (dow == Calendar.WEDNESDAY && h >= 12) || sea == "beach"
        return when {
            h < 9.5 -> "morning"
            h >= 19.5 -> "last_chance"
            h >= 18 -> "reminder"
            h >= 16.5 -> "homework"
            freeAfternoon -> if (sea != null && hour % 2 == 0) sea else "weekend"
            else -> if (sea != null && hour % 2 == 1) sea else "school"
        }
    }

    private fun dir(c: Context) = File(c.filesDir, "scenes").apply { mkdirs() }
    private fun file(c: Context, p: PetLogic.Pet, scene: String) = File(dir(c), "${p.theme}_${p.species}_$scene.webp")

    /** Image composée prête pour le widget, ou null si aucune illustration n'est disponible. */
    fun bitmap(c: Context, p: PetLogic.Pet, want: String = pick(p)): Bitmap? {
        if (p.species.isEmpty()) return null
        var scene: String? = want
        var tries = 0
        while (scene != null && tries++ < 6) {
            val f = file(c, p, scene)
            if (f.exists()) {
                val src = BitmapFactory.decodeFile(f.absolutePath) ?: run { f.delete(); null }
                if (src != null) return compose(src, p, scene)
            }
            scene = FALLBACK[scene]
        }
        return null
    }

    private fun compose(src: Bitmap, p: PetLogic.Pet, scene: String): Bitmap {
        val out = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888)
        val cv = Canvas(out)
        val r = SIZE * .11f
        val clip = Path().apply { addRoundRect(RectF(0f, 0f, SIZE.toFloat(), SIZE.toFloat()), r, r, Path.Direction.CW) }
        cv.clipPath(clip)
        // recadrage carré centré
        val side = minOf(src.width, src.height)
        val sx = (src.width - side) / 2; val sy = (src.height - side) / 2
        cv.drawBitmap(src, Rect(sx, sy, sx + side, sy + side), Rect(0, 0, SIZE, SIZE), Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG))
        // voile en haut pour que le texte reste lisible
        val veil = Paint().apply { shader = LinearGradient(0f, 0f, 0f, SIZE * .5f, Color.argb(130, 0, 0, 0), Color.TRANSPARENT, Shader.TileMode.CLAMP) }
        cv.drawRect(0f, 0f, SIZE.toFloat(), SIZE * .5f, veil)
        val s = streak(p)
        val msg = (TEXT[scene] ?: "").replace("{n}", p.name)
        var y = SIZE * .18f
        if (s > 0) {
            text(cv, "🔥 $s", SIZE * .15f, y)
            y += SIZE * .12f
        } else y = SIZE * .14f
        fit(cv, msg, if (s > 0) SIZE * .075f else SIZE * .09f, y)
        return out
    }

    private fun paints(size: Float): Pair<Paint, Paint> {
        val tf = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; textSize = size; typeface = tf; textAlign = Paint.Align.CENTER }
        val stroke = Paint(fill).apply { color = Color.argb(200, 30, 20, 30); style = Paint.Style.STROKE; strokeWidth = size * .14f; strokeJoin = Paint.Join.ROUND }
        return fill to stroke
    }

    private fun text(cv: Canvas, t: String, size: Float, y: Float) {
        val (fill, stroke) = paints(size)
        cv.drawText(t, SIZE / 2f, y, stroke); cv.drawText(t, SIZE / 2f, y, fill)
    }

    /** Écrit la phrase en réduisant la taille si elle est trop longue pour la largeur. */
    private fun fit(cv: Canvas, t: String, size0: Float, y: Float) {
        var size = size0
        while (size > SIZE * .045f && paints(size).first.measureText(t) > SIZE * .86f) size *= .92f
        text(cv, t, size, y)
    }

    /** Télécharge (hors du fil principal) les scènes publiées pour les compagnons, puis rafraîchit le widget. */
    @JvmStatic
    fun prefetch(c: Context) {
        val pets = PetLogic.pets(c).filter { it.species.isNotEmpty() }
        if (pets.isEmpty()) return
        val prefs = PetLogic.prefs(c)
        val now = System.currentTimeMillis()
        if (now - prefs.getLong("scenesAt", 0) < 3 * 3600000L && prefs.getString("scenesFor", "") == pets.joinToString { it.theme + it.species }) return
        try {
            val idx = JSONObject(get(Updater.SITE + "art/index.json"))
            var got = 0
            for (p in pets.distinctBy { it.theme + it.species }) {
                val list = idx.optJSONArray(p.theme) ?: continue
                for (i in 0 until list.length()) {
                    val k = list.getString(i)
                    val pre = "w_${p.species}_"
                    if (!k.startsWith(pre)) continue
                    val scene = k.removePrefix(pre)
                    if (scene !in TEXT) continue
                    val f = file(c, p, scene)
                    if (f.exists() && f.length() > 0) continue
                    val bytes = bytes(Updater.SITE + "art/${p.theme}/$k.webp") ?: continue
                    val tmp = File(f.path + ".tmp"); tmp.writeBytes(bytes); tmp.renameTo(f); got++
                }
            }
            prefs.edit().putLong("scenesAt", now).putString("scenesFor", pets.joinToString { it.theme + it.species }).apply()
            if (got > 0) PetWidget.updateAll(c)
        } catch (_: Exception) {
        }
    }

    private fun open(url: String): HttpURLConnection {
        val conn = URL(url).openConnection() as HttpURLConnection
        conn.connectTimeout = 10000; conn.readTimeout = 30000
        conn.setRequestProperty("User-Agent", "AfterSchool-Android")
        return conn
    }

    private fun get(url: String): String { val conn = open(url); try { return conn.inputStream.bufferedReader().readText() } finally { conn.disconnect() } }

    private fun bytes(url: String): ByteArray? {
        val conn = open(url)
        return try { if (conn.responseCode == 200) conn.inputStream.readBytes() else null } catch (_: Exception) { null } finally { conn.disconnect() }
    }
}
