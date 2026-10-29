package fr.afterschool.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.graphics.Color;
import android.view.WindowManager.LayoutParams;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.exifinterface.media.ExifInterface;
import androidx.webkit.WebViewAssetLoader;

import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends ComponentActivity {

    private static final String START_URL = "https://appassets.androidplatform.net/assets/index.html";

    private WebView web;
    private FrameLayout root;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private Uri photoUri;
    private PermissionRequest pendingPermission;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private ActivityResultLauncher<Uri> takePictureLauncher;
    private ActivityResultLauncher<String> pickImageLauncher;
    private ActivityResultLauncher<String> micPermissionLauncher;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        takePictureLauncher = registerForActivityResult(new ActivityResultContracts.TakePicture(), ok -> {
            if (Boolean.TRUE.equals(ok) && photoUri != null) {
                processImage(photoUri);
            } else {
                sendPhotoResult(null);
            }
        });
        pickImageLauncher = registerForActivityResult(new ActivityResultContracts.GetContent(), uri -> {
            if (uri != null) {
                processImage(uri);
            } else {
                sendPhotoResult(null);
            }
        });
        micPermissionLauncher = registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
            if (pendingPermission != null) {
                if (Boolean.TRUE.equals(granted)) {
                    pendingPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                } else {
                    pendingPermission.deny();
                }
                pendingPermission = null;
            }
        });

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        if (Build.VERSION.SDK_INT >= 28) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= 30
                    ? LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                    : LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF7EC8F5);
        web = new WebView(this);
        web.setBackgroundColor(0xFF7EC8F5);
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        // keep the page out of camera cutouts / rounded corners / visible system bars on every device
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets i = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
            v.setPadding(i.left, i.top, i.right, i.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !"appassets.androidplatform.net".equals(request.getUrl().getHost());
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean wantsAudio = false;
                    for (String r : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsAudio = true;
                    }
                    if (!wantsAudio) {
                        request.deny();
                        return;
                    }
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        pendingPermission = request;
                        micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO);
                    }
                });
            }
        });

        web.addJavascriptInterface(new Bridge(), "AfterSchoolNative");
        web.loadUrl(START_URL);

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                int res = tts.setLanguage(Locale.FRANCE);
                if (res == TextToSpeech.LANG_MISSING_DATA || res == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(Locale.FRENCH);
                }
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String id) {
                        js("window.AS_native&&AS_native.ttsEvent('start'," + JSONObject.quote(id) + ")");
                    }

                    @Override
                    public void onDone(String id) {
                        js("window.AS_native&&AS_native.ttsEvent('done'," + JSONObject.quote(id) + ")");
                    }

                    @Override
                    @SuppressWarnings("deprecation")
                    public void onError(String id) {
                        js("window.AS_native&&AS_native.ttsEvent('done'," + JSONObject.quote(id) + ")");
                    }

                    @Override
                    public void onRangeStart(String id, int start, int end, int frame) {
                        js("window.AS_native&&AS_native.ttsRange(" + JSONObject.quote(id) + "," + start + "," + end + ")");
                    }
                });
                ttsReady = true;
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                web.evaluateJavascript("(window.AS_back?AS_back():false)", value -> {
                    if (!"true".equals(value)) moveTaskToBack(true);
                });
            }
        });

        hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (tts != null) tts.stop();
        js("window.AS_pause&&AS_pause()");
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        executor.shutdown();
        if (web != null) web.destroy();
        super.onDestroy();
    }

    private void js(final String code) {
        if (web == null) return;
        web.post(() -> web.evaluateJavascript(code, null));
    }

    private void sendPhotoResult(JSONObject o) {
        js("window.AS_native&&AS_native.onPhoto(" + (o == null ? "null" : o.toString()) + ")");
    }

    private void processImage(final Uri uri) {
        js("window.AS_native&&AS_native.onPhotoProcessing()");
        executor.submit(() -> {
            JSONObject out = new JSONObject();
            try {
                StringBuilder sb = new StringBuilder();
                try {
                    InputImage image = InputImage.fromFilePath(this, uri);
                    TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
                    Text result = Tasks.await(recognizer.process(image));
                    for (Text.TextBlock block : result.getTextBlocks()) {
                        for (Text.Line line : block.getLines()) {
                            sb.append(line.getText()).append('\n');
                        }
                        sb.append('\n');
                    }
                    recognizer.close();
                } catch (Exception ocrError) {
                    out.put("ocrError", String.valueOf(ocrError.getMessage()));
                }
                out.put("text", sb.toString().trim());
                String thumb = makeThumb(uri, 1400);
                if (thumb != null) out.put("image", "data:image/jpeg;base64," + thumb);
            } catch (Exception e) {
                try {
                    out.put("error", String.valueOf(e.getMessage()));
                } catch (Exception ignored) {
                }
            }
            sendPhotoResult(out);
        });
    }

    private String makeThumb(Uri uri, int maxSide) {
        try {
            BitmapFactory.Options bounds = new BitmapFactory.Options();
            bounds.inJustDecodeBounds = true;
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                BitmapFactory.decodeStream(in, null, bounds);
            }
            int sample = 1;
            while (Math.max(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSide) sample *= 2;
            BitmapFactory.Options opts = new BitmapFactory.Options();
            opts.inSampleSize = sample;
            Bitmap bmp;
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                bmp = BitmapFactory.decodeStream(in, null, opts);
            }
            if (bmp == null) return null;

            int rotation = 0;
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                if (in != null) {
                    ExifInterface exif = new ExifInterface(in);
                    rotation = exif.getRotationDegrees();
                }
            } catch (Exception ignored) {
            }

            float scale = Math.min(1f, (float) maxSide / Math.max(bmp.getWidth(), bmp.getHeight()));
            Matrix m = new Matrix();
            m.postScale(scale, scale);
            if (rotation != 0) m.postRotate(rotation);
            Bitmap finalBmp = Bitmap.createBitmap(bmp, 0, 0, bmp.getWidth(), bmp.getHeight(), m, true);

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            finalBmp.compress(Bitmap.CompressFormat.JPEG, 72, bos);
            return Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }

    private class Bridge {
        @JavascriptInterface
        public boolean ttsAvailable() {
            return ttsReady;
        }

        @JavascriptInterface
        public void speak(String text, float rate, String id) {
            if (!ttsReady) {
                js("window.AS_native&&AS_native.ttsEvent('done'," + JSONObject.quote(id) + ")");
                return;
            }
            tts.setSpeechRate(rate);
            Bundle params = new Bundle();
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, id);
        }

        @JavascriptInterface
        public void stopSpeak() {
            if (tts != null) tts.stop();
        }

        @JavascriptInterface
        public void setBackground(String color) {
            runOnUiThread(() -> {
                try {
                    int c = Color.parseColor(color);
                    root.setBackgroundColor(c);
                    web.setBackgroundColor(c);
                } catch (Exception ignored) {
                }
            });
        }

        @JavascriptInterface
        public void vibrate(int ms) {
            try {
                Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v == null) return;
                if (Build.VERSION.SDK_INT >= 26) {
                    v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(ms);
                }
            } catch (Exception ignored) {
            }
        }

        @JavascriptInterface
        public void takePhoto() {
            runOnUiThread(() -> {
                try {
                    File dir = new File(getCacheDir(), "photos");
                    if (!dir.exists()) dir.mkdirs();
                    File[] old = dir.listFiles();
                    if (old != null) for (File f : old) f.delete();
                    File f = new File(dir, "fiche_" + System.currentTimeMillis() + ".jpg");
                    photoUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", f);
                    takePictureLauncher.launch(photoUri);
                } catch (Exception e) {
                    sendPhotoResult(null);
                }
            });
        }

        @JavascriptInterface
        public void pickPhoto() {
            runOnUiThread(() -> {
                try {
                    pickImageLauncher.launch("image/*");
                } catch (Exception e) {
                    sendPhotoResult(null);
                }
            });
        }
    }
}
