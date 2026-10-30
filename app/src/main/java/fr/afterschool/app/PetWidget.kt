package fr.afterschool.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Base64
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.Calendar
import java.util.concurrent.TimeUnit

/** Pet state shared between the web app, the home-screen widget and the notifications. */
object PetLogic {
    private const val PREFS = "pet_widget"
    private const val RATE_HUNGER = 4.0
    private const val RATE_JOY = 3.0
    private const val RATE_CLEAN = 3.5

    data class Pet(
        val childId: String, val child: String, val name: String,
        val hunger: Double, val joy: Double, val clean: Double,
        val lastDay: String?, val current: Boolean, val theme: String
    )

    fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    @JvmStatic
    fun savePets(c: Context, json: String) {
        prefs(c).edit().putString("pets", json).apply()
    }

    @JvmStatic
    fun saveFrames(c: Context, json: String) {
        val dir = File(c.filesDir, "pet")
        dir.mkdirs()
        val o = JSONObject(json)
        val keys = o.keys()
        while (keys.hasNext()) {
            val k = keys.next()
            val arr = o.getJSONArray(k)
            for (i in 0 until arr.length()) {
                val bytes = Base64.decode(arr.getString(i), Base64.DEFAULT)
                File(dir, "${k}_$i.png").writeBytes(bytes)
            }
        }
        prefs(c).edit().putLong("framesAt", System.currentTimeMillis()).apply()
    }

    @JvmStatic
    fun setNotifications(c: Context, on: Boolean) {
        prefs(c).edit().putBoolean("notif", on).apply()
    }

    fun notificationsOn(c: Context) = prefs(c).getBoolean("notif", true)

    fun pets(c: Context): List<Pet> {
        val raw = prefs(c).getString("pets", null) ?: return emptyList()
        val now = System.currentTimeMillis()
        val out = ArrayList<Pet>()
        try {
            val arr = JSONArray(raw)
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val h = maxOf(0.0, (now - o.optLong("t", now)) / 3600000.0)
                fun dec(v: Double, r: Double) = (v - r * h).coerceIn(0.0, 100.0)
                val dirty = o.optDouble("clean", 80.0) < 35
                out.add(
                    Pet(
                        o.optString("childId"), o.optString("child"), o.optString("name"),
                        dec(o.optDouble("hunger", 80.0), RATE_HUNGER), dec(o.optDouble("joy", 80.0), if (dirty) RATE_JOY * 2 else RATE_JOY), dec(o.optDouble("clean", 80.0), RATE_CLEAN),
                        if (o.isNull("lastDay")) null else o.optString("lastDay"), o.optBoolean("current"), o.optString("theme", "pixel")
                    )
                )
            }
        } catch (_: Exception) {
        }
        return out
    }

    fun isNight(): Boolean {
        val cal = Calendar.getInstance()
        val h = cal.get(Calendar.HOUR_OF_DAY) + cal.get(Calendar.MINUTE) / 60.0
        return h >= 20.75 || h < 7
    }

    fun need(p: Pet): String = when {
        isNight() -> "sleep"
        p.hunger < 30 -> "hungry"
        p.clean < 35 -> "dirty"
        p.joy < 30 -> "bored"
        p.hunger > 70 && p.joy > 70 && p.clean > 60 -> "happy"
        else -> "idle"
    }

    fun status(p: Pet, n: String): String = when (n) {
        "sleep" -> "${p.name} dort… Zzz"
        "hungry" -> "${p.name} a faim !"
        "dirty" -> "${p.name} est tout sale !"
        "bored" -> "${p.name} s'ennuie…"
        "happy" -> "${p.name} est en pleine forme !"
        else -> "${p.name} va bien"
    }

    fun frame(c: Context, key: String, i: Int): Bitmap? {
        val f = File(File(c.filesDir, "pet"), "${key}_$i.png")
        return if (f.exists()) BitmapFactory.decodeFile(f.absolutePath) else null
    }

    fun todayKey(): String {
        val c = Calendar.getInstance()
        return "${c.get(Calendar.YEAR)}-${c.get(Calendar.MONTH) + 1}-${c.get(Calendar.DAY_OF_MONTH)}"
    }
}

class PetWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (id in appWidgetIds) update(context, appWidgetManager, id)
        PetWorker.schedule(context)
    }

    companion object {
        @JvmStatic
        fun updateAll(context: Context) {
            try {
                val mgr = AppWidgetManager.getInstance(context)
                val ids = mgr.getAppWidgetIds(ComponentName(context, PetWidget::class.java))
                for (id in ids) update(context, mgr, id)
            } catch (_: Exception) {
            }
        }

        fun update(context: Context, mgr: AppWidgetManager, id: Int) {
            val v = RemoteViews(context.packageName, R.layout.pet_widget)
            val intent = Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            val pi = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            v.setOnClickPendingIntent(R.id.widget_root, pi)
            val pets = PetLogic.pets(context)
            val p = pets.firstOrNull { it.current } ?: pets.firstOrNull()
            if (p == null) {
                v.setTextViewText(R.id.widget_title, "After School")
                v.setTextViewText(R.id.widget_status, "Ouvre l'appli pour adopter ton compagnon !")
                v.setViewVisibility(R.id.widget_bars, View.GONE)
                v.setImageViewResource(R.id.widget_f1, R.mipmap.ic_launcher)
                v.setImageViewResource(R.id.widget_f2, R.mipmap.ic_launcher)
            } else {
                val n = PetLogic.need(p)
                val f1 = PetLogic.frame(context, n, 0) ?: PetLogic.frame(context, "idle", 0)
                val f2 = PetLogic.frame(context, n, 1) ?: f1
                if (f1 != null) v.setImageViewBitmap(R.id.widget_f1, f1) else v.setImageViewResource(R.id.widget_f1, R.mipmap.ic_launcher)
                if (f2 != null) v.setImageViewBitmap(R.id.widget_f2, f2) else v.setImageViewResource(R.id.widget_f2, R.mipmap.ic_launcher)
                v.setTextViewText(R.id.widget_title, p.name)
                v.setTextViewText(R.id.widget_status, PetLogic.status(p, n))
                v.setViewVisibility(R.id.widget_bars, View.VISIBLE)
                v.setProgressBar(R.id.widget_hunger, 100, p.hunger.toInt(), false)
                v.setProgressBar(R.id.widget_joy, 100, p.joy.toInt(), false)
                v.setProgressBar(R.id.widget_clean, 100, p.clean.toInt(), false)
                v.setInt(R.id.widget_root, "setBackgroundResource", if (p.theme == "poney") R.drawable.widget_bg_poney else R.drawable.widget_bg_pixel)
                val ink = if (p.theme == "poney") 0xFF6B4A5A.toInt() else 0xFF2B1D12.toInt()
                v.setTextColor(R.id.widget_title, ink)
                v.setTextColor(R.id.widget_status, ink)
            }
            mgr.updateAppWidget(id, v)
        }
    }
}

class PetWorker(ctx: Context, params: WorkerParameters) : Worker(ctx, params) {
    override fun doWork(): Result {
        PetWidget.updateAll(applicationContext)
        PetNotifier.check(applicationContext)
        return Result.success()
    }

    companion object {
        @JvmStatic
        fun schedule(ctx: Context) {
            try {
                val req = PeriodicWorkRequestBuilder<PetWorker>(1, TimeUnit.HOURS).build()
                WorkManager.getInstance(ctx).enqueueUniquePeriodicWork("pet-check", ExistingPeriodicWorkPolicy.KEEP, req)
            } catch (_: Exception) {
            }
        }
    }
}

object PetNotifier {
    private const val CHANNEL = "compagnon"

    private fun channel(c: Context) {
        if (Build.VERSION.SDK_INT >= 26) {
            val nm = c.getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(CHANNEL) == null) {
                val ch = NotificationChannel(CHANNEL, "Mon compagnon", NotificationManager.IMPORTANCE_DEFAULT)
                ch.description = "Quand ton compagnon a besoin de toi"
                nm.createNotificationChannel(ch)
            }
        }
    }

    fun check(c: Context) {
        if (!PetLogic.notificationsOn(c)) return
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val cal = Calendar.getInstance()
        val hour = cal.get(Calendar.HOUR_OF_DAY)
        if (hour < 8 || hour >= 20) return
        val prefs = PetLogic.prefs(c)
        val now = System.currentTimeMillis()
        val pets = PetLogic.pets(c)
        val several = pets.map { it.childId }.distinct().size > 1
        for (p in pets) {
            val who = if (several && p.child.isNotEmpty()) " (${p.child})" else ""
            var kind: String? = null
            var title = ""
            var text = ""
            val pick = { a: Array<Pair<String, String>> -> a[(now / 3600000 % a.size).toInt()] }
            when {
                p.hunger < 25 -> { kind = "hungry"; val m = pick(arrayOf(
                    "${p.name}$who a faim ! 🍎" to "Fais quelques mots pour gagner des étoiles et lui préparer un bon repas.",
                    "Le ventre de ${p.name} gargouille…$who" to "Une petite séance de mots et hop, à table !")); title = m.first; text = m.second }
                p.clean < 20 -> { kind = "dirty"; title = "${p.name}$who est tout sale ! 🛁"; text = "Viens vite lui donner un bain plein de bulles." }
                p.joy < 20 -> { kind = "bored"; title = "${p.name}$who s'ennuie… 🎾"; text = "Il aimerait tellement jouer à la balle avec toi !" }
                hour >= 17 && p.lastDay != PetLogic.todayKey() -> { kind = "daily"; val m = pick(arrayOf(
                    "${p.name} t'attend ! 📚" to "Tes mots du jour ne vont pas s'apprendre tout seuls 😉",
                    "Psst${if (p.child.isNotEmpty()) ", " + p.child else ""} !" to "${p.name} a préparé un petit défi de mots pour toi.",
                    "${p.name} compte sur toi ⭐" to "5 minutes de devoirs = des étoiles pour lui faire plaisir.")); title = m.first; text = m.second }
            }
            if (kind == null) continue
            val key = "last_${p.childId}_$kind"
            val cooldown = if (kind == "daily") 20 * 3600000L else 5 * 3600000L
            if (now - prefs.getLong(key, 0) < cooldown) continue
            val anyKey = "last_${p.childId}_any"
            if (now - prefs.getLong(anyKey, 0) < 3 * 3600000L) continue
            post(c, p, title, text)
            prefs.edit().putLong(key, now).putLong(anyKey, now).apply()
        }
    }

    private fun post(c: Context, p: PetLogic.Pet, title: String, text: String) {
        channel(c)
        val intent = Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pi = PendingIntent.getActivity(c, p.childId.hashCode(), intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val b = NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_pet)
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        if (p.current) PetLogic.frame(c, PetLogic.need(p), 0)?.let { b.setLargeIcon(it) }
        try {
            NotificationManagerCompat.from(c).notify(p.childId.hashCode(), b.build())
        } catch (_: SecurityException) {
        }
    }
}
