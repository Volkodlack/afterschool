package fr.afterschool.app

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.k2fsa.sherpa.onnx.OfflineTts
import com.k2fsa.sherpa.onnx.OfflineTtsConfig
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig
import java.io.File
import java.util.concurrent.Executors

/**
 * On-device neural French voice (Piper "siwis" model run by sherpa-onnx).
 * Everything runs offline. Word highlighting is estimated from the audio length.
 */
class NeuralTts(private val ctx: Context, private val listener: Listener) {

    interface Listener {
        fun onStart(id: String)
        fun onDone(id: String)
        fun onRange(id: String, start: Int, end: Int)
    }

    @Volatile var ready = false
        private set
    @Volatile var failed = false
        private set

    private var tts: OfflineTts? = null
    private var sampleRate = 22050
    private val worker = Executors.newSingleThreadExecutor()
    @Volatile private var token = 0
    @Volatile private var track: AudioTrack? = null
    private val cache = object : LinkedHashMap<String, FloatArray>(64, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, FloatArray>?) = size > 80
    }

    fun init() {
        worker.execute {
            try {
                val files = ctx.assets.list("tts") ?: emptyArray()
                if (!files.contains("model.onnx")) { failed = true; return@execute }
                val dataDir = copyEspeakData()
                val cfg = OfflineTtsConfig(
                    model = OfflineTtsModelConfig(
                        vits = OfflineTtsVitsModelConfig(
                            model = "tts/model.onnx",
                            tokens = "tts/tokens.txt",
                            dataDir = dataDir,
                        ),
                        numThreads = Runtime.getRuntime().availableProcessors().coerceIn(2, 4),
                        debug = false,
                        provider = "cpu",
                    ),
                    maxNumSentences = 1,
                )
                val engine = OfflineTts(assetManager = ctx.assets, config = cfg)
                sampleRate = engine.sampleRate()
                tts = engine
                ready = true
                // warm up so the first real sentence is fast
                try { engine.generate("Bonjour.", 0, 1.0f) } catch (_: Throwable) {}
            } catch (t: Throwable) {
                failed = true
            }
        }
    }

    /** espeak-ng data must live on the file system: copy it once from the APK. */
    private fun copyEspeakData(): String {
        val dst = File(ctx.filesDir, "espeak-ng-data")
        val marker = File(dst, ".copied-" + BuildConfigVersion.code(ctx))
        if (marker.exists()) return dst.absolutePath
        dst.deleteRecursively()
        copyAssetDir("tts/espeak-ng-data", dst)
        marker.createNewFile()
        return dst.absolutePath
    }

    private fun copyAssetDir(path: String, dst: File) {
        val children = ctx.assets.list(path) ?: emptyArray()
        if (children.isEmpty()) {
            dst.parentFile?.mkdirs()
            ctx.assets.open(path).use { input -> dst.outputStream().use { input.copyTo(it) } }
            return
        }
        dst.mkdirs()
        for (c in children) copyAssetDir("$path/$c", File(dst, c))
    }

    fun speak(text: String, rate: Float, id: String) {
        val my = ++token
        stopTrack()
        val speed = (rate / 0.85f).coerceIn(0.6f, 1.4f)
        worker.execute {
            if (my != token) return@execute
            val engine = tts
            if (engine == null) { listener.onDone(id); return@execute }
            val key = "$speed|$text"
            var samples = synchronized(cache) { cache[key] }
            if (samples == null) {
                samples = try { engine.generate(text, 0, speed).samples } catch (t: Throwable) { FloatArray(0) }
                synchronized(cache) { cache[key] = samples }
            }
            if (my != token) return@execute
            play(samples, text, id, my)
        }
    }

    private fun play(samples: FloatArray, text: String, id: String, my: Int) {
        if (samples.isEmpty()) { listener.onDone(id); return }
        val minBuf = AudioTrack.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_FLOAT)
        val t = AudioTrack.Builder()
            .setAudioAttributes(AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            .setAudioFormat(AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                .setSampleRate(sampleRate)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO).build())
            .setBufferSizeInBytes(maxOf(minBuf, 8192))
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()
        track = t
        // word positions, weighted by length, to estimate highlighting
        val words = Regex("[\\p{L}\\p{N}]+(?:['’-][\\p{L}\\p{N}]+)*").findAll(text).map { it.range }.toList()
        val weights = words.map { it.last - it.first + 2 }
        val total = weights.sum().coerceAtLeast(1)
        listener.onStart(id)
        val player = Thread {
            try {
                t.play()
                var off = 0
                var lastWord = -1
                val chunk = 2048
                while (off < samples.size && my == token) {
                    val n = minOf(chunk, samples.size - off)
                    val w = t.write(samples, off, n, AudioTrack.WRITE_BLOCKING)
                    if (w <= 0) break
                    off += w
                    lastWord = emitRange(t, samples.size, words, weights, total, lastWord, id, my)
                }
                // wait for the tail to finish playing
                while (my == token) {
                    val head = t.playbackHeadPosition
                    lastWord = emitRange(t, samples.size, words, weights, total, lastWord, id, my)
                    if (head >= samples.size - 64) break
                    Thread.sleep(25)
                }
            } catch (_: Throwable) {
            } finally {
                try { t.stop() } catch (_: Throwable) {}
                try { t.release() } catch (_: Throwable) {}
                if (track === t) track = null
                if (my == token) listener.onDone(id)
            }
        }
        player.start()
    }

    private fun emitRange(t: AudioTrack, n: Int, words: List<IntRange>, weights: List<Int>, total: Int, last: Int, id: String, my: Int): Int {
        if (words.isEmpty() || my != token) return last
        val frac = (t.playbackHeadPosition.toFloat() / n).coerceIn(0f, 1f)
        // a little lead-in/out silence in Piper output
        val f = ((frac - 0.04f) / 0.9f).coerceIn(0f, 0.999f)
        var acc = 0
        var idx = 0
        val target = f * total
        while (idx < words.size - 1 && acc + weights[idx] <= target) { acc += weights[idx]; idx++ }
        if (idx != last) listener.onRange(id, words[idx].first, words[idx].last + 1)
        return idx
    }

    private fun stopTrack() {
        val t = track
        track = null
        if (t != null) try { t.pause(); t.flush() } catch (_: Throwable) {}
    }

    fun stop() {
        token++
        stopTrack()
    }

    fun release() {
        stop()
        worker.execute { try { tts?.release() } catch (_: Throwable) {} ; tts = null }
        worker.shutdown()
    }
}

object BuildConfigVersion {
    fun code(ctx: Context): Long = try {
        val p = ctx.packageManager.getPackageInfo(ctx.packageName, 0)
        if (android.os.Build.VERSION.SDK_INT >= 28) p.longVersionCode else @Suppress("DEPRECATION") p.versionCode.toLong()
    } catch (_: Throwable) { 0L }
}
