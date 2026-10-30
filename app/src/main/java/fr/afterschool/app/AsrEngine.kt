package fr.afterschool.app

import android.annotation.SuppressLint
import android.content.Context
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import com.k2fsa.sherpa.onnx.EndpointConfig
import com.k2fsa.sherpa.onnx.EndpointRule
import com.k2fsa.sherpa.onnx.FeatureConfig
import com.k2fsa.sherpa.onnx.OnlineModelConfig
import com.k2fsa.sherpa.onnx.OnlineRecognizer
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Offline French speech recognition (sherpa-onnx streaming zipformer, Kroko FR model in assets/asr).
 * Listens to the child reciting, streams partial text to JS, and keeps the audio so it can be replayed.
 */
class AsrEngine(private val ctx: Context, private val emit: (String) -> Unit) {
    private var recognizer: OnlineRecognizer? = null
    @Volatile private var gen = 0       // current session; changing it cancels the running one
    @Volatile private var stopGen = -1  // session asked to stop (and deliver its final text)
    private var thread: Thread? = null

    fun available(): Boolean = try {
        ctx.assets.open("asr/encoder.onnx").close(); true
    } catch (e: Exception) { false }

    private fun load(): OnlineRecognizer {
        recognizer?.let { return it }
        val cfg = OnlineRecognizerConfig(
            featConfig = FeatureConfig(sampleRate = 16000, featureDim = 80),
            modelConfig = OnlineModelConfig(
                transducer = OnlineTransducerModelConfig(
                    encoder = "asr/encoder.onnx",
                    decoder = "asr/decoder.onnx",
                    joiner = "asr/joiner.onnx",
                ),
                tokens = "asr/tokens.txt",
                numThreads = 2,
                modelType = "zipformer2",
            ),
            endpointConfig = EndpointConfig(
                rule1 = EndpointRule(false, 3.0f, 0.0f),
                rule2 = EndpointRule(true, 1.6f, 0.0f),
                rule3 = EndpointRule(false, 0.0f, 25.0f),
            ),
            enableEndpoint = true,
            decodingMethod = "greedy_search",
        )
        val r = OnlineRecognizer(ctx.assets, cfg)
        recognizer = r
        return r
    }

    private fun q(s: String) = JSONObject.quote(s)

    @SuppressLint("MissingPermission")
    fun start(id: String) {
        val my = ++gen
        val prev = thread
        thread = Thread {
            var rec: AudioRecord? = null
            try {
                try { prev?.join(3000) } catch (_: Exception) {}
                if (gen != my) return@Thread
                emit("AS_native.asrState(${q(id)}, 'loading')")
                val r = load()
                val sr = 16000
                val minBuf = AudioRecord.getMinBufferSize(sr, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
                rec = AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, sr, AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT, maxOf(minBuf, sr / 5 * 2))
                if (rec.state != AudioRecord.STATE_INITIALIZED) throw IllegalStateException("mic")
                val stream = r.createStream()
                val pcm = ByteArrayOutputStream()
                val maxBytes = sr * 2 * 240 // keep at most 4 minutes of audio
                val buf = ShortArray(sr / 10)
                val done = StringBuilder()
                var last = ""
                var lastEmit = 0L
                rec.startRecording()
                emit("AS_native.asrState(${q(id)}, 'listening')")
                while (gen == my && stopGen != my) {
                    val n = rec.read(buf, 0, buf.size)
                    if (n <= 0) continue
                    val f = FloatArray(n) { buf[it] / 32768f }
                    stream.acceptWaveform(f, sr)
                    if (pcm.size() < maxBytes) {
                        val bb = ByteBuffer.allocate(n * 2).order(ByteOrder.LITTLE_ENDIAN)
                        for (i in 0 until n) bb.putShort(buf[i])
                        pcm.write(bb.array())
                    }
                    while (r.isReady(stream)) r.decode(stream)
                    var cur = r.getResult(stream).text.trim()
                    if (r.isEndpoint(stream)) {
                        if (cur.isNotEmpty()) done.append(cur).append(' ')
                        r.reset(stream)
                        cur = ""
                    }
                    val all = (done.toString() + cur).trim()
                    val now = System.currentTimeMillis()
                    if (all != last && now - lastEmit > 200) {
                        last = all; lastEmit = now
                        emit("AS_native.onAsr(${q(id)}, ${q(all)}, false)")
                    }
                }
                rec.stop()
                // flush: a bit of silence then finish decoding
                stream.acceptWaveform(FloatArray(sr * 12 / 10), sr)
                stream.inputFinished()
                while (r.isReady(stream)) r.decode(stream)
                val tail = r.getResult(stream).text.trim()
                if (tail.isNotEmpty()) done.append(tail)
                stream.release()
                if (gen != my) return@Thread
                val wav = wavBytes(pcm.toByteArray(), sr)
                emit("AS_native.onAsrAudio(${q(id)}, '${Base64.encodeToString(wav, Base64.NO_WRAP)}')")
                emit("AS_native.onAsr(${q(id)}, ${q(done.toString().trim())}, true)")
            } catch (e: Throwable) {
                if (gen == my) emit("AS_native.asrError(${q(id)}, ${q(e.message ?: "error")})")
            } finally {
                try { rec?.release() } catch (_: Exception) {}
            }
        }.also { it.start() }
    }

    fun stop() { stopGen = gen }

    fun cancel() { gen++ }

    private fun wavBytes(data: ByteArray, sr: Int): ByteArray {
        val h = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
        h.put("RIFF".toByteArray()); h.putInt(36 + data.size); h.put("WAVE".toByteArray())
        h.put("fmt ".toByteArray()); h.putInt(16); h.putShort(1); h.putShort(1)
        h.putInt(sr); h.putInt(sr * 2); h.putShort(2); h.putShort(16)
        h.put("data".toByteArray()); h.putInt(data.size)
        return h.array() + data
    }
}
