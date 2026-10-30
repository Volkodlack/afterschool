package fr.afterschool.app

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.vision.digitalink.DigitalInkRecognition
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModel
import com.google.mlkit.vision.digitalink.DigitalInkRecognitionModelIdentifier
import com.google.mlkit.vision.digitalink.DigitalInkRecognizer
import com.google.mlkit.vision.digitalink.DigitalInkRecognizerOptions
import com.google.mlkit.vision.digitalink.Ink
import com.google.mlkit.vision.digitalink.RecognitionContext
import com.google.mlkit.vision.digitalink.WritingArea
import org.json.JSONArray

/** Handwriting recognition (ML Kit Digital Ink, French model, works offline once downloaded). */
class InkReader(private val emit: (String) -> Unit) {
    @Volatile var status: String = "unknown"
        private set
    private var model: DigitalInkRecognitionModel? = null
    private var recognizer: DigitalInkRecognizer? = null
    private val manager = RemoteModelManager.getInstance()

    init {
        try {
            val id = (try { DigitalInkRecognitionModelIdentifier.fromLanguageTag("fr-FR") } catch (e: Exception) { null })
                ?: DigitalInkRecognitionModelIdentifier.fromLanguageTag("fr")
            if (id == null) status = "unsupported" else {
                model = DigitalInkRecognitionModel.builder(id).build()
                manager.isModelDownloaded(model!!)
                    .addOnSuccessListener { ok -> if (ok) ready() else status = "missing" }
                    .addOnFailureListener { status = "missing" }
            }
        } catch (e: Throwable) { status = "unsupported" }
    }

    private fun ready() {
        val m = model ?: return
        if (recognizer == null) recognizer = DigitalInkRecognition.getClient(DigitalInkRecognizerOptions.builder(m).build())
        status = "ready"
        emit("AS_native.inkStatus('ready')")
    }

    fun prepare() {
        val m = model ?: run { emit("AS_native.inkStatus('unsupported')"); return }
        if (status == "ready") { emit("AS_native.inkStatus('ready')"); return }
        if (status == "downloading") return
        status = "downloading"
        emit("AS_native.inkStatus('downloading')")
        manager.download(m, DownloadConditions.Builder().build())
            .addOnSuccessListener { ready() }
            .addOnFailureListener { status = "missing"; emit("AS_native.inkStatus('error')") }
    }

    /** json = {w, h, strokes:[[[x,y,t],...],...]} ; answers AS_native.onInk(id, [candidates]) */
    fun recognize(json: String, id: String) {
        val r = recognizer
        if (r == null) { emit("AS_native.onInk(${JSONArray().put(id)}[0], null)"); prepare(); return }
        try {
            val o = org.json.JSONObject(json)
            val strokes = o.getJSONArray("strokes")
            val ink = Ink.builder()
            for (i in 0 until strokes.length()) {
                val s = strokes.getJSONArray(i)
                val sb = Ink.Stroke.builder()
                for (j in 0 until s.length()) {
                    val p = s.getJSONArray(j)
                    sb.addPoint(Ink.Point.create(p.getDouble(0).toFloat(), p.getDouble(1).toFloat(), p.getLong(2)))
                }
                ink.addStroke(sb.build())
            }
            val ctx = RecognitionContext.builder()
                .setPreContext("")
                .setWritingArea(WritingArea(o.optDouble("w", 800.0).toFloat(), o.optDouble("h", 200.0).toFloat()))
                .build()
            r.recognize(ink.build(), ctx)
                .addOnSuccessListener { res ->
                    val arr = JSONArray()
                    res.candidates.forEach { arr.put(it.text) }
                    emit("AS_native.onInk(${JSONArray().put(id)}[0], $arr)")
                }
                .addOnFailureListener { emit("AS_native.onInk(${JSONArray().put(id)}[0], [])") }
        } catch (e: Exception) {
            emit("AS_native.onInk(${JSONArray().put(id)}[0], [])")
        }
    }
}
